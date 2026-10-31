const test = require('node:test');
const assert = require('node:assert/strict');
const ROLES = require('../src/config/roles');
const rooms = require('../src/routes/api/v1/rooms');
const tickets = require('../src/routes/api/v1/tickets');
const securityMedical = require('../src/routes/api/v1/securityMedical');

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
});
const gate = (router, path, method = 'get') => router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods[method]
).route.stack[0].handle;
const checkGate = async (handler, role) => {
    const res = response();
    let allowed = false;
    await handler({ user: { role } }, res, () => { allowed = true; });
    return { res, allowed };
};

test('security signs in to its home and has three independent navigation destinations', async () => {
    const { roleCanAccess, homeForRole } = await import('../../frontend/src/utils/accessControl.js');
    const { securitySections } = await import('../../frontend/src/utils/securityNavigation.js');
    assert.equal(homeForRole('SECURITY'), '/security');
    assert.deepEqual(securitySections.map(({ to }) => to), ['/security', '/security/visitors', '/security/violations']);
    for (const role of ROLES.KNOWN_ROLES) {
        for (const { to } of securitySections) {
            assert.equal(roleCanAccess(role, to), ['SECURITY', 'ADMIN'].includes(role), `${role}: ${to}`);
        }
    }
});
test('frontend room and repair access agrees with API permissions after separating security', async () => {
    const { roleCanAccess } = await import('../../frontend/src/utils/accessControl.js');
    for (const role of ROLES.KNOWN_ROLES) {
        assert.equal(roleCanAccess(role, '/rooms'), ROLES.hasPermission(role, 'rooms:read'), `${role}: rooms`);
        assert.equal(roleCanAccess(role, '/tickets'), ROLES.hasPermission(role, 'tickets:read'), `${role}: repairs`);
    }
    for (const [router, paths] of [[rooms, ['/', '/locations']], [tickets, ['/', '/:id']]]) {
        for (const path of paths) {
            const result = await checkGate(gate(router, path), 'SECURITY');
            assert.equal(result.allowed, false, path);
            assert.equal(result.res.statusCode, 403, path);
            for (const role of ['FACILITIES_MANAGER', 'BUILDING_MANAGER', 'ADMIN']) {
                assert.equal((await checkGate(gate(router, path), role)).allowed, true, `${role}: ${path}`);
            }
        }
    }
});

test('security retains guest check-in, checkout, resident lookup, and violation recording without medical access', async () => {
    for (const [path, method] of [
        ['/residents', 'get'], ['/access-logs', 'get'], ['/access-logs', 'post'],
        ['/access-logs/:accessLogId/checkout', 'patch'], ['/violations', 'get'], ['/violations', 'post']
    ]) {
        assert.equal((await checkGate(gate(securityMedical, path, method), 'SECURITY')).allowed, true, path);
    }
    for (const path of ['/health-records', '/medical-incidents']) {
        const result = await checkGate(gate(securityMedical, path), 'SECURITY');
        assert.equal(result.allowed, false, path);
        assert.equal(result.res.statusCode, 403, path);
        assert.equal((await checkGate(gate(securityMedical, path), 'MEDICAL_OFFICER')).allowed, true, path);
    }
});

test('security has global resident and violation scope; archivists read but cannot create violations', async () => {
    for (const path of ['/residents', '/violations']) {
        const route = securityMedical.stack.find((layer) => layer.route?.path === path && layer.route.methods.get).route;
        const scope = route.stack[2].handle;
        const req = { user: { role: 'SECURITY' }, query: {} };
        let nextCalled = false;
        await scope(req, response(), () => { nextCalled = true; });
        assert.equal(nextCalled, true);
        assert.equal(req.buildingScope, null);
    }
    assert.equal((await checkGate(gate(securityMedical, '/violations', 'post'), 'ARCHIVIST')).allowed, false);
    assert.equal((await checkGate(gate(securityMedical, '/violation-summary'), 'ARCHIVIST')).allowed, true);
});
