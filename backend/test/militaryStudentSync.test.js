const test = require('node:test');
const assert = require('node:assert/strict');
const { createMilitaryStudentSyncService } = require('../src/services/militaryStudentSyncService');

const config = {
    SIS_GDQP_REGISTRATIONS_API_URL: 'https://sis.example.test/api/registrations',
    SIS_GDQP_COURSE_CODE: 'GDQP101',
    SIS_GDQP_BATCHES: 'DOT-1,DOT-2',
    SIS_GDQP_FACULTY_CODES: 'KHOA-CNTT,KHOA-OTO',
    SIS_MILITARY_STUDENT_DEFAULT_PASSWORD: 'test-only-password'
};

const registration = (overrides = {}) => ({
    courseCode: 'GDQP101',
    facultyCode: 'KHOA-CNTT',
    batchCode: 'DOT-1',
    registrationStatus: 'Đã đăng ký',
    student: {
        maSV: 'SV-GDQP-001',
        hoTen: 'Nguyen Van A',
        ngaySinh: '2004-03-15',
        gioiTinh: 'Nam',
        lop: 'CNTT1-K64',
        khoa: 'Công nghệ thông tin',
        cccd: '012345678901',
        phone: '0900000001',
        email: 'sv001@example.test'
    },
    ...overrides
});

const fakeDb = ({ users = [], students = [] } = {}) => {
    const state = { users: new Map(users.map((user) => [user.id, { ...user }])), students: new Map(students.map((student) => [student.maSV, { ...student }])) };
    let idCounter = 0;
    const tx = {
        user: {
            findUnique: async ({ where }) => where.id
                ? state.users.get(where.id) || null
                : [...state.users.values()].find((user) => user.username === where.username) || null,
            create: async ({ data }) => {
                const user = { id: `user-${++idCounter}`, ...data };
                state.users.set(user.id, user);
                return user;
            },
            update: async ({ where, data }) => {
                const updated = { ...state.users.get(where.id), ...data };
                state.users.set(where.id, updated);
                return updated;
            }
        },
        sinhVien: {
            findUnique: async ({ where }) => state.students.get(where.maSV) || null,
            create: async ({ data }) => {
                state.students.set(data.maSV, data);
                return data;
            },
            update: async ({ where, data }) => {
                const updated = { ...state.students.get(where.maSV), ...data };
                state.students.set(where.maSV, updated);
                return updated;
            }
        }
    };
    return { state, $transaction: (callback) => callback(tx) };
};

test('GDQP sync requires SIS endpoint, course, batch, and faculty configuration', async () => {
    let called = false;
    const run = createMilitaryStudentSyncService({
        db: fakeDb(),
        httpClient: { get: async () => { called = true; return { data: { data: [] } }; } },
        env: {}
    });
    await assert.rejects(run, /SIS_GDQP_REGISTRATIONS_API_URL/);
    assert.equal(called, false);
});

test('GDQP sync creates a linked MILITARY_STUDENT account only for selected registration filters', async () => {
    const db = fakeDb();
    let requested;
    const httpClient = {
        get: async (url, options) => {
            requested = { url, options };
            return { data: { data: [
                registration(),
                registration({ batchCode: 'DOT-OTHER', student: { maSV: 'OUT-OF-BATCH' } }),
                registration({ courseCode: 'MATH101', student: { maSV: 'OTHER-COURSE' } }),
                registration({ registrationStatus: 'CANCELLED', student: { maSV: 'CANCELLED' } })
            ] } };
        }
    };
    const run = createMilitaryStudentSyncService({ db, httpClient, env: { ...config, SIS_API_TOKEN: 'test-token' }, hashPassword: async () => 'hashed-default' });

    const result = await run();

    assert.deepEqual(requested.options.params, { courseCode: 'GDQP101', batches: 'DOT-1,DOT-2', facultyCodes: 'KHOA-CNTT,KHOA-OTO' });
    assert.deepEqual(requested.options.headers, { Authorization: 'Bearer test-token' });
    assert.equal(result.received, 4);
    assert.equal(result.selected, 1);
    assert.equal(result.createdAccounts, 1);
    assert.equal(result.skipped.length, 3);
    const account = [...db.state.users.values()][0];
    assert.equal(account.username, 'SV-GDQP-001');
    assert.equal(account.role, 'MILITARY_STUDENT');
    assert.equal(account.password, 'hashed-default');
    assert.equal(db.state.students.get('SV-GDQP-001').userId, account.id);
});

test('GDQP sync marks a linked STUDENT profile without changing login role or password', async () => {
    const db = fakeDb({
        users: [{ id: 'existing-user', username: 'SV-GDQP-001', password: 'existing-hash', role: 'STUDENT', isActive: true }],
        students: [{ maSV: 'SV-GDQP-001', userId: 'existing-user', hoTen: 'Old Name' }]
    });
    const run = createMilitaryStudentSyncService({
        db,
        httpClient: { get: async () => ({ data: { data: [registration()] } }) },
        env: config,
        hashPassword: async () => 'unused-hash'
    });

    const result = await run();

    assert.equal(result.createdAccounts, 0);
    assert.equal(result.militaryStudentsMarked, 1);
    assert.equal(db.state.users.get('existing-user').role, 'STUDENT');
    assert.equal(db.state.users.get('existing-user').password, 'existing-hash');
    assert.equal(db.state.students.get('SV-GDQP-001').hoTen, 'Nguyen Van A');
    assert.equal(db.state.students.get('SV-GDQP-001').laHocVienQuanSu, true);
});

test('GDQP sync does not create a partial student profile when required SIS data is missing', async () => {
    const db = fakeDb();
    const incomplete = registration({ student: { maSV: 'SV-INCOMPLETE', hoTen: 'Missing data' } });
    const run = createMilitaryStudentSyncService({
        db,
        httpClient: { get: async () => ({ data: { data: [incomplete] } }) },
        env: config,
        hashPassword: async () => 'hashed-default'
    });

    const result = await run();

    assert.equal(result.createdAccounts, 0);
    assert.equal(db.state.students.has('SV-INCOMPLETE'), false);
    assert.equal(db.state.users.size, 0);
    assert.match(result.skipped[0].reason, /Thiếu dữ liệu hồ sơ bắt buộc/);
});
