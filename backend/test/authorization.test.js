const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const { createProtect } = require('../src/middleware/authMiddleware');
const ROLES = require('../src/config/roles');
const {
    restrictTo,
    requirePermission,
    createRestrictBuildingAccess,
    createRestrictStudentBuildingAccess
} = require('../src/middleware/rbacMiddleware');

const SECRET = 'middleware-test-secret';

const createDb = (overrides = {}) => ({
    user: {
        findUnique: async ({ where }) => ({
            id: where.id,
            role: 'FACILITIES_MANAGER',
            isActive: true,
            nhanVien: { maNhanVien: 'NV-01' },
            sinhVien: null
        })
    },
    userBuildingAccess: {
        findMany: async ({ where }) => where.userId === 'staff-1'
            ? [{ maToaNha: 'A1' }, { maToaNha: 'A2' }]
            : []
    },
    phong: {
        findUnique: async ({ where }) => ({ maToaNha: where.maPhong === 'P-A1' ? 'A1' : 'B9' })
    },
    hopDong: {
        findUnique: async ({ where }) => ({
            maHopDong: where.maHopDong,
            phong: { maToaNha: where.maHopDong === 'HD-A1' ? 'A1' : 'B9' }
        })
    },
    sinhVien: {
        findFirst: async ({ where }) => ({ maSV: where.maSV })
    },
    ...overrides
});

const request = ({
    token,
    id = 'staff-1',
    role,
    params = {},
    query = {},
    body = {}
} = {}) => ({
    get: (header) => header.toLowerCase() === 'authorization'
        ? (token === undefined ? `Bearer ${jwt.sign({ id }, SECRET)}` : token)
        : '',
    user: role ? { id, role } : undefined,
    params,
    query,
    body
});

const invoke = async (middleware, req) => {
    const result = { statusCode: 200, body: null, calledNext: false };
    const res = {
        status(code) {
            result.statusCode = code;
            return this;
        },
        json(body) {
            result.body = body;
            return this;
        }
    };
    await middleware(req, res, () => {
        result.calledNext = true;
    });
    return result;
};

const protectWith = (db, options = {}) => createProtect({
    db,
    jwtClient: jwt,
    getSecret: () => options.secret === undefined ? SECRET : options.secret
});

const buildingGuardWith = (db) => createRestrictBuildingAccess({ db });

test('the configured role set contains only the requested roles plus ADMIN', () => {
    assert.deepEqual([...ROLES.KNOWN_ROLES].sort(), [
        'ACCOUNTANT', 'ADMIN', 'ARCHIVIST', 'BOARD_CHAIR', 'BOARD_DEPUTY',
        'BUILDING_MANAGER', 'FACILITIES_MANAGER', 'MEDICAL_OFFICER', 'MILITARY_OFFICER',
        'MILITARY_STUDENT', 'SECURITY', 'SERVICE_PROVIDER', 'STUDENT', 'TREASURER'
    ].sort());
    assert.equal(ROLES.DIRECTOR, undefined);
});

test('board leaders have read-only student-record access', () => {
    assert.deepEqual(ROLES.STUDENT_RECORD_PERMISSIONS.read, [
        'BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'MEDICAL_OFFICER', 'ADMIN'
    ]);
    assert.deepEqual(ROLES.STUDENT_RECORD_PERMISSIONS.create, ['ARCHIVIST', 'ADMIN']);
    assert.deepEqual(ROLES.STUDENT_RECORD_PERMISSIONS.update, ['ARCHIVIST', 'ADMIN']);
    assert.deepEqual(ROLES.STUDENT_RECORD_PERMISSIONS.delete, ['ARCHIVIST', 'ADMIN']);
    assert.deepEqual(ROLES.STUDENT_RECORD_PERMISSIONS.sync, ['ARCHIVIST', 'ADMIN']);
    for (const permission of ['create', 'update', 'delete', 'sync']) {
        assert.equal(ROLES.STUDENT_RECORD_PERMISSIONS[permission].includes('BOARD_CHAIR'), false);
        assert.equal(ROLES.STUDENT_RECORD_PERMISSIONS[permission].includes('BOARD_DEPUTY'), false);
    }
});

test('board leaders can read room data and decide applications, but cannot perform operational writes', () => {
    assert.deepEqual(ROLES.ROOM_PERMISSIONS.read, ['BOARD_CHAIR', 'BOARD_DEPUTY', 'FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN']);
    assert.deepEqual(ROLES.ROOM_PERMISSIONS.write, ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN']);
    assert.deepEqual(ROLES.APPLICATION_DECISION_ROLES, ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ARCHIVIST', 'BUILDING_MANAGER', 'ADMIN']);
    assert.deepEqual(ROLES.CONTRACT_EDIT_ROLES, ['ARCHIVIST', 'BUILDING_MANAGER', 'ADMIN']);
    assert.equal(ROLES.CONTRACT_READ_ROLES.includes('BOARD_CHAIR'), true);
    assert.equal(ROLES.CONTRACT_READ_ROLES.includes('BOARD_DEPUTY'), true);
});

test('protect rejects missing and malformed bearer headers', async (t) => {
    const protect = protectWith(createDb());
    for (const token of ['', 'Basic abc', 'Bearer', 'Bearer one two']) {
        await t.test(JSON.stringify(token), async () => {
            const result = await invoke(protect, request({ token }));
            assert.equal(result.statusCode, 401);
            assert.equal(result.calledNext, false);
        });
    }
});

test('protect rejects invalid, expired, and incorrectly signed JWTs', async (t) => {
    const protect = protectWith(createDb());
    const cases = [
        ['invalid token', 'not-a-jwt'],
        ['expired token', jwt.sign({ id: 'staff-1' }, SECRET, { expiresIn: -1 })],
        ['wrong signature', jwt.sign({ id: 'staff-1' }, 'another-secret')]
    ];
    for (const [name, token] of cases) {
        await t.test(name, async () => {
            const result = await invoke(protect, request({ token: `Bearer ${token}` }));
            assert.equal(result.statusCode, 401);
        });
    }
});

test('protect reports missing JWT configuration and does not query accounts', async () => {
    let queried = false;
    const db = createDb({ user: { findUnique: async () => { queried = true; return null; } } });
    const originalError = console.error;
    console.error = () => {};
    try {
        const result = await invoke(protectWith(db, { secret: '' }), request());
        assert.equal(result.statusCode, 500);
        assert.equal(queried, false);
    } finally {
        console.error = originalError;
    }
});

test('protect rejects missing, inactive, and unsupported accounts', async (t) => {
    const cases = [
        ['missing account', null, 401],
        ['inactive account', { id: 'staff-1', role: 'STUDENT', isActive: false }, 401],
        ['unknown role', { id: 'staff-1', role: 'ROOT', isActive: true }, 403]
    ];
    for (const [name, account, expectedStatus] of cases) {
        await t.test(name, async () => {
            const db = createDb({ user: { findUnique: async () => account } });
            const result = await invoke(protectWith(db), request());
            assert.equal(result.statusCode, expectedStatus);
        });
    }
});

test('protect loads the current role and profile identifiers from the database', async () => {
    const db = createDb({
        user: {
            findUnique: async () => ({
                id: 'staff-1',
                role: 'ACCOUNTANT',
                isActive: true,
                nhanVien: { maNhanVien: 'NV-99' },
                sinhVien: null
            })
        }
    });
    const req = request();
    const result = await invoke(protectWith(db), req);
    assert.equal(result.calledNext, true);
    assert.deepEqual(req.user, {
        id: 'staff-1',
        role: 'ACCOUNTANT',
        maNhanVien: 'NV-99',
        maSV: null
    });
});

test('protect returns service unavailable if the account lookup fails', async () => {
    const db = createDb({ user: { findUnique: async () => { throw new Error('database offline'); } } });
    const originalError = console.error;
    console.error = () => {};
    try {
        const result = await invoke(protectWith(db), request());
        assert.equal(result.statusCode, 503);
    } finally {
        console.error = originalError;
    }
});

test('restrictTo requires authentication and enforces the allowed role list', async (t) => {
    await t.test('rejects a missing user', async () => {
        const result = await invoke(restrictTo('ACCOUNTANT'), request());
        assert.equal(result.statusCode, 401);
    });
    await t.test('allows a matching role', async () => {
        const result = await invoke(restrictTo('ACCOUNTANT', 'TREASURER'), request({ role: 'TREASURER' }));
        assert.equal(result.calledNext, true);
    });
    await t.test('rejects a non-matching role', async () => {
        const result = await invoke(restrictTo('ACCOUNTANT'), request({ role: 'STUDENT' }));
        assert.equal(result.statusCode, 403);
    });
});

test('named permissions grant specialist access without granting management writes', async (t) => {
    const cases = [
        ['MEDICAL_OFFICER', 'students:read', true],
        ['MEDICAL_OFFICER', 'students:update', false],
        ['MEDICAL_OFFICER', 'residents:read', true],
        ['MEDICAL_OFFICER', 'medical:records:read', true],
        ['MEDICAL_OFFICER', 'medical:records:write', true],
        ['MEDICAL_OFFICER', 'medical:incidents:create', true],
        ['SECURITY', 'rooms:read', false],
        ['SECURITY', 'tickets:read', false],
        ['SECURITY', 'rooms:write', false],
        ['SECURITY', 'residents:read', true],
        ['SECURITY', 'security:access-log:create', true],
        ['SECURITY', 'security:access-log:checkout', true],
        ['SECURITY', 'security:violation:create', true],
        ['FACILITIES_MANAGER', 'tickets:approve', true],
        ['FACILITIES_MANAGER', 'tickets:schedule', true],
        ['FACILITIES_MANAGER', 'tickets:complete', true],
        ['SERVICE_PROVIDER', 'tickets:update', true],
        ['SERVICE_PROVIDER', 'rooms:write', false],
        ['ARCHIVIST', 'students:update', true],
        ['BOARD_CHAIR', 'students:update', false],
        ['BOARD_CHAIR', 'tickets:approve', false],
        ['ADMIN', 'any:permission', true]
    ];
    for (const [role, permission, allowed] of cases) {
        await t.test(`${role} ${allowed ? 'has' : 'does not have'} ${permission}`, async () => {
            const result = await invoke(requirePermission(permission), request({ role }));
            assert.equal(result.calledNext, allowed);
            if (!allowed) assert.equal(result.statusCode, 403);
        });
    }
    const unauthenticated = await invoke(requirePermission('students:read'), request());
    assert.equal(unauthenticated.statusCode, 401);
});

test('finance staff can manage billing but cannot read or write the meter register', async () => {
    for (const role of ['ACCOUNTANT', 'TREASURER']) {
        for (const permission of ['billing:read', 'billing:manage']) {
            const result = await invoke(requirePermission(permission), request({ role }));
            assert.equal(result.calledNext, true, `${role} must retain ${permission}`);
        }
        for (const permission of ['utilities:read', 'utilities:write', 'billing:meter-readings']) {
            const result = await invoke(requirePermission(permission), request({ role }));
            assert.equal(result.statusCode, 403, `${role} must not have ${permission}`);
            assert.equal(result.calledNext, false);
        }
    }
    for (const role of ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN']) {
        for (const permission of ['utilities:read', 'utilities:write']) {
            const result = await invoke(requirePermission(permission), request({ role }));
            assert.equal(result.calledNext, true, `${role} must retain ${permission}`);
        }
    }
});

test('finance pages and actions match API permissions for every role', async () => {
    const { roleCanAccess, financialPermissions } = await import('../../frontend/src/utils/accessControl.js');
    for (const role of ROLES.KNOWN_ROLES) {
        for (const path of ['/financial-dashboard', '/financial-dashboard/invoices', '/financial-dashboard/transactions', '/financial-dashboard/reconciliation']) {
            assert.equal(roleCanAccess(role, path), ROLES.hasPermission(role, 'billing:read'), `${role}: ${path}`);
        }
        assert.equal(financialPermissions.manage.includes(role), ROLES.hasPermission(role, 'billing:manage'), `${role}: billing actions`);
        assert.equal(roleCanAccess(role, '/meter-readings'), ROLES.hasPermission(role, 'utilities:write'), `${role}: meter register`);
    }
});

test('finance staff have global building scope without building assignments', async () => {
    const guard = createRestrictBuildingAccess({ db: () => { throw new Error('finance scope must not query building assignments'); } });
    const targets = [
        {},
        { params: { maToaNha: 'B9' } },
        { query: { maToaNha: 'B9' } },
        { body: { maToaNha: 'B9' } },
        { params: { maPhong: 'P-B9' } },
        { params: { maHopDong: 'HD-B9' } }
    ];
    for (const role of ['ACCOUNTANT', 'TREASURER']) {
        for (const target of targets) {
            const req = request({ id: 'no-assignments', role, ...target });
            const result = await invoke(guard, req);
            assert.equal(result.calledNext, true, `${role}: ${JSON.stringify(target)}`);
            assert.equal(req.buildingScope, null);
        }
    }
});

test('building guard bypasses assignments for global oversight roles', async () => {
    const req = request({ role: 'BOARD_CHAIR', body: { maToaNha: 'B9' } });
    const result = await invoke(buildingGuardWith(createDb()), req);
    assert.equal(result.calledNext, true);
    assert.equal(req.buildingScope, null);
});

test('ADMIN can access every building without an assignment', async () => {
    const req = request({ role: 'ADMIN', body: { maToaNha: 'B9' } });
    const result = await invoke(buildingGuardWith(createDb()), req);
    assert.equal(result.calledNext, true);
    assert.equal(req.buildingScope, null);
});

test('building guard rejects an unauthenticated request', async () => {
    const guard = createRestrictBuildingAccess({ db: {} });
    const result = await invoke(guard, request({ role: undefined }));
    assert.equal(result.statusCode, 401);
});

test('building guard attaches assigned scope for collection endpoints', async () => {
    const req = request({ role: 'FACILITIES_MANAGER' });
    const result = await invoke(buildingGuardWith(createDb()), req);
    assert.equal(result.calledNext, true);
    assert.deepEqual(req.buildingScope, ['A1', 'A2']);
});

test('building guard allows assigned building identifiers and denies other buildings', async (t) => {
    for (const source of ['params', 'query', 'body']) {
        await t.test(`allows assigned ${source} building`, async () => {
            const req = request({ role: 'FACILITIES_MANAGER', [source]: { maToaNha: 'A2' } });
            const result = await invoke(buildingGuardWith(createDb()), req);
            assert.equal(result.calledNext, true);
        });
    }
    await t.test('denies a building that is not assigned', async () => {
        const req = request({ role: 'FACILITIES_MANAGER', body: { maToaNha: 'B9' } });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.statusCode, 403);
    });
});

test('building guard resolves room and contract routes against their building', async (t) => {
    await t.test('allows a room in an assigned building', async () => {
        const req = request({ role: 'FACILITIES_MANAGER', params: { maPhong: 'P-A1' } });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.calledNext, true);
    });
    await t.test('denies a room in another building', async () => {
        const req = request({ role: 'FACILITIES_MANAGER', params: { maPhong: 'P-B9' } });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.statusCode, 403);
    });
    await t.test('allows a contract in an assigned building', async () => {
        const req = request({ role: 'BUILDING_MANAGER', params: { maHopDong: 'HD-A1' } });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.calledNext, true);
    });
    await t.test('denies a contract in another building', async () => {
        const req = request({ role: 'BUILDING_MANAGER', params: { maHopDong: 'HD-B9' } });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.statusCode, 403);
    });
});

test('building guard rejects unassigned users, unknown rooms, and database errors', async (t) => {
    await t.test('rejects an unassigned collection request', async () => {
        const req = request({ id: 'no-assignments', role: 'SECURITY' });
        const result = await invoke(buildingGuardWith(createDb()), req);
        assert.equal(result.statusCode, 403);
    });
    await t.test('returns not found for a room without a building', async () => {
        const db = createDb({
            phong: { findUnique: async () => ({ maToaNha: null }) }
        });
        const req = request({ role: 'FACILITIES_MANAGER', params: { maPhong: 'P-UNASSIGNED' } });
        const result = await invoke(buildingGuardWith(db), req);
        assert.equal(result.statusCode, 404);
    });
    await t.test('returns service unavailable if scope lookup fails', async () => {
        const db = createDb({
            userBuildingAccess: { findMany: async () => { throw new Error('database offline'); } }
        });
        const req = request({ role: 'SECURITY' });
        const originalError = console.error;
        console.error = () => {};
        try {
            const result = await invoke(buildingGuardWith(db), req);
            assert.equal(result.statusCode, 503);
        } finally {
            console.error = originalError;
        }
    });
});

test('student building guard exposes global records to board leaders and ADMIN', async (t) => {
    for (const role of ['BOARD_CHAIR', 'BOARD_DEPUTY', 'ADMIN']) {
        await t.test(role, async () => {
            const db = createDb({
                userBuildingAccess: { findMany: async () => { throw new Error('must not query assignments'); } }
            });
            const req = request({ role });
            const result = await invoke(createRestrictStudentBuildingAccess({ db }), req);
            assert.equal(result.calledNext, true);
            assert.equal(req.buildingScope, null);
        });
    }
});

test('student building guard limits list and detail requests to assigned residents', async (t) => {
    await t.test('attaches assigned buildings to resident list requests', async () => {
        const req = request({ role: 'BUILDING_MANAGER' });
        const result = await invoke(createRestrictStudentBuildingAccess({ db: createDb() }), req);
        assert.equal(result.calledNext, true);
        assert.deepEqual(req.buildingScope, ['A1', 'A2']);
    });
    await t.test('checks the current housing contract before showing a profile', async () => {
        let lookup;
        const db = createDb({
            sinhVien: { findFirst: async (args) => { lookup = args; return { maSV: 'SV-01' }; } }
        });
        const req = request({ role: 'BUILDING_MANAGER', params: { id: 'SV-01' } });
        const result = await invoke(createRestrictStudentBuildingAccess({ db }), req);
        assert.equal(result.calledNext, true);
        assert.deepEqual(lookup.where.hopDongs.some.trangThai.in, ['ACTIVE', 'PENDING_PAYMENT']);
        assert.deepEqual(lookup.where.hopDongs.some.phong.is.maToaNha.in, ['A1', 'A2']);
    });
    await t.test('hides profiles without an active residence in the assigned building', async () => {
        const db = createDb({ sinhVien: { findFirst: async () => null } });
        const req = request({ role: 'BUILDING_MANAGER', params: { id: 'SV-OUTSIDE' } });
        const result = await invoke(createRestrictStudentBuildingAccess({ db }), req);
        assert.equal(result.statusCode, 404);
    });
});

test('student building guard rejects unassigned staff and handles database errors', async (t) => {
    await t.test('rejects a staff account without building assignments', async () => {
        const req = request({ id: 'unassigned', role: 'BUILDING_MANAGER' });
        const result = await invoke(createRestrictStudentBuildingAccess({ db: createDb() }), req);
        assert.equal(result.statusCode, 403);
    });
    await t.test('returns service unavailable when assignment lookup fails', async () => {
        const db = createDb({
            userBuildingAccess: { findMany: async () => { throw new Error('database offline'); } }
        });
        const originalError = console.error;
        console.error = () => {};
        try {
            const result = await invoke(createRestrictStudentBuildingAccess({ db }), request({ role: 'BUILDING_MANAGER' }));
            assert.equal(result.statusCode, 503);
        } finally {
            console.error = originalError;
        }
    });
});
