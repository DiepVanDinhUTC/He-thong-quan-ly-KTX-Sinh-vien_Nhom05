const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createVnpaySandboxRelay, sandboxRelayConfig } = require('../src/services/vnpaySandboxRelay');

const secret = 'sandbox-test-secret';
const merchant = 'KTXTEST1';
const validParams = () => {
    const params = { vnp_Amount: '1000000', vnp_ResponseCode: '00', vnp_TmnCode: merchant, vnp_TransactionStatus: '00', vnp_TxnRef: 'KTX-DEMO-TEST' };
    params.vnp_SecureHash = crypto.createHmac('sha512', secret).update(new URLSearchParams(params).toString()).digest('hex');
    return new URLSearchParams(params);
};

const withRelay = async (run, result = { RspCode: '00', Message: 'Confirm Success' }) => {
    const previousSecret = process.env.VNPAY_HASH_SECRET;
    process.env.VNPAY_HASH_SECRET = secret;
    const calls = [];
    const server = createVnpaySandboxRelay({ merchantCode: merchant, backendOrigin: 'http://localhost:5000', frontendOrigin: 'http://localhost:5173', logger: () => {}, fetchClient: async (url) => { calls.push(url.href); return { ok: true, json: async () => result }; } });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    try { await run(`http://127.0.0.1:${server.address().port}`, calls); }
    finally {
        await new Promise((resolve) => server.close(resolve));
        if (previousSecret === undefined) delete process.env.VNPAY_HASH_SECRET;
        else process.env.VNPAY_HASH_SECRET = previousSecret;
    }
};

test('Sandbox relay rejects production, live gateways and nonlocal proxy targets', () => {
    const env = { VNPAY_TMN_CODE: merchant, VNPAY_HASH_SECRET: secret };
    assert.throws(() => sandboxRelayConfig({ ...env, NODE_ENV: 'production' }), /only available/);
    assert.throws(() => sandboxRelayConfig({ ...env, VNPAY_URL: 'https://pay.vnpay.vn/vpcpay.html' }), /only available/);
    assert.throws(() => sandboxRelayConfig({ ...env, VNPAY_TEST_BACKEND_URL: 'https://example.com' }), /local HTTP origin/);
    assert.throws(() => sandboxRelayConfig({ ...env, VNPAY_TEST_FRONTEND_URL: 'http://localhost:5173/other' }), /local HTTP origin/);
    assert.equal(sandboxRelayConfig(env).backendOrigin, 'http://localhost:5000');
});

test('authentic successful return reaches the real IPN endpoint before redirecting to student receipts', async () => withRelay(async (base, calls) => {
    const params = validParams();
    const response = await fetch(`${base}/vnpay-return?${params}`, { redirect: 'manual' });
    assert.equal(response.status, 303);
    assert.equal(calls.length, 1);
    assert.equal(calls[0], `http://localhost:5000/api/v1/webhooks/vnpay-ipn?${params}`);
    assert.equal(response.headers.get('location'), `http://localhost:5173/bill-payment?${params}`);
}));

test('unsigned, tampered and duplicate-key returns cannot update an invoice', async () => withRelay(async (base, calls) => {
    for (const params of [new URLSearchParams({ vnp_ResponseCode: '00' }), (() => { const p = validParams(); p.set('vnp_Amount', '1'); return p; })(), (() => { const p = validParams(); p.append('vnp_TxnRef', 'OTHER'); return p; })(), (() => { const p = validParams(); p.set('vnp_SecureHash', '\u00e9'.repeat(128)); return p; })()]) {
        const response = await fetch(`${base}/vnpay-return?${params}`, { redirect: 'manual' });
        assert.equal(response.status, 400);
    }
    assert.equal(calls.length, 0);
}));

test('merchant mismatch is rejected even when signed with the same secret', async () => withRelay(async (base, calls) => {
    const params = Object.fromEntries(validParams());
    delete params.vnp_SecureHash;
    params.vnp_TmnCode = 'OTHER';
    params.vnp_SecureHash = crypto.createHmac('sha512', secret).update(new URLSearchParams(params).toString()).digest('hex');
    const response = await fetch(`${base}/vnpay-return?${new URLSearchParams(params)}`, { redirect: 'manual' });
    assert.equal(response.status, 400);
    assert.equal(calls.length, 0);
}));

test('a repeated callback redirects only after the backend reports it was already confirmed', async () => withRelay(async (base) => {
    const response = await fetch(`${base}/vnpay-return?${validParams()}`, { redirect: 'manual' });
    assert.equal(response.status, 303);
}, { RspCode: '02', Message: 'Order already confirmed' }));

test('backend amount mismatch stays an error rather than appearing paid', async () => withRelay(async (base) => {
    const response = await fetch(`${base}/vnpay-return?${validParams()}`, { redirect: 'manual' });
    assert.equal(response.status, 409);
    assert.equal(response.headers.get('location'), null);
    assert.equal((await response.json()).RspCode, '04');
}, { RspCode: '04', Message: 'Invalid amount' }));

test('relay exposes only its health check and signed callback paths', async () => withRelay(async (base, calls) => {
    assert.equal((await fetch(`${base}/health`)).status, 200);
    assert.equal((await fetch(`${base}/api/v1/students`)).status, 404);
    assert.equal((await fetch(`${base}/vnpay-return`, { method: 'POST' })).status, 405);
    assert.equal(calls.length, 0);
}));
