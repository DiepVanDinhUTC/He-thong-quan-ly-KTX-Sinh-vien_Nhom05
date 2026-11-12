const test = require('node:test');
const assert = require('node:assert/strict');

const logs = [
    { id: 'a', maToaNha: 'A', checkedOutAt: null },
    { id: 'b', maToaNha: 'B', checkedOutAt: null }
];
const prisma = {
    toaNha: { findMany: async ({ where }) => { assert.deepEqual(where, {}); return [{ maToaNha: 'A' }, { maToaNha: 'B' }]; } },
    sinhVien: { findMany: async () => [] },
    militaryRoomAssignment: { findFirst: async ({ where }) => {
        assert.equal(where.phong.is.maToaNha, 'B');
        return { maPhong: 'B101', phong: { maToaNha: 'B' } };
    } },
    securityAccessLog: {
        findMany: async ({ where }) => { assert.deepEqual(where, {}); return logs; },
        create: async ({ data }) => { const entry = { id: 'new', ...data }; logs.push(entry); return entry; },
        updateMany: async ({ where, data }) => {
            assert.equal(where.maToaNha, undefined);
            const entry = logs.find((item) => item.id === where.id && !item.checkedOutAt);
            if (!entry) return { count: 0 };
            Object.assign(entry, data);
            return { count: 1 };
        },
        findUnique: async ({ where }) => logs.find((item) => item.id === where.id)
    }
};
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = prisma;
const router = require('../src/routes/api/v1/securityMedical');

const invoke = async (path, method, options = {}) => {
    const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route;
    const req = { user: { id: 'security', role: 'SECURITY' }, params: {}, query: {}, body: {}, ...options };
    const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    let index = 0;
    const next = async () => {
        const handler = route.stack[index++]?.handle;
        if (handler) await handler(req, res, next);
    };
    await next();
    return res;
};

test('security can look up buildings and manage visitors across buildings without assignments', async () => {
    const directory = await invoke('/residents', 'get');
    assert.deepEqual(directory.body.data.buildings.map((building) => building.maToaNha), ['A', 'B']);

    const list = await invoke('/access-logs', 'get');
    assert.deepEqual(list.body.data.map((entry) => entry.maToaNha), ['A', 'B']);

    const created = await invoke('/access-logs', 'post', { body: {
        visitorName: 'Khách', purpose: 'Thăm sinh viên', maToaNha: 'B', maSinhVien: 'SV1'
    } });
    assert.equal(created.statusCode, 201);
    assert.equal(created.body.data.maToaNha, 'B');
    assert.equal(created.body.data.maPhong, 'B101');

    const checkout = await invoke('/access-logs/:accessLogId/checkout', 'patch', { params: { accessLogId: 'b' } });
    assert.equal(checkout.statusCode, 200);
    assert.ok(checkout.body.data.checkedOutAt);
});

test('other roles cannot access visitor logs', async () => {
    for (const [path, method] of [
        ['/access-logs', 'get'], ['/access-logs', 'post'], ['/access-logs/:accessLogId/checkout', 'patch']
    ]) {
        const res = await invoke(path, method, { user: { id: 'other', role: 'MEDICAL_OFFICER' } });
        assert.equal(res.statusCode, 403, `${method} ${path}`);
    }
});
