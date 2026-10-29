const { occupancyRelations, getRoomOccupancy } = require('./roomOccupancy');

const refreshMilitaryRoomCounts = async (tx, roomIds, now = new Date()) => {
    const rooms = await tx.phong.findMany({
        where: { maPhong: { in: [...new Set(roomIds)] } }, include: occupancyRelations
    });
    for (const room of rooms) {
        await tx.phong.update({ where: { maPhong: room.maPhong }, data: { soSinhVienHienTai: getRoomOccupancy(room, now).soSinhVienHienTai } });
    }
};

// Called inside the allocator's transaction too: only military places are released.
// The student's regular contract and its reserved place are never modified.
const endExpiredMilitaryStays = async (tx, now = new Date()) => {
    const expired = await tx.militaryRoomAssignment.findMany({
        where: { status: 'ACTIVE', endsAt: { lte: now } },
        select: { id: true, maPhong: true, endsAt: true }
    });
    if (!expired.length) return 0;
    for (const assignment of expired) {
        await tx.militaryRoomAssignment.updateMany({
            where: { id: assignment.id, status: 'ACTIVE', endsAt: { lte: now } },
            data: { status: 'ENDED', endedAt: assignment.endsAt }
        });
    }
    await refreshMilitaryRoomCounts(tx, expired.map(({ maPhong }) => maPhong), now);
    return expired.length;
};

const expireMilitaryStays = (db, now = new Date()) => db.$transaction(
    (tx) => endExpiredMilitaryStays(tx, now), { isolationLevel: 'Serializable' }
);

module.exports = { endExpiredMilitaryStays, expireMilitaryStays, refreshMilitaryRoomCounts };
