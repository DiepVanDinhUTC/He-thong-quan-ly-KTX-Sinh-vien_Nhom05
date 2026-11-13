const test = require('node:test');
const assert = require('node:assert/strict');
globalThis.__ktxPrismaClient = {};
const prisma = require('../src/config/prisma');
const controller = require('../src/controllers/militaryManagementController');
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
test('future bookings notify learners and conflicts or past bookings do not', async () => {
    const original = prisma.$transaction;
    let recipients, query, conflict = false;
    prisma.$transaction = async (fn) => fn({
        meetingRoom: { findFirst: async () => ({ name: 'Phòng 1', location: 'Tòa A' }) },
        meetingRoomBooking: { findFirst: async () => conflict ? { id: 'other' } : null, create: async () => ({ id: 'booking' }) },
        sinhVien: { findMany: async (args) => { query = args; return [{ maSV: 'A' }, { maSV: 'B' }]; } },
        militaryNotification: { createMany: async ({ data }) => { recipients = data; return { count: data.length }; } }
    });
    try {
        const req = { user: { id: 'staff' }, body: { meetingRoomId: 'room', title: 'Lịch học', purpose: 'Tập trung', startsAt: '2099-01-01T01:00:00Z', endsAt: '2099-01-01T02:00:00Z' } };
        const res = response();
        await controller.createMeetingBooking(req, res);
        assert.equal(res.code, 201);
        assert.deepEqual(recipients.map((item) => item.maSinhVien), ['A', 'B']);
        assert.equal(recipients[0].bookingId, 'booking');
        assert.match(recipients[0].message, /Lịch học/);
        assert.match(recipients[0].message, /Phòng 1/);
        assert.equal(query.where.user.is.isActive, true);
        recipients = undefined;
        conflict = true;
        const rejected = response();
        await controller.createMeetingBooking(req, rejected);
        assert.equal(rejected.code, 409);
        assert.equal(recipients, undefined);
        conflict = false;
        req.body.startsAt = '2020-01-01T01:00:00Z';
        req.body.endsAt = '2020-01-01T02:00:00Z';
        await controller.createMeetingBooking(req, response());
        assert.equal(recipients, undefined);
    } finally { prisma.$transaction = original; }
});
