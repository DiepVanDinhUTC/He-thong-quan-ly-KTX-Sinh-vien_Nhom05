const http = require('node:http');
const { verifyCallback } = require('../utils/vnpay');

const localOrigin = (value, name) => {
    const url = new URL(value);
    if (url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        throw new Error(`${name} must be a local HTTP origin`);
    }
    return url.origin;
};

const sandboxRelayConfig = (env = process.env) => {
    if (String(env.NODE_ENV || '').toLowerCase() === 'production'
        || new URL(env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').origin !== 'https://sandbox.vnpayment.vn') {
        throw new Error('The payment return relay is only available for local VNPAY Sandbox testing');
    }
    if (!env.VNPAY_TMN_CODE || !env.VNPAY_HASH_SECRET) throw new Error('VNPAY Sandbox credentials are required');
    return {
        merchantCode: env.VNPAY_TMN_CODE,
        backendOrigin: localOrigin(env.VNPAY_TEST_BACKEND_URL || `http://localhost:${env.PORT || 5000}`, 'Backend URL'),
        frontendOrigin: localOrigin(env.VNPAY_TEST_FRONTEND_URL || 'http://localhost:5173', 'Frontend URL')
    };
};

// A local test helper: only an authentic Sandbox response is forwarded to the
// existing IPN handler. It neither signs callbacks nor changes invoice data itself.
const createVnpaySandboxRelay = ({ merchantCode, backendOrigin, frontendOrigin, verify = verifyCallback, fetchClient = fetch, logger = console.log }) => http.createServer(async (req, res) => {
    const json = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(JSON.stringify(body));
    };
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return json(405, { message: 'Method not allowed' });
    }
    if (req.url.length > 8192) return json(414, { message: 'Callback URL is too long' });
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/health') return json(200, { service: 'ktx-vnpay-sandbox-relay', sandbox: true });
    if (!['/vnpay-return', '/api/v1/webhooks/vnpay-ipn'].includes(url.pathname)) return json(404, { message: 'Not found' });

    const params = Object.fromEntries(url.searchParams);
    const duplicateKeys = [...url.searchParams.keys()].length !== Object.keys(params).length;
    let authentic = false;
    try {
        authentic = !duplicateKeys && Boolean(params.vnp_TxnRef) && params.vnp_TmnCode === merchantCode && verify(params);
    } catch { /* Malformed signatures must be rejected without stopping the relay. */ }
    if (!authentic) {
        return json(url.pathname === '/vnpay-return' ? 400 : 200, { RspCode: '97', Message: 'Invalid VNPAY Sandbox signature or merchant' });
    }

    try {
        const endpoint = new URL('/api/v1/webhooks/vnpay-ipn', backendOrigin);
        endpoint.search = url.search;
        const response = await fetchClient(endpoint, { signal: AbortSignal.timeout(10000), redirect: 'error' });
        if (!response.ok) throw new Error('Backend unavailable');
        const result = await response.json();
        logger(JSON.stringify({ service: 'vnpay-sandbox-return', txnRef: params.vnp_TxnRef, responseCode: result.RspCode }));
        if (url.pathname === '/api/v1/webhooks/vnpay-ipn') return json(200, result);
        if (!['00', '02'].includes(result.RspCode)) return json(409, { ...result, message: 'Backend did not confirm the Sandbox payment. Invoice status has not been overridden.' });

        const target = new URL('/bill-payment', frontendOrigin);
        target.search = url.search;
        res.writeHead(303, { Location: target.href, 'Cache-Control': 'no-store' });
        return res.end();
    } catch {
        return json(503, { RspCode: '99', Message: 'Local backend is unavailable. Retry this signed return URL after the backend is running.' });
    }
});

module.exports = { createVnpaySandboxRelay, sandboxRelayConfig };
