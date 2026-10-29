const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { seedCauGiayManagers } = require('../seedCauGiayManagers');

const legacyAccount = (floor) => ({
    id: `USER-CG${floor}T`, username: `qltn.cg${floor}t`, role: 'BUILDING_MANAGER',
    password: `existing-password-hash-${floor}`, isActive: true,
    nhanVien: {
        maNhanVien: `NV-QLTN-CG${floor}T`, role: 'BUILDING_MANAGER',
        hoTen: `Quản lý tòa ${floor} tầng Cầu Giấy`, chucVu: `Quản lý tòa ${floor} tầng Cầu Giấy`,
        email: `qltn.cg${floor}t@example.test`, phone: '0000000000'
    },
    buildingAccess: [{ userId: `USER-CG${floor}T`, maToaNha: `CG_${floor}T` }]
});

// Transaction copies make rollback assertions independent of real database contents.
function fixture(users = [legacyAccount(3), legacyAccount(4)], buildings = ['CG_3T', 'CG_4T']) {
    let state = structuredClone(users);
    return {
        snapshot: () => structuredClone(state),
        $transaction: async (run) => {
            const pending = structuredClone(state);
            const tx = {
                toaNha: { findMany: async () => buildings.map((maToaNha) => ({ maToaNha, maKhu: 'KHU_03CG' })) },
                user: {
                    findMany: async ({ where }) => structuredClone(pending.filter((user) => where.username.in.includes(user.username))),
                    update: async ({ where, data }) => {
                        const user = pending.find((item) => item.id === where.id);
                        Object.assign(user, data);
                        return structuredClone(user);
                    },
                    create: async ({ data }) => {
                        const { nhanVien, ...account } = data;
                        const user = { ...account, id: `NEW-${account.username}`, nhanVien: nhanVien.create, buildingAccess: [] };
                        pending.push(user);
                        return structuredClone(user);
                    }
                },
                nhanVien: {
                    update: async ({ where, data }) => {
                        const user = pending.find((item) => item.nhanVien.maNhanVien === where.maNhanVien);
                        Object.assign(user.nhanVien, data);
                        return structuredClone(user.nhanVien);
                    }
                },
                userBuildingAccess: {
                    upsert: async ({ create }) => {
                        const user = pending.find((item) => item.id === create.userId);
                        if (!user.buildingAccess.some((access) => access.maToaNha === create.maToaNha)) {
                            user.buildingAccess.push(create);
                        }
                        return create;
                    }
                }
            };
            const result = await run(tx);
            state = pending;
            return result;
        }
    };
}

test('Cau Giay legacy accounts move to the existing facilities role without replacing credentials or assignments', async () => {
    const db = fixture();
    const before = db.snapshot();
    const results = await seedCauGiayManagers(db);
    const after = db.snapshot();
    assert.equal(after.length, 2);
    for (let index = 0; index < after.length; index += 1) {
        const floor = index + 3;
        assert.equal(after[index].username, `csvc.cg${floor}t`);
        assert.equal(after[index].role, 'FACILITIES_MANAGER');
        assert.equal(after[index].nhanVien.role, 'FACILITIES_MANAGER');
        assert.equal(after[index].nhanVien.hoTen, `Quản lý CSVC tòa ${floor} tầng Cầu Giấy`);
        assert.equal(after[index].nhanVien.email, `csvc.cg${floor}t@example.test`);
        assert.equal(after[index].id, before[index].id);
        assert.equal(after[index].password, before[index].password);
        assert.equal(after[index].nhanVien.maNhanVien, before[index].nhanVien.maNhanVien);
        assert.deepEqual(after[index].buildingAccess, before[index].buildingAccess);
        assert.equal(results[index].password, null);
        assert.equal(results[index].created, false);
        assert.equal(results[index].previousUsername, before[index].username);
    }
    const rerun = await seedCauGiayManagers(db);
    assert.deepEqual(db.snapshot(), after);
    assert.ok(rerun.every((account) => !account.created && !account.previousUsername && account.password === null));
});

test('migration preserves disabled accounts and employee contact details entered by the user', async () => {
    const users = [legacyAccount(3), legacyAccount(4)];
    users[0].isActive = false;
    Object.assign(users[0].nhanVien, { hoTen: 'Nguyễn Văn An', email: 'an@example.test', phone: '0912345678' });
    const db = fixture(users);
    await seedCauGiayManagers(db);
    const account = db.snapshot()[0];
    assert.equal(account.isActive, false);
    assert.equal(account.nhanVien.hoTen, 'Nguyễn Văn An');
    assert.equal(account.nhanVien.email, 'an@example.test');
    assert.equal(account.nhanVien.phone, '0912345678');
});

test('fresh installation creates two scoped facilities accounts with separate bcrypt passwords', async () => {
    const db = fixture([]);
    const results = await seedCauGiayManagers(db);
    assert.equal(results.length, 2);
    assert.notEqual(results[0].password, results[1].password);
    for (const account of db.snapshot()) {
        const result = results.find((item) => item.username === account.username);
        assert.equal(account.role, 'FACILITIES_MANAGER');
        assert.equal(account.nhanVien.role, 'FACILITIES_MANAGER');
        assert.deepEqual(account.buildingAccess.map((access) => access.maToaNha), [result.maToaNha]);
        assert.ok(await bcrypt.compare(result.password, account.password));
    }
});

test('a conflicting new username rolls back the migration of both accounts', async () => {
    const conflict = { ...legacyAccount(4), id: 'OTHER-USER', username: 'csvc.cg4t' };
    const db = fixture([legacyAccount(3), legacyAccount(4), conflict]);
    const before = db.snapshot();
    await assert.rejects(() => seedCauGiayManagers(db), /đều tồn tại/);
    assert.deepEqual(db.snapshot(), before);
});

test('unexpected roles, employee profiles or building assignments cannot be silently reassigned', async () => {
    for (const mutate of [
        (account) => { account.role = 'ADMIN'; },
        (account) => { account.nhanVien.maNhanVien = 'OTHER-EMPLOYEE'; },
        (account) => { account.buildingAccess.push({ userId: account.id, maToaNha: 'A1' }); }
    ]) {
        const users = [legacyAccount(3), legacyAccount(4)];
        mutate(users[1]);
        const db = fixture(users);
        const before = db.snapshot();
        await assert.rejects(() => seedCauGiayManagers(db));
        assert.deepEqual(db.snapshot(), before);
    }
});

test('missing Cau Giay buildings prevent any account migration', async () => {
    const db = fixture([legacyAccount(3), legacyAccount(4)], ['CG_3T']);
    const before = db.snapshot();
    await assert.rejects(() => seedCauGiayManagers(db), /CG_4T/);
    assert.deepEqual(db.snapshot(), before);
});
