require('dotenv').config();
const { randomUUID } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { ROOM_TYPES } = require('./src/config/roomTypes');

const prisma = new PrismaClient();

// Each entry is [room type code, capacity, optional small-room marker].
const layoutByBuilding = {
    A1: [
        [['CO_BAN', 4], ['CO_BAN', 6], ['CO_BAN_NHO', 4], ['PHO_THONG_KHONG_DIEU_HOA', 4, true]],
        [['CO_BAN', 8], ['CO_BAN_NHO', 6], ['PHO_THONG_KHONG_DIEU_HOA', 4], ['PHO_THONG_KHONG_DIEU_HOA', 6]],
        [['CO_BAN', 4], ['CO_BAN', 6], ['PHO_THONG_KHONG_DIEU_HOA', 8]],
        [['CO_BAN_NHO', 4], ['CO_BAN_NHO', 6], ['PHO_THONG_KHONG_DIEU_HOA', 4]]
    ],
    A3: [
        [['CO_BAN', 4], ['CO_BAN', 6], ['CO_BAN', 8]],
        [['CO_BAN_NHO', 4], ['CO_BAN_NHO', 6], ['PHO_THONG_KHONG_DIEU_HOA', 4]],
        [['PHO_THONG_KHONG_DIEU_HOA', 4, true], ['PHO_THONG_KHONG_DIEU_HOA', 6], ['PHO_THONG_KHONG_DIEU_HOA', 8]],
        [['CO_BAN', 4], ['CO_BAN_NHO', 6], ['PHO_THONG_KHONG_DIEU_HOA', 4]]
    ],
    A4: [
        [['THIET_BI_TANG_CUONG', 6], ['PHO_THONG_CO_DIEU_HOA', 4], ['TIEU_CHUAN', 4], ['TIEU_CHUAN', 6]],
        [['THIET_BI_TANG_CUONG', 6], ['PHO_THONG_CO_DIEU_HOA', 6], ['TIEU_CHUAN', 4], ['TIEU_CHUAN', 6]],
        [['THIET_BI_TANG_CUONG', 6], ['PHO_THONG_CO_DIEU_HOA', 4], ['TIEU_CHUAN', 6]],
        [['THIET_BI_TANG_CUONG', 6], ['PHO_THONG_CO_DIEU_HOA', 6], ['TIEU_CHUAN', 4]]
    ],
    A6: [
        [['CO_BAN', 4], ['CO_BAN', 6]],
        [['CO_BAN', 8], ['CO_BAN_NHO', 4]],
        [['CO_BAN_NHO', 6], ['PHO_THONG_KHONG_DIEU_HOA', 4]],
        [['PHO_THONG_KHONG_DIEU_HOA', 6], ['PHO_THONG_KHONG_DIEU_HOA', 8]],
        [['CO_BAN', 4], ['PHO_THONG_KHONG_DIEU_HOA', 4, true]]
    ]
};

const floorCountByBuilding = { A1: 4, A2: 0, A3: 4, A4: 4, A5: 3, A6: 5 };
const residentialBuildingIds = Object.keys(layoutByBuilding);
const noDormBuildingIds = ['A2', 'A5'];

function buildRoomRows() {
    const rows = [];
    for (const [buildingId, floors] of Object.entries(layoutByBuilding)) {
        floors.forEach((floorRooms, floorIndex) => {
            const floor = floorIndex + 1;
            floorRooms.forEach(([typeCode, capacity, isSmallRoom], index) => {
                const type = ROOM_TYPES[typeCode];
                if (!type || !type.capacities.includes(capacity)) {
                    throw new Error(`Invalid room definition: ${buildingId}, floor ${floor}, ${typeCode}/${capacity}`);
                }
                const roomNumber = String(floor * 100 + index + 1).padStart(3, '0');
                const monthlyFee = isSmallRoom
                    ? 570000
                    : type.monthlyFeeByCapacity[capacity];
                rows.push({
                    maPhong: `NCT-${buildingId}-${roomNumber}`,
                    soPhong: roomNumber,
                    maToaNha: buildingId,
                    tang: floor,
                    loaiPhong: typeCode,
                    soSinhVienToiDa: capacity,
                    phiNoiTruThang: monthlyFee,
                    isSmallRoom: Boolean(isSmallRoom),
                    amenities: type.amenities
                });
            });
        });
    }
    return rows;
}

async function main() {
    const rows = buildRoomRows();
    if (rows.length !== 50) throw new Error(`Expected 50 rooms, got ${rows.length}`);

    await prisma.$transaction(async (tx) => {
        const buildings = await tx.toaNha.findMany({
            where: { maToaNha: { in: [...residentialBuildingIds, ...noDormBuildingIds] } },
            select: { maToaNha: true, maKhu: true }
        });
        const buildingById = new Map(buildings.map((building) => [building.maToaNha, building]));
        for (const buildingId of ['A1', 'A3', 'A4', 'A5', 'A6']) {
            const building = buildingById.get(buildingId);
            if (!building || building.maKhu !== 'KHU_NCT') {
                throw new Error(`${buildingId} must exist in KHU_NCT before room seeding`);
            }
        }
        if (!buildingById.has('A2')) throw new Error('A2 must exist before applying the floor configuration');

        const roomsInNoDormBuildings = await tx.phong.findMany({
            where: { maToaNha: { in: noDormBuildingIds } },
            select: { maPhong: true, maToaNha: true }
        });
        if (roomsInNoDormBuildings.length) {
            throw new Error(`A2/A5 already contain ${roomsInNoDormBuildings.length} room(s); review before seeding`);
        }

        for (const [maToaNha, soTang] of Object.entries(floorCountByBuilding)) {
            await tx.toaNha.update({ where: { maToaNha }, data: { soTang } });
        }

        const existingRooms = await tx.phong.findMany({
            where: { maPhong: { in: rows.map(({ maPhong }) => maPhong) } },
            select: { maPhong: true, maToaNha: true, soSinhVienHienTai: true }
        });
        const existingByCode = new Map(existingRooms.map((room) => [room.maPhong, room]));

        for (const room of rows) {
            const existing = existingByCode.get(room.maPhong);
            if (existing && existing.maToaNha !== room.maToaNha) {
                throw new Error(`${room.maPhong} exists under a different building`);
            }
            if (existing && existing.soSinhVienHienTai > room.soSinhVienToiDa) {
                throw new Error(`${room.maPhong} has more residents than its configured capacity`);
            }

            const { amenities, isSmallRoom, ...roomData } = room;
            if (existing) {
                await tx.phong.update({ where: { maPhong: room.maPhong }, data: roomData });
            } else {
                await tx.phong.create({ data: roomData });
            }

            const desiredAmenities = isSmallRoom
                ? [...amenities, 'Phòng diện tích nhỏ']
                : amenities;
            for (const amenityName of desiredAmenities) {
                const ghiChu = amenityName === 'Phòng diện tích nhỏ'
                    ? 'Biến thể 04 (nhỏ) theo khung giá; phí 570.000 đồng/sinh viên/tháng.'
                    : undefined;
                const current = await tx.thietBiPhong.findFirst({
                    where: { maPhong: room.maPhong, tenThietBi: amenityName },
                    select: { maThietBi: true }
                });
                const data = {
                    soLuong: amenityName === 'Giường tầng' ? room.soSinhVienToiDa : 1,
                    ...(ghiChu ? { ghiChu } : {})
                };
                if (current) {
                    await tx.thietBiPhong.update({ where: { maThietBi: current.maThietBi }, data });
                } else {
                    await tx.thietBiPhong.create({
                        data: {
                            maThietBi: randomUUID(),
                            maPhong: room.maPhong,
                            tenThietBi: amenityName,
                            ...data
                        }
                    });
                }
            }
        }
    }, { maxWait: 10000, timeout: 120000 });

    const summary = Object.fromEntries(residentialBuildingIds.map((buildingId) => [
        buildingId,
        rows.filter((room) => room.maToaNha === buildingId).length
    ]));
    console.log(JSON.stringify({ createdOrUpdated: rows.length, roomsByBuilding: summary, roomlessBuildings: noDormBuildingIds }));
}

main()
    .catch((error) => {
        console.error('NCT_ROOM_SEED_FAILED', error.code || error.name, error.message);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
