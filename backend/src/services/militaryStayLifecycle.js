const { occupancyRelations, getRoomOccupancy } = require('./roomOccupancy');

// Restore only accounts promoted from STUDENT, after their last current or
// upcoming military assignment ends. Accounts created as military remain so.
const restoreStudentRoles = async (tx, studentIds, now = new Date(), completedAt = now) => {
    if (!studentIds.length) return 0;
    const result = await tx.user.updateMany({
        where: {
            role: 'MILITARY_STUDENT', gdqpPreviousRole: 'STUDENT', gdqpRoleRestoredAt: null,
            gdqpRoleAssignedAt: { lte: completedAt },
            sinhVien: { is: { maSV: { in: [...new Set(studentIds)] }, militaryRoomAssignments: { none: { status: 'ACTIVE', endsAt: { gt: now } } } } }
        },
        data: { role: 'STUDENT', gdqpRoleRestoredAt: now }
    });
    return result.count;
};
const restoreStudentRole = (tx, maSinhVien, now = new Date(), completedAt = now) => restoreStudentRoles(tx, [maSinhVien], now, completedAt);

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
        select: { id: true, maSinhVien: true, maPhong: true, endsAt: true }
    });
    if (!expired.length) return 0;
    const assignmentsByEnd = new Map();
    for (const assignment of expired) {
        const key = new Date(assignment.endsAt).getTime();
        if (!assignmentsByEnd.has(key)) assignmentsByEnd.set(key, { ids: [], studentIds: [] });
        assignmentsByEnd.get(key).ids.push(assignment.id);
        assignmentsByEnd.get(key).studentIds.push(assignment.maSinhVien);
    }
    for (const [endsAt, { ids, studentIds }] of assignmentsByEnd) {
        await tx.militaryRoomAssignment.updateMany({
            where: { id: { in: ids }, status: 'ACTIVE', endsAt: { lte: now } },
            data: { status: 'ENDED', endedAt: new Date(endsAt) }
        });
        await restoreStudentRoles(tx, studentIds, now, new Date(endsAt));
    }
    await refreshMilitaryRoomCounts(tx, expired.map(({ maPhong }) => maPhong), now);
    return expired.length;
};

const expireMilitaryStays = (db, now = new Date()) => db.$transaction(
    (tx) => endExpiredMilitaryStays(tx, now), { isolationLevel: 'Serializable' }
);

module.exports = { endExpiredMilitaryStays, expireMilitaryStays, refreshMilitaryRoomCounts, restoreStudentRole };
