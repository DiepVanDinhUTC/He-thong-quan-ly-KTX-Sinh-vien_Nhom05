const prisma = require('../config/prisma');
const { occupancyRelations, getRoomOccupancy } = require('./roomOccupancy');
const { resolveMilitaryStayPeriod } = require('./militaryStay');
const { endExpiredMilitaryStays } = require('./militaryStayLifecycle');
const { isA1MilitaryRoom } = require('../config/a1Rooms');

const militaryStudentWhere = { laHocVienQuanSu: true };

const sortRooms = (left, right) => left.tang - right.tang || left.soPhong.localeCompare(right.soPhong, 'vi');

const selectA1MilitaryRooms = (rooms) => rooms.filter(isA1MilitaryRoom).sort(sortRooms);

const balanceEmptyRoomsByGender = ({ targetRooms, roomById, pendingStudents }) => {
    const needs = {
        female: pendingStudents.filter((student) => student.gioiTinh === false).length,
        male: pendingStudents.filter((student) => student.gioiTinh === true).length
    };
    const fixedRooms = targetRooms
        .map((room) => roomById.get(room.maPhong))
        .filter((room) => room.eligible && (room.gender === false || room.gender === true));
    const openRooms = targetRooms
        .map((room) => roomById.get(room.maPhong))
        .filter((room) => room.eligible && room.gender === null);
    const fixedCapacity = { false: 0, true: 0 };
    const fixedRoomCount = { false: 0, true: 0 };
    const fixedFloorCount = new Map();

    for (const room of fixedRooms) {
        const gender = String(room.gender);
        fixedCapacity[gender] += Math.max(0, room.soSinhVienToiDa - room.occupancy);
        fixedRoomCount[gender] += 1;
        const floor = fixedFloorCount.get(room.tang) || { false: 0, true: 0 };
        floor[gender] += 1;
        fixedFloorCount.set(room.tang, floor);
    }

    let best = null;
    const combinations = 2 ** openRooms.length;
    for (let mask = 0; mask < combinations; mask += 1) {
        const capacity = { ...fixedCapacity };
        const roomCount = { ...fixedRoomCount };
        const floorCount = new Map([...fixedFloorCount.entries()].map(([floor, count]) => [floor, { ...count }]));
        for (let index = 0; index < openRooms.length; index += 1) {
            const room = openRooms[index];
            const gender = String(Boolean(mask & (1 << index)));
            capacity[gender] += room.soSinhVienToiDa;
            roomCount[gender] += 1;
            const floor = floorCount.get(room.tang) || { false: 0, true: 0 };
            floor[gender] += 1;
            floorCount.set(room.tang, floor);
        }
        const unassigned = Math.max(0, needs.female - capacity.false) + Math.max(0, needs.male - capacity.true);
        const floorImbalance = [...floorCount.values()].reduce((sum, count) => sum + Math.abs(count.false - count.true), 0);
        const roomImbalance = Math.abs(roomCount.false - roomCount.true);
        const capacityImbalance = Math.abs(capacity.false - capacity.true);
        const score = [unassigned, floorImbalance, roomImbalance, capacityImbalance, mask];
        if (!best || score.some((value, index) => value < best.score[index]
            && score.slice(0, index).every((previous, previousIndex) => previous === best.score[previousIndex]))) {
            best = { score, mask };
        }
    }

    if (!best) return;
    for (let index = 0; index < openRooms.length; index += 1) {
        roomById.get(openRooms[index].maPhong).gender = Boolean(best.mask & (1 << index));
    }
};

const createError = (message, status = 409) => Object.assign(new Error(message), { status });

const assignMilitaryStudentsToA1 = async ({ db = prisma, assignedById, startsAt, batchCode, studentIds, now = new Date() }) => {
    if (!assignedById) throw createError('Thiếu tài khoản cán bộ thực hiện xếp phòng.', 400);
    const period = resolveMilitaryStayPeriod({ startsAt, batchCode }, now);
    const explicitPeriod = startsAt != null;

    return db.$transaction(async (tx) => {
        await endExpiredMilitaryStays(tx, now);
        const [students, rooms, activeAssignments] = await Promise.all([
            tx.sinhVien.findMany({
                where: { ...militaryStudentWhere, ...(studentIds ? { maSV: { in: studentIds } } : {}) },
                orderBy: { maSV: 'asc' },
                select: { maSV: true, gioiTinh: true, militaryRoomAssignments: { select: { id: true, startsAt: true, endsAt: true } } }
            }),
            tx.phong.findMany({
                where: { maToaNha: 'A1' },
                orderBy: [{ tang: 'asc' }, { soPhong: 'asc' }],
                include: occupancyRelations
            }),
            tx.militaryRoomAssignment.findMany({
                where: { status: 'ACTIVE', sinhVien: militaryStudentWhere },
                select: { id: true, maSinhVien: true, maPhong: true, startsAt: true, endsAt: true, batchCode: true, sinhVien: { select: { gioiTinh: true } } }
            })
        ]);

        if (!rooms.length) throw createError('Chưa có phòng của tòa A1. Hãy tạo dữ liệu phòng trước khi xếp tự động.', 409);

        const targetRooms = selectA1MilitaryRooms(rooms);
        const targetRoomIds = new Set(targetRooms.map((room) => room.maPhong));
        const roomById = new Map(rooms.map((room) => [room.maPhong, { ...room, occupancy: getRoomOccupancy(room, now).soSinhVienHienTai, militaryCount: 0, gender: null, eligible: false }]));
        for (const room of rooms) {
            const count = roomById.get(room.maPhong).occupancy;
            if (count !== room.soSinhVienHienTai) await tx.phong.update({ where: { maPhong: room.maPhong }, data: { soSinhVienHienTai: count } });
        }
        const assignmentsByRoom = new Map();

        for (const assignment of activeAssignments) {
            const list = assignmentsByRoom.get(assignment.maPhong) || [];
            list.push(assignment);
            assignmentsByRoom.set(assignment.maPhong, list);
            const room = roomById.get(assignment.maPhong);
            if (room) room.militaryCount += 1;
        }

        const invalid = [];
        const validAssignments = [];
        for (const [maPhong, assignments] of assignmentsByRoom) {
            const room = roomById.get(maPhong);
            const genders = new Set(assignments.map((assignment) => assignment.sinhVien.gioiTinh));
            const roomIsTarget = targetRoomIds.has(maPhong);
            const hasNonMilitaryOccupants = room && room.occupancy - assignments.length > 0;
            const overCapacity = room && assignments.length > room.soSinhVienToiDa;
            if (!roomIsTarget || hasNonMilitaryOccupants || overCapacity || genders.size !== 1) {
                invalid.push(...assignments);
                continue;
            }
            room.gender = assignments[0].sinhVien.gioiTinh;
            room.militaryCount = assignments.length;
            room.eligible = true;
            validAssignments.push(...assignments);
        }

        if (invalid.length) {
            const endedAt = new Date();
            const ended = await tx.militaryRoomAssignment.updateMany({
                where: { id: { in: invalid.map((assignment) => assignment.id) }, status: 'ACTIVE' },
                data: { status: 'ENDED', endedAt }
            });
            if (ended.count !== invalid.length) throw createError('Phân phòng vừa thay đổi đồng thời. Hãy chạy tự xếp lại.');
            const decrements = new Map();
            for (const assignment of invalid) decrements.set(assignment.maPhong, (decrements.get(assignment.maPhong) || 0) + 1);
            for (const [maPhong, count] of decrements) {
                const result = await tx.phong.updateMany({
                    where: { maPhong, soSinhVienHienTai: { gte: count } },
                    data: { soSinhVienHienTai: { decrement: count } }
                });
                if (!result.count) throw createError(`Số người hiện tại của phòng ${maPhong} không khớp với danh sách phân phòng.`);
                if (roomById.has(maPhong)) roomById.get(maPhong).occupancy -= count;
            }
        }

        for (const room of roomById.values()) {
            room.militaryCount = validAssignments.filter((assignment) => assignment.maPhong === room.maPhong).length;
        }

        for (const room of targetRooms) {
            const state = roomById.get(room.maPhong);
            const nonMilitaryCount = state.occupancy - state.militaryCount;
            state.eligible = nonMilitaryCount === 0 && state.occupancy <= state.soSinhVienToiDa;
            if (!state.eligible) state.gender = null;
        }

        const assignedByGender = new Map([[false, 0], [true, 0]]);
        for (const assignment of validAssignments) {
            const gender = assignment.sinhVien.gioiTinh;
            assignedByGender.set(gender, assignedByGender.get(gender) + 1);
        }

        const alreadyAssigned = new Set(validAssignments.map((assignment) => assignment.maSinhVien));
        const reassignedPeriods = new Map(invalid.map((assignment) => [assignment.maSinhVien, {
            startsAt: assignment.startsAt, endsAt: assignment.endsAt, batchCode: assignment.batchCode
        }]));
        // A cron rerun must not start a new two-week stay for a completed cohort.
        // A new period is selected explicitly by the military officer.
        const pendingStudents = students.filter((student) => !alreadyAssigned.has(student.maSV)
            && (reassignedPeriods.has(student.maSV) || !student.militaryRoomAssignments.length || (explicitPeriod
                && student.militaryRoomAssignments.every((item) => new Date(item.endsAt) <= period.startsAt))));
        balanceEmptyRoomsByGender({ targetRooms, roomById, pendingStudents });
        const unassignedStudents = [];
        let assigned = 0;
        for (const student of pendingStudents) {
            const candidates = targetRooms
                .map((room) => roomById.get(room.maPhong))
                .filter((room) => room.eligible
                    && room.occupancy < room.soSinhVienToiDa
                    && (room.gender === null || room.gender === student.gioiTinh))
                .sort((left, right) => {
                    const floorLoad = (room) => targetRooms
                        .filter((candidate) => candidate.tang === room.tang)
                        .map((candidate) => roomById.get(candidate.maPhong))
                        .filter((candidate) => candidate.gender === student.gioiTinh)
                        .reduce((sum, candidate) => sum + candidate.militaryCount, 0);
                    return floorLoad(left) - floorLoad(right)
                        || left.militaryCount / left.soSinhVienToiDa - right.militaryCount / right.soSinhVienToiDa
                        || left.tang - right.tang
                        || left.soPhong.localeCompare(right.soPhong, 'vi');
                });
            const destination = candidates[0];
            if (!destination) {
                unassignedStudents.push(student);
                continue;
            }

            const updatedRoom = await tx.phong.updateMany({
                where: {
                    maPhong: destination.maPhong,
                    soSinhVienHienTai: { lt: destination.soSinhVienToiDa }
                },
                data: { soSinhVienHienTai: { increment: 1 } }
            });
            if (!updatedRoom.count) throw createError(`Phòng ${destination.soPhong} vừa hết chỗ. Hãy chạy tự xếp lại.`);
            await tx.militaryRoomAssignment.create({
                data: { maSinhVien: student.maSV, maPhong: destination.maPhong, assignedById, ...(reassignedPeriods.get(student.maSV) || period) }
            });
            destination.occupancy += 1;
            destination.militaryCount += 1;
            destination.gender = student.gioiTinh;
            assignedByGender.set(student.gioiTinh, assignedByGender.get(student.gioiTinh) + 1);
            assigned += 1;
        }

        return {
            studentCount: students.length,
            assigned,
            alreadyAssigned: validAssignments.length,
            unassignedCount: unassignedStudents.length,
            completedCount: students.length - pendingStudents.length - students.filter((student) => alreadyAssigned.has(student.maSV)).length,
            period,
            unassignedByGender: {
                female: unassignedStudents.filter((student) => student.gioiTinh === false).length,
                male: unassignedStudents.filter((student) => student.gioiTinh === true).length
            },
            roomCount: targetRooms.length,
            roomsByFloor: [...new Set(targetRooms.map((room) => room.tang))]
                .sort((a, b) => a - b)
                .map((floor) => ({ floor, selected: targetRooms.filter((room) => room.tang === floor).length })),
            assignedByGender: { female: assignedByGender.get(false), male: assignedByGender.get(true) }
        };
    }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 120000 });
};

module.exports = { assignMilitaryStudentsToA1, selectA1MilitaryRooms };
