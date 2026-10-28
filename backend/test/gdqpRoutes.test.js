const { test } = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");
const { createProtect } = require("../src/middleware/authMiddleware");
const gdqpService = require("../src/services/gdqpAllocationService");
const { createSisGdqpService } = require("../src/services/sisGdqpService");
const { createGdqpRouter } = require("../src/routes/api/v1/gdqpAllocationRoutes");
const mockSisRoutes = require("../src/routes/api/v1/mockSisUtc");

test("HTTP: 4 API GDQP hoạt động với SIS giả lập, giữ hồ sơ nội trú và chặn phân trùng", async t => {
    const secret = "gdqp-route-test-secret";
    const accounts = new Map(["MILITARY_OFFICER", "ADMIN", "STUDENT", "ACCOUNTANT"].map(role => [role, {
        id: role, role, isActive: true,
        nhanVien: role === "STUDENT" ? null : { maNhanVien: `NV-${role}` },
        sinhVien: role === "STUDENT" ? { maSV: "20120001" } : null
    }]));
    const resident = { maSV: "20120001", gioiTinh: true, khoa: "Công nghệ thông tin", trangThaiNoiTru: "Đang lưu trú" };
    const students = [resident];
    const allocations = [];
    const db = {
        user: { findUnique: async ({ where }) => accounts.get(where.id) || null },
        sinhVien: {
            findMany: async ({ where }) => students.filter(sv => where.maSV.in.includes(sv.maSV)),
            createMany: async ({ data }) => students.push(...data)
        },
        phanPhongGDQP: {
            findMany: async ({ where, include }) => allocations.filter(row => row.maDot === where.maDot).map(row =>
                include ? { ...row, sinhVien: students.find(sv => sv.maSV === row.maSinhVien) } : row
            ),
            createMany: async ({ data }) => allocations.push(...data)
        },
        $transaction: async run => run(db)
    };
    const app = express();
    app.use(express.json());
    app.use("/api/v1/mock/sis-utc", mockSisRoutes);
    app.use("/api/v1/gdqp", createGdqpRouter({
        authenticate: createProtect({ db, getSecret: () => secret })
    }));
    const server = await new Promise((resolve, reject) => {
        const instance = app.listen(0, "127.0.0.1", () => resolve(instance));
        instance.on("error", reject);
    });
    t.after(() => new Promise((resolve, reject) => {
        server.close(error => error ? reject(error) : resolve());
        server.closeAllConnections();
    }));
    const base = `http://127.0.0.1:${server.address().port}`;
    const service = gdqpService.createGdqpAllocationService({
        db,
        layDangKy: createSisGdqpService({ env: { SIS_GDQP_API_URL: `${base}/api/v1/mock/sis-utc/gdqp/registrations` } })
    });
    for (const [name, method] of Object.entries(service)) t.mock.method(gdqpService, name, method);
    t.mock.method(console, "error", () => {});
    const token = role => jwt.sign({ id: role, role }, secret);
    const officerToken = token("MILITARY_OFFICER");
    async function request(path, { method = "GET", body, auth = officerToken } = {}) {
        const response = await fetch(`${base}${path}`, {
            method,
            headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
        return { status: response.status, body: await response.json() };
    }
    const prefix = "/api/v1/gdqp/phan-phong";
    const body = { maDot: "GDQP-2026-01", danhSachKhoa: ["Công nghệ thông tin", "Kinh tế"] };
    assert.equal((await request(`${prefix}/preview`, { method: "POST", body, auth: null })).status, 401);
    assert.equal((await request(`${prefix}/execute`, { method: "POST", body, auth: token("STUDENT") })).status, 403);
    assert.equal((await request(`${prefix}/preview`, { method: "POST", body, auth: token("ACCOUNTANT") })).status, 403);
    assert.equal((await request(`${prefix}/preview`, { method: "POST", body, auth: token("ADMIN") })).status, 200);
    assert.equal((await request(`${prefix}/preview`, { method: "POST" })).status, 400);
    assert.equal((await request(`${prefix}/preview`, { method: "POST", body: { ...body, danhSachKhoa: [] } })).status, 400);
    assert.equal((await request(`${prefix}/preview`, { method: "POST", body: { ...body, maDot: "UNKNOWN" } })).status, 404);

    const preview = await request(`${prefix}/preview`, { method: "POST", body });
    assert.equal(preview.status, 200);
    assert.equal(preview.body.data.tongHocVien, 2);
    assert.equal(allocations.length, 0);
    const khoa = new URLSearchParams(body.danhSachKhoa.map(item => ["khoa", item]));
    const before = await request(`${prefix}/${body.maDot}/chua-phan?${khoa}`);
    assert.equal(before.status, 200);
    assert.equal(before.body.data.length, 2); // Gồm cả sinh viên đang nội trú.

    const executed = await request(`${prefix}/execute`, { method: "POST", body });
    assert.equal(executed.status, 201);
    assert.deepEqual(executed.body.data, preview.body.data);
    assert.equal(students.length, 2);
    assert.equal(students[0], resident);
    assert.equal(students[0].trangThaiNoiTru, "Đang lưu trú");
    assert.equal(allocations.length, 2);
    const saved = await request(`${prefix}/${body.maDot}`);
    assert.equal(saved.status, 200);
    assert.equal(saved.body.data.tongHocVien, 2);
    assert.deepEqual(saved.body.data.danhSachPhanPhong, executed.body.data.danhSachPhanPhong);
    assert.deepEqual((await request(`${prefix}/${body.maDot}/chua-phan?${khoa}`)).body.data, []);
    assert.equal((await request(`${prefix}/execute`, { method: "POST", body })).status, 409);
    assert.equal(allocations.length, 2);
    const next = await request(`${prefix}/execute`, { method: "POST", body: { ...body, maDot: "GDQP-2026-02" } });
    assert.equal(next.status, 201);
    assert.equal(students.length, 2);
    assert.deepEqual(next.body.data.danhSachPhanPhong, executed.body.data.danhSachPhanPhong);
});
