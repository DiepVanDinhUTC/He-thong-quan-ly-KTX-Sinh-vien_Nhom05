const test = require('node:test');
const assert = require('node:assert/strict');
const prisma = require('../src/config/prisma');
const { moveRoomMember } = require('../src/controllers/roomController');

const fixture = (t, { status = 'ACTIVE', monthlyFee = 150000 } = {}) => {
    const contract = {
        maHopDong: 'HD1', maPhong: 'A101', trangThai: status, tongTien: 3000000,
        ngayBatDau: new Date('2026-10-24'), ngayKetThuc: new Date('2027-08-24')
    };
    const rooms = {
        A101: { maPhong: 'A101', loaiPhong: 'CO_BAN', soSinhVienToiDa: 4, soSinhVienHienTai: 3, phiNoiTruThang: 300000 },
        B201: { maPhong: 'B201', loaiPhong: 'CO_BAN', soSinhVienToiDa: 6, soSinhVienHienTai: 2, phiNoiTruThang: monthlyFee }
    };
    const updateRoom = async ({ where, data }) => {
        const room = rooms[where.maPhong];
        room.soSinhVienHienTai += (data.soSinhVienHienTai.increment || 0) - (data.soSinhVienHienTai.decrement || 0);
        return { count: 1 };
    };
    const tx = {
        hopDong: {
            findFirst: async ({ where, select }) => {
                assert.ok(where.trangThai.in.includes(contract.trangThai));
                return Object.fromEntries(Object.keys(select).map((key) => [key, contract[key]]));
            },
            update: async ({ data }) => Object.assign(contract, data)
        },
        phong: {
            findUnique: async ({ where }) => rooms[where.maPhong],
            update: updateRoom,
            updateMany: updateRoom
        }
    };
    t.mock.method(prisma, '$transaction', async (callback, options) => {
        assert.equal(options.isolationLevel, 'Serializable');
        return callback(tx);
    });
    const res = {
        statusCode: 200,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
    const move = () => moveRoomMember({ params: { maPhong: 'A101', maHopDong: 'HD1' }, body: { maPhongMoi: 'B201' } }, res);
    return { contract, rooms, res, move };
};

for (const status of ['ACTIVE', 'PENDING_PAYMENT']) {
    test(`direct transfers update the rent of ${status} contracts along with the room`, async (t) => {
        const f = fixture(t, { status });
        await f.move();
        assert.equal(f.res.statusCode, 200);
        assert.equal(f.res.body.success, true);
        assert.equal(f.contract.maPhong, 'B201');
        assert.equal(f.contract.tongTien, 1500000);
        assert.equal(f.contract.trangThai, status);
        assert.equal(f.rooms.A101.soSinhVienHienTai, 2);
        assert.equal(f.rooms.B201.soSinhVienHienTai, 3);
    });
}

test('direct transfers reject invalid destination rates before changing the room or rent', async (t) => {
    const f = fixture(t, { monthlyFee: -1 });
    await f.move();
    assert.equal(f.res.statusCode, 409);
    assert.equal(f.contract.maPhong, 'A101');
    assert.equal(f.contract.tongTien, 3000000);
    assert.equal(f.rooms.A101.soSinhVienHienTai, 3);
    assert.equal(f.rooms.B201.soSinhVienHienTai, 2);
});
