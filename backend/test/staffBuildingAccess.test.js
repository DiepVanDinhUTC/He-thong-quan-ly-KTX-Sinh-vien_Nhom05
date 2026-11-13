const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.__ktxPrismaClient = {};
const prisma = require('../src/config/prisma');
const controller = require('../src/controllers/staffAccountController');
const { restrictTo, createRestrictBuildingAccess } = require('../src/middleware/rbacMiddleware');

const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });

test('building access validates and replaces assignments, including complete revocation', async () => {
    const original = prisma.$transaction;
    let assignments = ['A1'];
    const tx = {
        user: { findFirst: async ({ where }) => where.nhanVien.is.maNhanVien === 'staff' && where.role.in.includes('FACILITIES_MANAGER') ? { id: 'u1' } : null },
        toaNha: { findMany: async ({ where }) => where.maToaNha.in.filter((id) => ['A1', 'A2'].includes(id)).map((maToaNha) => ({ maToaNha })) },
        userBuildingAccess: {
            deleteMany: async ({ where }) => { assignments = where.maToaNha ? assignments.filter((id) => where.maToaNha.notIn.includes(id)) : []; },
            upsert: async ({ create }) => { if (!assignments.includes(create.maToaNha)) assignments.push(create.maToaNha); }
        }
    };
    prisma.$transaction = async (fn) => fn(tx);
    const call = async (body, maNhanVien = 'staff') => { const res = response(); await controller.updateBuildingAccess({ body, params: { maNhanVien } }, res); return res; };
    try {
        assert.equal((await call({ buildingIds: ['A2', 'bad'] })).code, 400);
        assert.deepEqual(assignments, ['A1']);
        assert.equal((await call({ buildingIds: ['A2', 'A2'] })).code, 400);
        assert.equal((await call({ buildingIds: ['A2'] }, 'other')).code, 404);
        assert.equal((await call({ buildingIds: ['A2'] })).code, 200);
        assert.deepEqual(assignments, ['A2']);
        const guard = createRestrictBuildingAccess({ db: { userBuildingAccess: { findMany: async () => assignments.map((maToaNha) => ({ maToaNha })) } } });
        let next = false;
        const req = { user: { id: 'u1', role: 'FACILITIES_MANAGER' }, params: { maToaNha: 'A1' }, query: {}, body: {} };
        const denied = response(); await guard(req, denied, () => { next = true; });
        assert.equal(denied.code, 403); assert.equal(next, false);
        assert.equal((await call({ buildingIds: [] })).code, 200);
        assert.deepEqual(assignments, []);
    } finally { prisma.$transaction = original; }
});

test('only management roles and admin pass staff management role guard', () => {
    const guard = restrictTo('BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN');
    for (const [role, allowed] of [['BOARD_CHAIR', true], ['BOARD_DEPUTY', true], ['ADMIN', true], ['FACILITIES_MANAGER', false]]) {
        let next = false; const res = response(); guard({ user: { role } }, res, () => { next = true; });
        assert.equal(next, allowed);
        if (!allowed) assert.equal(res.code, 403);
    }
});
