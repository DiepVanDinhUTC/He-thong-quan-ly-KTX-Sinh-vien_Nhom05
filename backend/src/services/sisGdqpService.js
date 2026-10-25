const axios = require("axios");

function createSisGdqpService({ httpClient = axios, env = process.env } = {}) {
    return async function layDangKyGDQP(maDot, danhSachKhoa) {
        const mockUrl = `http://127.0.0.1:${env.PORT || 5000}/api/v1/mock/sis-utc/gdqp/registrations`;
        const url = env.SIS_GDQP_API_URL || (env.NODE_ENV !== "production" ? mockUrl : null);
        if (!url) {
            throw Object.assign(new Error("Chưa cấu hình SIS_GDQP_API_URL"), { statusCode: 503 });
        }
        let response;
        try {
            response = await httpClient.get(url, {
                params: { maDot, khoa: danhSachKhoa.join(",") },
                timeout: 10000,
                headers: env.SIS_GDQP_API_TOKEN ? { Authorization: `Bearer ${env.SIS_GDQP_API_TOKEN}` } : {}
            });
        } catch (error) {
            if (error.response?.status === 404) {
                throw Object.assign(new Error("Không tìm thấy đợt GDQP trên SIS"), { statusCode: 404 });
            }
            // Không đưa cấu hình Axios hoặc token SIS vào log/response của controller.
            throw Object.assign(new Error("Không thể lấy đăng ký GDQP từ SIS"), { statusCode: 502 });
        }
        const body = response.data;
        if (body?.success !== true || body.data?.maDot !== maDot || !Array.isArray(body.data?.hocViens) ||
            body.data.hocViens.some(hv => hv?.maDot !== undefined && hv.maDot !== maDot)) {
            throw Object.assign(new Error("SIS trả dữ liệu GDQP không hợp lệ hoặc sai đợt"), { statusCode: 502 });
        }
        return body.data.hocViens;
    };
}

module.exports = { createSisGdqpService, layDangKyGDQP: createSisGdqpService() };
