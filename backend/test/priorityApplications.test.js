const test = require('node:test');
const assert = require('node:assert/strict');
// Replace the database module before loading controllers so these tests never open database transactions.
const prisma = {
    $transaction: async () => { throw new Error('Unexpected database transaction'); },
    sinhVien: { findMany: async () => [] },
    dangKyKTX: { findMany: async () => [] },
    hopDong: { findMany: async () => [] },
    phong: { findMany: async () => [] }
};
require('../src/config/prisma');
require.cache[require.resolve('../src/config/prisma')].exports = prisma;
const applications = require('../src/controllers/applicationController');
const contracts = require('../src/controllers/contractController');
const { getAllStudents } = require('../src/controllers/studentController');
const { getArchiveRoomCandidates } = require('../src/controllers/roomController');
const { isPriorityStudent, sortByStudentPriority } = require('../src/services/studentPriority');
const { defaultContractTerms } = require('../src/services/applicationApproval');

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});

const fixture = (t, options = {}) => {
    const state = {
        student: { maSV: 'SV1', dienUuTien: 'Hộ nghèo', ...options.student },
        room: { maPhong: 'A101', loaiPhong: 'CO_BAN', soSinhVienToiDa: 4, soSinhVienHienTai: 2, phiNoiTruThang: 300000, ...options.room },
        applications: options.pending ? [{ maDangKy: 'OLD', maSinhVien: 'SV1', trangThai: 'PENDING' }] : [],
        contracts: options.contractStatus ? [{ maHopDong: 'OLD', maSinhVien: 'SV1', trangThai: options.contractStatus }] : []
    };
    const tx = {
        sinhVien: { findFirst: async ({ where, select }) => {
            assert.equal(where.userId, 'user1');
            assert.equal(select.dienUuTien, true);
            return options.missingStudent ? null : state.student;
        } },
        phong: {
            findUnique: async () => options.missingRoom ? null : { ...state.room },
            updateMany: async ({ where, data }) => {
                if (options.lostReservation || state.room.soSinhVienHienTai >= where.soSinhVienHienTai.lt) return { count: 0 };
                state.room.soSinhVienHienTai += data.soSinhVienHienTai.increment;
                return { count: 1 };
            }
        },
        dangKyKTX: {
            findFirst: async () => state.applications.find((item) => item.trangThai === 'PENDING') || null,
            findUnique: async ({ where }) => state.applications.find((item) => item.maDangKy === where.maDangKy) || null,
            create: async ({ data }) => {
                const item = { maDangKy: 'DK1', ngayDangKy: new Date(), ...data };
                state.applications.push(item);
                return { ...item };
            },
            updateMany: async ({ where, data }) => {
                const item = state.applications.find((item) => item.maDangKy === where.maDangKy && item.trangThai === where.trangThai);
                if (!item || options.lostApproval) return { count: 0 };
                Object.assign(item, data);
                return { count: 1 };
            }
        },
        hopDong: {
            findFirst: async () => state.contracts.find((item) => ['ACTIVE', 'PENDING_PAYMENT'].includes(item.trangThai)) || null,
            create: async ({ data }) => {
                if (options.failContract) throw new Error('Simulated contract insert failure');
                const item = { maHopDong: 'HD1', ...data };
                state.contracts.push(item);
                return item;
            }
        }
    };
    t.mock.method(prisma, '$transaction', async (callback, settings) => {
        assert.equal(settings.isolationLevel, 'Serializable');
        if (options.serializationConflict) throw Object.assign(new Error('Conflict'), { code: 'P2034' });
        const before = structuredClone(state);
        try { return await callback(tx); }
        catch (error) { Object.assign(state, before); throw error; }
    });
    const register = async (body = {}) => {
        const res = response();
        await applications.createApplication({
            user: { id: 'user1', role: 'STUDENT' },
            body: { loaiPhongYeuCau: 'CO_BAN', maPhongYeuCau: 'A101', ...body }
        }, res);
        return res;
    };
    return { state, register };
};

test('only meaningful priority values qualify; Không, zero, empty values, and null do not', () => {
    for (const dienUuTien of [undefined, null, '', '   ', 0, '0', ' 0 ', 'Không', ' KHÔNG ', 'khong', 'null', ' NULL ']) {
        assert.equal(isPriorityStudent({ dienUuTien }), false, String(dienUuTien));
    }
    for (const dienUuTien of ['Hộ nghèo', 'Con thương binh', '1', 'Diện khác']) {
        assert.equal(isPriorityStudent({ dienUuTien }), true, dienUuTien);
    }
});

test('priority sorting is stable and does not change the original list', () => {
    const rows = ['Không', 'Hộ nghèo', null, 'Con thương binh', '0'].map((dienUuTien, id) => ({ id, dienUuTien }));
    assert.deepEqual(sortByStudentPriority(rows).map((row) => row.id), [1, 3, 0, 2, 4]);
    assert.deepEqual(rows.map((row) => row.id), [0, 1, 2, 3, 4]);
});

test('a priority registration is approved immediately, reserves one place, and returns a priced draft contract', async (t) => {
    const f = fixture(t);
    const res = await f.register();
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.autoApproved, true);
    assert.equal(res.body.data.trangThai, 'APPROVED');
    assert.equal(f.state.applications[0].trangThai, 'APPROVED');
    assert.equal(f.state.room.soSinhVienHienTai, 3);
    assert.equal(f.state.contracts.length, 1);
    assert.equal(res.body.contract.maSinhVien, 'SV1');
    assert.equal(res.body.contract.maPhong, 'A101');
    assert.equal(res.body.contract.trangThai, 'PENDING_PAYMENT');
    assert.equal(res.body.contract.tongTien, 1500000);
    const start = res.body.contract.ngayBatDau;
    const end = res.body.contract.ngayKetThuc;
    assert.equal((end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth(), 5);
    const approved = structuredClone(f.state);
    assert.equal((await f.register()).statusCode, 409);
    assert.deepEqual(f.state, approved);
});

for (const dienUuTien of [null, '', 'Không', '0']) {
    test(`non-priority registration (${String(dienUuTien)}) stays pending even if the client claims priority`, async (t) => {
        const f = fixture(t, { student: { dienUuTien } });
        const res = await f.register({ dienUuTien: 'Hộ nghèo', isPriority: true });
        assert.equal(res.statusCode, 201);
        assert.equal(res.body.autoApproved, false);
        assert.equal(res.body.data.trangThai, 'PENDING');
        assert.equal(res.body.contract, null);
        assert.equal(f.state.contracts.length, 0);
        assert.equal(f.state.room.soSinhVienHienTai, 2);
    });
}

test('existing pending applications and live contracts prevent duplicate registrations', async (t) => {
    for (const options of [{ pending: true }, { contractStatus: 'ACTIVE' }, { contractStatus: 'PENDING_PAYMENT' }]) {
        const f = fixture(t, options);
        const before = structuredClone(f.state);
        assert.equal((await f.register()).statusCode, 409);
        assert.deepEqual(f.state, before);
        t.mock.restoreAll();
    }
});

test('a student with an active military room cannot reserve a second bed through registration', async (t) => {
    const f = fixture(t, { student: { militaryRoomAssignments: [{ id: 'QS1' }] } });
    const before = structuredClone(f.state);
    assert.equal((await f.register()).statusCode, 409);
    assert.deepEqual(f.state, before);
});

test('approval rejects an old pending application when the student has since received a military room', async (t) => {
    const f = fixture(t, { student: { dienUuTien: null } });
    await f.register();
    f.state.applications[0].sinhVien = { militaryRoomAssignments: [{ id: 'QS1' }] };
    const before = structuredClone(f.state);
    const res = response();
    await contracts.createContract({ body: {
        maDangKy: 'DK1', maPhong: 'A101', ngayBatDau: '2026-11-01', ngayKetThuc: '2027-04-01', tongTien: 1500000
    } }, res);
    assert.equal(res.statusCode, 409);
    assert.deepEqual(f.state, before);
});

test('a full, missing, mismatched, or unpriced room cannot leave an approved application or reserved place', async (t) => {
    for (const [options, expectedStatus] of [
        [{ room: { soSinhVienHienTai: 4 } }, 409],
        [{ missingRoom: true }, 404],
        [{ missingStudent: true }, 404],
        [{ room: { loaiPhong: 'CO_BAN_NHO' } }, 400],
        [{ room: { phiNoiTruThang: -1 } }, 409],
        [{ lostReservation: true }, 409],
        [{ lostApproval: true }, 409],
        [{ failContract: true }, 500],
        [{ serializationConflict: true }, 409]
    ]) {
        const f = fixture(t, options);
        const before = structuredClone(f.state);
        assert.equal((await f.register()).statusCode, expectedStatus);
        assert.deepEqual(f.state, before);
        t.mock.restoreAll();
    }
});

test('automatic contract terms charge one five-month semester using the Vietnamese date and clamp month-end dates', () => {
    const room = { phiNoiTruThang: 200000 };
    const terms = defaultContractTerms(room, new Date('2026-10-24T18:00:00Z'));
    assert.equal(terms.ngayBatDau.toISOString(), '2026-10-25T00:00:00.000Z');
    assert.equal(terms.ngayKetThuc.toISOString(), '2027-03-25T00:00:00.000Z');
    assert.equal(terms.tongTien, 1000000);
    const monthEnd = defaultContractTerms(room, new Date('2026-09-30T01:00:00Z'));
    assert.equal(monthEnd.ngayKetThuc.toISOString(), '2027-02-28T00:00:00.000Z');
    assert.equal(monthEnd.tongTien, 1000000);
});

test('manual and automatic defaults agree on five-month dates and amounts across month ends', async () => {
    const { PAYMENT_PERIOD_MONTHS, currentHousingDate, housingPeriodEnd, defaultHousingAmount } = await import('../../frontend/src/utils/housingBilling.js');
    assert.equal(PAYMENT_PERIOD_MONTHS, 5);
    for (const timestamp of ['2026-10-24T18:00:00Z', '2026-09-30T01:00:00Z', '2027-09-30T01:00:00Z', '2026-01-31T01:00:00Z']) {
        for (const room of [{ phiNoiTruThang: 300000 }, { loaiPhong: 'QUAT' }, { loaiPhong: 'DIEU_HOA' }]) {
            const now = new Date(timestamp);
            const automatic = defaultContractTerms(room, now);
            assert.equal(currentHousingDate(now), automatic.ngayBatDau.toISOString().slice(0, 10));
            assert.equal(housingPeriodEnd(currentHousingDate(now)), automatic.ngayKetThuc.toISOString().slice(0, 10));
            assert.equal(defaultHousingAmount(room), automatic.tongTien);
        }
    }
});

test('staff can still approve ordinary pending registrations using their chosen terms', async (t) => {
    const f = fixture(t, { student: { dienUuTien: 'Không' } });
    await f.register();
    const res = response();
    await contracts.createContract({ body: {
        maDangKy: 'DK1', maPhong: 'A101', ngayBatDau: '2026-11-01', ngayKetThuc: '2027-05-01', tongTien: 1800000
    } }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(f.state.applications[0].trangThai, 'APPROVED');
    assert.equal(res.body.data.tongTien, 1800000);
    assert.equal(res.body.data.trangThai, 'PENDING_PAYMENT');
    assert.equal(f.state.room.soSinhVienHienTai, 3);
});

test('student, application, contract, and archive candidate lists all put priority students first', async (t) => {
    const students = ['Không', 'Hộ nghèo', null, 'Con thương binh'].map((dienUuTien, index) => ({ maSV: `SV${index}`, dienUuTien }));
    t.mock.method(prisma.sinhVien, 'findMany', async () => students);
    t.mock.method(prisma.dangKyKTX, 'findMany', async () => students.map((sinhVien) => ({ maSinhVien: sinhVien.maSV, sinhVien })));
    t.mock.method(prisma.hopDong, 'findMany', async () => students.map((sinhVien) => ({ maSinhVien: sinhVien.maSV, sinhVien })));
    t.mock.method(prisma.phong, 'findMany', async () => []);
    for (const handler of [getAllStudents, applications.getAllApplications, contracts.getContracts, getArchiveRoomCandidates]) {
        const res = response();
        await handler({ buildingScope: null }, res);
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.data.map((item) => item.maSV || item.maSinhVien), ['SV1', 'SV3', 'SV0', 'SV2']);
        assert.deepEqual(res.body.data.map((item) => item.isPriority), [true, true, false, false]);
    }
});
