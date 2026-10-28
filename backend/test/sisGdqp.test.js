const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createSisGdqpService } = require("../src/services/sisGdqpService");

test("Adapter gửi đúng đợt/khoa và dùng mock theo PORT khi chưa cấu hình SIS thật", async () => {
    const adapter = createSisGdqpService({
        env: { PORT: "5500" },
        httpClient: { get: async (url, options) => {
            assert.equal(url, "http://127.0.0.1:5500/api/v1/mock/sis-utc/gdqp/registrations");
            assert.deepEqual(options.params, { maDot: "DOT-1", khoa: "CNTT,Kinh tế" });
            assert.equal(options.timeout, 10000);
            return { data: { success: true, data: { maDot: "DOT-1", hocViens: [] } } };
        } }
    });
    assert.deepEqual(await adapter("DOT-1", ["CNTT", "Kinh tế"]), []);
});

test("Production không tự dùng SIS giả lập", async () => {
    const adapter = createSisGdqpService({ env: { NODE_ENV: "production" } });
    await assert.rejects(adapter("DOT-1", ["CNTT"]), { statusCode: 503 });
});

test("Từ chối response sai đợt, sai cấu trúc hoặc có bản ghi khác đợt", async () => {
    for (const body of [null, {}, { success: true, data: { maDot: "OTHER", hocViens: [] } },
        { success: true, data: { maDot: "DOT-1", hocViens: {} } },
        { success: true, data: { maDot: "DOT-1", hocViens: [{ maDot: "OTHER" }] } }]) {
        const adapter = createSisGdqpService({ env: {}, httpClient: { get: async () => ({ data: body }) } });
        await assert.rejects(adapter("DOT-1", ["CNTT"]), { statusCode: 502 });
    }
});

test("Lỗi SIS trả 404/502 và không lộ token hoặc config Axios", async () => {
    for (const [status, expected] of [[404, 404], [401, 502], [500, 502], [undefined, 502]]) {
        const adapter = createSisGdqpService({
            env: { SIS_GDQP_API_URL: "https://sis.example.test/gdqp", SIS_GDQP_API_TOKEN: "secret-test" },
            httpClient: { get: async (url, options) => {
                assert.equal(url, "https://sis.example.test/gdqp");
                assert.equal(options.headers.Authorization, "Bearer secret-test");
                throw Object.assign(new Error("secret-test"), { response: { status } });
            } }
        });
        await assert.rejects(adapter("DOT-1", ["CNTT"]), error => {
            assert.equal(error.statusCode, expected);
            assert.ok(!error.message.includes("secret-test"));
            assert.equal(error.config, undefined);
            return true;
        });
    }
});
