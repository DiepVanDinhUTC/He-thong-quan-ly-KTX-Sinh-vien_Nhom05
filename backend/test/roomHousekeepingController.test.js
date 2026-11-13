const test = require('node:test');
const assert = require('node:assert/strict');
const { createRoomHousekeepingController } = require('../src/controllers/roomHousekeepingController');

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const validBody = {
    maPhong: 'P101',
    generalScore: 4,
    livingScore: 3,
    securityScore: 5,
    propertyScore: 4,
    environmentScore: 2,
    notes: 'Cần cải thiện vệ sinh.'
};

test('facilities manager can save a room evaluation in an assigned building', async () => {
    const calls = {};
    const controller = createRoomHousekeepingController({
        db: {
            phong: { findUnique: async (args) => { calls.room = args; return { maPhong: 'P101', maToaNha: 'A1' }; } },
            roomHousekeepingEvaluation: {
                findFirst: async (args) => { calls.existing = args; return null; },
                create: async (args) => { calls.create = args; return { id: 'evaluation-1', ...args.data }; }
            }
        },
        now: () => new Date('2026-11-14T00:00:00.000Z')
    });
    const res = response();
    await controller.create({ user: { id: 'manager-1' }, buildingScope: ['A1'], body: validBody }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(calls.create.data.maPhong, 'P101');
    assert.equal(calls.create.data.recordedById, 'manager-1');
    assert.equal(calls.create.data.generalScore, 4);
    assert.equal(calls.create.data.environmentScore, 2);
    assert.equal(calls.create.data.notes, 'Cần cải thiện vệ sinh.');
    assert.equal(calls.create.data.periodMonth.toISOString(), '2026-11-01T00:00:00.000Z');
    assert.equal(calls.create.data.periodLockKey, '["P101","2026-11-01"]');
    assert.deepEqual(calls.existing.where, { maPhong: 'P101', periodMonth: new Date('2026-11-01T00:00:00.000Z') });
});

test('room evaluations reject invalid scores and rooms outside the assigned buildings', async () => {
    const db = {
        phong: { findUnique: async () => ({ maPhong: 'P202', maToaNha: 'A2' }) },
        roomHousekeepingEvaluation: {
            findFirst: async () => null,
            create: async () => assert.fail('must not save invalid evaluation')
        }
    };
    const controller = createRoomHousekeepingController({ db });
    const invalidScore = response();
    await controller.create({ user: { id: 'manager-1' }, buildingScope: ['A1'], body: { ...validBody, generalScore: 6 } }, invalidScore);
    assert.equal(invalidScore.statusCode, 400);

    const wrongBuilding = response();
    await controller.create({ user: { id: 'manager-1' }, buildingScope: ['A1'], body: validBody }, wrongBuilding);
    assert.equal(wrongBuilding.statusCode, 403);
});

test('a room can only have one evaluation per Vietnam calendar month', async () => {
    const existing = { id: 'evaluation-1', maPhong: 'P101', periodMonth: new Date('2026-12-01T00:00:00.000Z') };
    const controller = createRoomHousekeepingController({
        db: {
            phong: { findUnique: async () => ({ maPhong: 'P101', maToaNha: 'A1' }) },
            roomHousekeepingEvaluation: {
                findFirst: async () => existing,
                create: async () => assert.fail('must not create a second monthly evaluation')
            }
        },
        now: () => new Date('2026-11-30T18:00:00.000Z')
    });
    const res = response();
    await controller.create({ user: { id: 'manager-1' }, buildingScope: ['A1'], body: validBody }, res);

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.evaluation.id, existing.id);
});

test('facilities managers can edit an existing evaluation only within their building scope', async () => {
    const calls = {};
    const existing = { id: 'evaluation-1', phong: { maPhong: 'P101', maToaNha: 'A1' } };
    const controller = createRoomHousekeepingController({
        db: {
            roomHousekeepingEvaluation: {
                findUnique: async () => existing,
                update: async (args) => { calls.update = args; return { ...existing, ...args.data }; }
            }
        },
        now: () => new Date('2026-11-14T00:00:00.000Z')
    });
    const updated = response();
    await controller.update({ params: { id: 'evaluation-1' }, buildingScope: ['A1'], body: { ...validBody, maPhong: 'P101' } }, updated);
    assert.equal(updated.statusCode, 200);
    assert.equal(calls.update.where.id, 'evaluation-1');
    assert.equal(calls.update.data.generalScore, 4);
    assert.equal(calls.update.data.updatedAt.toISOString(), '2026-11-14T00:00:00.000Z');

    const forbidden = response();
    await controller.update({ params: { id: 'evaluation-1' }, buildingScope: ['A2'], body: validBody }, forbidden);
    assert.equal(forbidden.statusCode, 404);
});

test('evaluation history is filtered to the assigned buildings and limited to recent entries', async () => {
    const calls = {};
    const controller = createRoomHousekeepingController({
        db: { roomHousekeepingEvaluation: { findMany: async (args) => { calls.query = args; return []; } } }
    });
    const res = response();
    await controller.list({ buildingScope: ['A1', 'A3'] }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.query.where.phong.is.maToaNha.in, ['A1', 'A3']);
    assert.equal(calls.query.take, 100);
    assert.deepEqual(calls.query.orderBy, { createdAt: 'desc' });
});
