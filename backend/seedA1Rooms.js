const { randomUUID } = require('crypto');
const { ROOM_TYPES } = require('./src/config/roomTypes');
const { isA1MilitaryRoom } = require('./src/config/a1Rooms');

function buildA1RoomRows() {
    return Array.from({ length: 4 }, (_, floorIndex) => {
        const tang = floorIndex + 1;
        return Array.from({ length: 17 }, (_, roomIndex) => {
            const soPhong = String(tang * 100 + roomIndex + 1);
            // Use the last three rooms on each floor as the default small-room layout.
            const loaiPhong = isA1MilitaryRoom({ maToaNha: 'A1', soPhong })
                ? 'PHO_THONG_KHONG_DIEU_HOA'
                : roomIndex >= 14 ? 'CO_BAN_NHO' : 'CO_BAN';
            const soSinhVienToiDa = loaiPhong === 'CO_BAN_NHO' ? 6 : 8;
            return {
                maPhong: `NCT-A1-${soPhong}`,
                soPhong,
                maToaNha: 'A1',
                tang,
                loaiPhong,
                soSinhVienToiDa,
                phiNoiTruThang: ROOM_TYPES[loaiPhong].monthlyFeeByCapacity[soSinhVienToiDa]
            };
        });
    }).flat();
}

async function seedA1RoomsInTransaction(tx) {
    const building = await tx.toaNha.findUnique({ where: { maToaNha: 'A1' } });
    if (!building || building.maKhu !== 'KHU_NCT' || building.soTang < 4) {
        throw new Error('Tòa A1 phải có ít nhất 4 tầng và thuộc KHU_NCT trước khi bổ sung phòng.');
    }

    const rows = buildA1RoomRows();
    const existingRooms = await tx.phong.findMany({
        where: { OR: [{ maToaNha: 'A1' }, { maPhong: { in: rows.map((room) => room.maPhong) } }] }
    });
    const existingByCode = new Map(existingRooms.map((room) => [room.maPhong, room]));
    const existingByNumber = new Map();
    for (const room of existingRooms.filter((item) => item.maToaNha === 'A1')) {
        const roomNumber = String(room.soPhong).trim();
        if (existingByNumber.has(roomNumber)) throw new Error(`Tòa A1 đang có số phòng trùng: ${roomNumber}.`);
        existingByNumber.set(roomNumber, room);
    }

    const newRooms = [];
    const reclassifiedRooms = [];
    for (const row of rows) {
        const existing = existingByNumber.get(row.soPhong);
        const codeOwner = existingByCode.get(row.maPhong);
        if (codeOwner && codeOwner.maPhong !== existing?.maPhong) {
            throw new Error(`Mã ${row.maPhong} đã được dùng cho phòng khác.`);
        }
        if (!existing) {
            newRooms.push(row);
            continue;
        }

        // Preserve existing small/basic variants outside the military area.
        const loaiPhong = !isA1MilitaryRoom(row) && ['CO_BAN', 'CO_BAN_NHO'].includes(existing.loaiPhong)
            ? existing.loaiPhong : row.loaiPhong;
        if (existing.loaiPhong !== loaiPhong) {
            // Do not change existing prices, capacities, occupants, equipment or contracts.
            await tx.phong.update({ where: { maPhong: existing.maPhong }, data: { loaiPhong } });
            reclassifiedRooms.push(row.soPhong);
        }
    }

    const facilities = newRooms.flatMap((room) => ROOM_TYPES[room.loaiPhong].amenities.map((tenThietBi) => ({
        maThietBi: randomUUID(),
        maPhong: room.maPhong,
        tenThietBi,
        soLuong: tenThietBi === 'Giường tầng' ? room.soSinhVienToiDa / 2 : 1
    })));
    if (newRooms.length) await tx.phong.createMany({ data: newRooms });
    if (facilities.length) await tx.thietBiPhong.createMany({ data: facilities });

    return {
        createdRooms: newRooms.length,
        skippedRooms: rows.length - newRooms.length,
        reclassifiedRooms,
        createdFacilities: facilities.length,
        totalRoomsInLayout: rows.length,
        militaryRooms: rows.filter(isA1MilitaryRoom).length
    };
}

async function seedA1Rooms(prisma) {
    return prisma.$transaction(seedA1RoomsInTransaction, {
        isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000
    });
}

if (require.main === module) {
    require('dotenv').config({ quiet: true });
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    seedA1Rooms(prisma)
        .then((summary) => console.log(JSON.stringify(summary)))
        .catch((error) => {
            console.error('A1_ROOM_SEED_FAILED', error.code || error.name, error.message);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}

module.exports = { buildA1RoomRows, seedA1Rooms, seedA1RoomsInTransaction };
