const axios = require('axios');

const sisRequestError = (error) => {
    if (String(error?.code || '').startsWith('SIS_')) return error;
    const upstreamStatus = error?.response?.status;
    let message;
    let status = 502;
    if (upstreamStatus === 401 || upstreamStatus === 403) {
        message = 'SIS từ chối truy cập. Hãy kiểm tra quyền truy cập hoặc SIS_API_TOKEN.';
    } else if (upstreamStatus === 404) {
        message = 'Không tìm thấy endpoint SIS. Hãy kiểm tra SIS_UTC_API_URL.';
    } else if (upstreamStatus) {
        message = `SIS trả về lỗi HTTP ${upstreamStatus}.`;
    } else if (['ECONNABORTED', 'ETIMEDOUT'].includes(error?.code)) {
        status = 504;
        message = 'SIS không phản hồi trong thời gian chờ. Hãy kiểm tra tình trạng dịch vụ SIS.';
    } else {
        message = 'Không kết nối được API SIS. Hãy kiểm tra SIS_UTC_API_URL và kết nối mạng.';
    }
    return Object.assign(new Error(message), { status, code: 'SIS_UPSTREAM_ERROR' });
};

const isRetryableSisError = (error) => {
    const status = error?.response?.status;
    if (status) return status === 429 || status >= 500;
    return ['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'EAI_AGAIN'].includes(error?.code);
};

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const requestSis = async ({ httpClient = axios, url, options = {}, maxRetries = 2 }) => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await httpClient.get(url, options);
        } catch (error) {
            if (!isRetryableSisError(error) || attempt >= maxRetries) throw sisRequestError(error);
            await wait(250 * (attempt + 1));
        }
    }
};

const fetchStudentsFromSis = async ({ httpClient = axios, env = process.env } = {}) => {
    const url = String(env.SIS_UTC_API_URL || '').trim();
    if (!url) throw Object.assign(new Error('Thiếu cấu hình SIS_UTC_API_URL.'), { status: 400, code: 'SIS_CONFIGURATION' });

    const timeout = Number(env.SIS_API_TIMEOUT_MS) || 15000;
    const token = String(env.SIS_API_TOKEN || '').trim();
    const options = { timeout };
    if (token) options.headers = { Authorization: `Bearer ${token}` };
    const response = await requestSis({ httpClient, url, options });
    const students = response.data?.data;
    if (!Array.isArray(students)) throw Object.assign(new Error('API SIS kết nối được nhưng không trả về danh sách hồ sơ hợp lệ.'), { status: 502, code: 'SIS_INVALID_RESPONSE' });
    return students;
};

module.exports = { fetchStudentsFromSis, requestSis };
