const { randomUUID } = require('crypto');
const { ROOM_TYPES } = require('./src/config/roomTypes');

const khu = { maKhu: 'KHU_03CG', tenKhu: 'Khu số 3 Cầu Giấy', diaChi: 'Số 3, Cầu Giấy, Hà Nội' };
const buildings = [
    { maToaNha: 'CG_3T', maKhu: khu.maKhu, tenToaNha: 'Tòa nhà 3 tầng', soTang: 3 },
    { maToaNha: 'CG_4T', maKhu: khu.maKhu, tenToaNha: 'Tòa nhà 4 tầng', soTang: 4 }
];
const layoutByBuilding = {
    CG_3T: ['CG_A1', 'CG_A2'],
    CG_4T: ['CG_B1', 'CG_B2', 'CG_B3']
};

function buildRoomRows() {
    return buildings.flatMap((building) => Array.from({ length: building.soTang }, (_, floorIndex) => {
        const tang = floorIndex + 1;
        return layoutByBuilding[building.maToaNha].map((loaiPhong, index) => {
            const type = ROOM_TYPES[loaiPhong];
            const soSinhVienToiDa = type.capacities[0];
            const soPhong = String(tang * 100 + index + 1);
            return {
                maPhong: `CG-${building.soTang}T-${soPhong}`,
                soPhong,
                maToaNha: building.maToaNha,
                tang,
                loaiPhong,
                soSinhVienToiDa,
                phiNoiTruThang: type.monthlyFeeByCapacity[soSinhVienToiDa]
            };
        });
    }).flat());
}

async function seedCauGiayRooms(prisma) {
    const rows = buildRoomRows();
    return prisma.$transaction(async (tx) => {
        await tx.khu.upsert({ where: { maKhu: khu.maKhu }, create: khu, update: {} });
        for (const building of buildings) {
            const current = await tx.toaNha.findUnique({ where: { maToaNha: building.maToaNha } });
            if (current && (current.maKhu !== building.maKhu || current.soTang !== building.soTang)) {
                throw new Error(`Tòa ${building.maToaNha} đã tồn tại với khu hoặc số tầng khác cấu hình Cầu Giấy.`);
            }
            if (!current) await tx.toaNha.create({ data: building });
        }

        const existingRooms = await tx.phong.findMany({
            where: {
                OR: [
                    { maPhong: { in: rows.map((room) => room.maPhong) } },
                    { maToaNha: { in: buildings.map((building) => building.maToaNha) } }
                ]
            }
        });
        const existingByCode = new Map(existingRooms.map((room) => [room.maPhong, room]));
        let createdRooms = 0;
        let createdFacilities = 0;

        for (const room of rows) {
            const existing = existingByCode.get(room.maPhong);
            if (existing && (existing.maToaNha !== room.maToaNha || existing.soPhong !== room.soPhong)) {
                throw new Error(`Mã ${room.maPhong} đã được dùng cho phòng khác.`);
            }
            if (!existing) {
                if (existingRooms.some((item) => item.maToaNha === room.maToaNha && item.soPhong === room.soPhong)) {
                    throw new Error(`Phòng ${room.soPhong} tại ${room.maToaNha} đã tồn tại với mã khác.`);
                }
                await tx.phong.create({ data: room });
                createdRooms += 1;
            }

            // Preserve rooms edited after seeding, including prices, occupants and facility condition.
            if (existing) continue;
            for (const tenThietBi of ROOM_TYPES[room.loaiPhong].amenities) {
                const soLuong = tenThietBi === 'Giường tầng'
                    ? room.soSinhVienToiDa / 2
                    : tenThietBi === 'Giường đơn' ? room.soSinhVienToiDa : 1;
                await tx.thietBiPhong.create({
                    data: { maThietBi: randomUUID(), maPhong: room.maPhong, tenThietBi, soLuong }
                });
                createdFacilities += 1;
            }
        }

        return {
            createdRooms,
            skippedRooms: rows.length - createdRooms,
            createdFacilities,
            roomsByBuilding: Object.fromEntries(buildings.map((building) => [
                building.maToaNha, rows.filter((room) => room.maToaNha === building.maToaNha).length
            ])),
            totalCapacity: rows.reduce((sum, room) => sum + room.soSinhVienToiDa, 0)
        };
    }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000 });
}

if (require.main === module) {
    require('dotenv').config({ quiet: true });
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    seedCauGiayRooms(prisma)
        .then((summary) => console.log(JSON.stringify(summary)))
        .catch((error) => {
            console.error('CAU_GIAY_ROOM_SEED_FAILED', error.code || error.name, error.message);
            process.exitCode = 1;
        })
        .finally(() => prisma.$disconnect());
}

module.exports = { buildRoomRows, seedCauGiayRooms };
