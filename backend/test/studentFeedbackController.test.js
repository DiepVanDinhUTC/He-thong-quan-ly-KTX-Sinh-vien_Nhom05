const test = require('node:test');
const assert = require('node:assert/strict');
const { createStudentFeedbackController } = require('../src/controllers/studentFeedbackController');

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

test('student feedback validates fields and persists under the authenticated student', async () => {
    const calls = {};
    const controller = createStudentFeedbackController({
        db: {
            sinhVien: { findFirst: async (args) => { calls.student = args; return { maSV: 'SV01' }; } },
            militaryRoomAssignment: { findFirst: async (args) => { calls.militaryStay = args; return null; } },
            hopDong: { findFirst: async (args) => { calls.contract = args; return { phong: { maToaNha: 'A2' } }; } },
            studentFeedback: { create: async (args) => { calls.feedback = args; return { id: 'feedback-1', ...args.data }; } }
        },
        now: () => new Date('2026-11-14T00:00:00.000Z')
    });
    const res = response();
    await controller.create({ user: { id: 'user-1' }, body: { title: '  Đánh giá dịch vụ  ', description: '  Dịch vụ được cải thiện.  ' } }, res);

    assert.equal(res.statusCode, 201);
    assert.equal(calls.student.where.userId, 'user-1');
    assert.deepEqual(calls.contract.where.trangThai.in, ['ACTIVE', 'PENDING_PAYMENT']);
    assert.equal(calls.feedback.data.maSinhVien, 'SV01');
    assert.equal(calls.feedback.data.maToaNha, 'A2');
    assert.equal(calls.feedback.data.title, 'Đánh giá dịch vụ');
    assert.equal(calls.feedback.data.description, 'Dịch vụ được cải thiện.');
});

test('student feedback rejects invalid fields and missing student profiles', async () => {
    const db = {
        sinhVien: { findFirst: async () => null },
        studentFeedback: { create: async () => assert.fail('must not create invalid feedback') }
    };
    const controller = createStudentFeedbackController({ db });
    const invalid = response();
    await controller.create({ user: { id: 'user-1' }, body: { title: 'a', description: 'valid description' } }, invalid);
    assert.equal(invalid.statusCode, 400);

    const unlinked = response();
    await controller.create({ user: { id: 'user-1' }, body: { title: 'Valid title', description: 'valid description' } }, unlinked);
    assert.equal(unlinked.statusCode, 403);
});

test('student feedback requires a current room with an assigned building', async () => {
    const controller = createStudentFeedbackController({
        db: {
            sinhVien: { findFirst: async () => ({ maSV: 'SV01' }) },
            militaryRoomAssignment: { findFirst: async () => null },
            hopDong: { findFirst: async () => ({ phong: { maToaNha: null } }) },
            studentFeedback: { create: async () => assert.fail('must not create feedback without a building') }
        }
    });
    const res = response();
    await controller.create({ user: { id: 'user-1' }, body: { title: 'Valid title', description: 'valid description' } }, res);

    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /tòa nhà/);
});

test('facilities inbox returns feedback newest first with minimal student profile', async () => {
    const calls = {};
    const feedbacks = [{ id: 'feedback-1', title: 'Góp ý', description: 'Nội dung', sinhVien: { maSV: 'SV01' }, toaNha: { maToaNha: 'A1' } }];
    const controller = createStudentFeedbackController({
        db: { studentFeedback: { findMany: async (args) => { calls.query = args; return feedbacks; } } }
    });
    const res = response();
    await controller.list({ buildingScope: ['A1'] }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.feedbacks, feedbacks);
    assert.deepEqual(calls.query.orderBy, { createdAt: 'desc' });
    assert.deepEqual(calls.query.where.maToaNha, { in: ['A1'] });
    assert.deepEqual(calls.query.include.sinhVien.select, { maSV: true, hoTen: true, lop: true, khoa: true });
    assert.deepEqual(calls.query.include.toaNha.select, { maToaNha: true, tenToaNha: true });
});
