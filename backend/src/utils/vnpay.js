const crypto = require('crypto');

const formatVnpayDate = (date) => new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23'
}).formatToParts(date).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value;
    return result;
}, {});

const timestamp = (date) => {
    const parts = formatVnpayDate(date);
    return `${parts.year}${parts.month}${parts.day}${parts.hour}${parts.minute}${parts.second}`;
};

const sortParams = (params) => Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
        .sort(([left], [right]) => left.localeCompare(right))
);

const sign = (params, secret) => crypto.createHmac('sha512', secret)
    .update(new URLSearchParams(sortParams(params)).toString(), 'utf8')
    .digest('hex');

const buildPaymentUrl = ({ txnRef, amount, orderInfo, ipAddr, returnUrl, expiresAt }) => {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const hashSecret = process.env.VNPAY_HASH_SECRET;
    const payUrl = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const bankCode = process.env.VNPAY_BANK_CODE === undefined
        ? 'VNPAYQR'
        : process.env.VNPAY_BANK_CODE.trim();
    if (!tmnCode || !hashSecret || !returnUrl) {
        throw new Error('VNPAY_TMN_CODE, VNPAY_HASH_SECRET and VNPAY_RETURN_URL must be configured');
    }
    const now = new Date();
    const params = sortParams({
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Amount: String(Math.round(amount) * 100),
        vnp_CurrCode: 'VND',
        vnp_TxnRef: txnRef,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'other',
        vnp_Locale: 'vn',
        vnp_ReturnUrl: returnUrl,
        vnp_IpAddr: (ipAddr || '127.0.0.1').replace(/^::ffff:/, '').slice(0, 45),
        vnp_CreateDate: timestamp(now),
        vnp_ExpireDate: timestamp(new Date(Math.min(now.getTime() + 15 * 60 * 1000, expiresAt ? new Date(expiresAt).getTime() : Infinity))),
        vnp_BankCode: bankCode
    });
    params.vnp_SecureHash = sign(params, hashSecret);
    return `${payUrl}?${new URLSearchParams(params).toString()}`;
};

const verifyCallback = (query) => {
    const { vnp_SecureHash: receivedHash, vnp_SecureHashType, ...params } = query;
    if (!receivedHash || !process.env.VNPAY_HASH_SECRET) return false;
    const expected = sign(params, process.env.VNPAY_HASH_SECRET);
    const received = String(receivedHash).toLowerCase();
    return received.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
};

module.exports = { buildPaymentUrl, verifyCallback };
