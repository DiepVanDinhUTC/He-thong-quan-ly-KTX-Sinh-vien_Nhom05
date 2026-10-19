const test = require('node:test');
const assert = require('node:assert/strict');
const { createTicketController, parsePhotos } = require('../src/controllers/ticketController');

const pngData = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).toString('base64');
const makeTicket = (overrides = {}) => ({
    id: 'ticket-1', status: 'PENDING', assignedProviderId: null,
    phong: { maPhong: 'P101', maToaNha: 'A1' }, photos: [], ...overrides
});

const response = () => ({
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

const invoke = async (handler, { role = 'FACILITIES_MANAGER', id = 'staff-1', scope = ['A1'], body = {}, ticket = makeTicket() } = {}) => {
    const calls = {};
    const db = {
        maintenanceTicket: {
            findUnique: async () => ticket,
            update: async (args) => { calls.update = args; return { ...ticket, ...args.data }; }
        }
    };
    const controller = createTicketController({ db, now: () => new Date('2026-10-15T00:00:00.000Z') });
    const res = response();
    await controller[handler]({ user: { id, role }, buildingScope: scope, params: { id: ticket.id }, body }, res);
    return { res, calls };
};

test('facilities staff can approve only pending tickets', async () => {
    const { res, calls } = await invoke('approve');
    assert.equal(res.statusCode, 200);
    assert.equal(calls.update.data.status, 'APPROVED');
    assert.equal(calls.update.data.approvedById, 'staff-1');

    const conflict = await invoke('approve', { ticket: makeTicket({ status: 'IN_PROGRESS' }) });
    assert.equal(conflict.res.statusCode, 409);
    assert.equal(conflict.calls.update, undefined);
});

test('ticket detail is hidden outside the caller building scope', async () => {
    const { res } = await invoke('detail', { scope: ['B2'] });
    assert.equal(res.statusCode, 404);
});

test('facilities staff can schedule an approved ticket for a future appointment', async () => {
    const { res, calls } = await invoke('schedule', {
        ticket: makeTicket({ status: 'APPROVED' }),
        body: { appointmentAt: '2026-10-16T09:00:00.000Z', note: 'Liên hệ sinh viên trước khi đến.' }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(calls.update.data.status, 'SCHEDULED');
    assert.equal(calls.update.data.appointmentNote, 'Liên hệ sinh viên trước khi đến.');

    const past = await invoke('schedule', {
        ticket: makeTicket({ status: 'APPROVED' }),
        body: { appointmentAt: '2026-10-14T09:00:00.000Z' }
    });
    assert.equal(past.res.statusCode, 400);
});

test('service providers can only see tickets assigned to their account', async () => {
    const { res } = await invoke('detail', { role: 'SERVICE_PROVIDER', id: 'provider-2' });
    assert.equal(res.statusCode, 404);
});

test('completion requires an in-progress ticket, a note, and a valid evidence image', async () => {
    const { res, calls } = await invoke('submitCompletion', {
        ticket: makeTicket({ status: 'IN_PROGRESS' }),
        body: { note: 'Đã thay thiết bị và kiểm tra hoạt động.', photos: [{ fileName: 'nghiem-thu.png', mimeType: 'image/png', data: `data:image/png;base64,${pngData}` }] }
    });
    assert.equal(res.statusCode, 200);
    assert.equal(calls.update.data.status, 'WAITING_ACCEPTANCE');
    assert.equal(calls.update.data.photos.create[0].kind, 'COMPLETION');

    const invalid = await invoke('submitCompletion', {
        ticket: makeTicket({ status: 'PENDING' }),
        body: { note: 'Xong', photos: [{ fileName: 'bad.png', mimeType: 'image/png', data: 'YWJj' }] }
    });
    assert.equal(invalid.res.statusCode, 409);
});

test('photo payload validation rejects invalid MIME and files larger than 2 MB', () => {
    assert.throws(() => parsePhotos([{ mimeType: 'text/plain', data: 'YWJj' }], 'COMPLETION'), /định dạng/);
    const oversized = Buffer.alloc(2 * 1024 * 1024 + 1, 0xff).toString('base64');
    assert.throws(() => parsePhotos([{ mimeType: 'image/jpeg', data: oversized }], 'COMPLETION'), /2 MB/);
});
