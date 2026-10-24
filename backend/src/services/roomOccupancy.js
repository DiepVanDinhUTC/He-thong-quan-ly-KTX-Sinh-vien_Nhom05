const LIVE_CONTRACT_STATUSES = ['ACTIVE', 'PENDING_PAYMENT'];
const memberStudentSelect = { maSV: true, hoTen: true, lop: true, phone: true, nienKhoa: true };
const occupancyRelations = {
    hopDongs: { where: { trangThai: { in: LIVE_CONTRACT_STATUSES } }, select: { maHopDong: true, maSinhVien: true, trangThai: true } },
    militaryRoomAssignments: { where: { status: 'ACTIVE' }, select: { id: true, maSinhVien: true, status: true } }
};
const roomMemberRelations = {
    hopDongs: { where: { trangThai: { in: LIVE_CONTRACT_STATUSES } }, include: { sinhVien: { select: memberStudentSelect } } },
    militaryRoomAssignments: { where: { status: 'ACTIVE' }, include: { sinhVien: { select: memberStudentSelect } } }
};

const getRoomOccupancy = (room) => {
    const members = new Map();
    for (const contract of room.hopDongs || []) {
        if (!LIVE_CONTRACT_STATUSES.includes(contract.trangThai)) continue;
        const studentId = contract.maSinhVien || contract.sinhVien?.maSV;
        const key = studentId || `contract:${contract.maHopDong}`;
        const existing = members.get(key);
        if (existing && (existing.trangThaiHopDong === 'ACTIVE' || contract.trangThai !== 'ACTIVE')) continue;
        members.set(key, {
            id: `contract:${contract.maHopDong}`, source: 'CONTRACT', maHopDong: contract.maHopDong,
            maSinhVien: studentId, maSV: studentId,
            hoTen: contract.sinhVien?.hoTen || '', lop: contract.sinhVien?.lop || null,
            phone: contract.sinhVien?.phone || null, nienKhoa: contract.sinhVien?.nienKhoa || null,
            trangThaiHopDong: contract.trangThai,
            trangThaiNoiTru: contract.trangThai === 'ACTIVE' ? 'DANG_O' : 'CHO_THANH_TOAN'
        });
    }
    for (const assignment of room.militaryRoomAssignments || []) {
        if (assignment.status !== 'ACTIVE') continue;
        const studentId = assignment.maSinhVien || assignment.sinhVien?.maSV;
        const key = studentId || `military:${assignment.id}`;
        const existing = members.get(key);
        members.set(key, {
            ...existing, id: `military:${assignment.id}`, source: 'MILITARY', maPhanPhong: assignment.id,
            maHopDong: existing?.maHopDong || null, maSinhVien: studentId, maSV: studentId,
            hoTen: assignment.sinhVien?.hoTen || existing?.hoTen || '',
            lop: assignment.sinhVien?.lop || existing?.lop || null,
            phone: assignment.sinhVien?.phone || existing?.phone || null,
            nienKhoa: assignment.sinhVien?.nienKhoa || existing?.nienKhoa || null,
            trangThaiHopDong: existing?.trangThaiHopDong || null, trangThaiNoiTru: 'DANG_O'
        });
    }
    const thanhVien = [...members.values()].sort((left, right) => left.hoTen.localeCompare(right.hoTen, 'vi') || String(left.maSinhVien).localeCompare(String(right.maSinhVien)));
    const count = thanhVien.length;
    const reserved = thanhVien.filter((member) => member.trangThaiNoiTru === 'CHO_THANH_TOAN').length;
    return {
        thanhVien, soSinhVienHienTai: count, soSinhVienDangO: count - reserved, soChoGiuCho: reserved,
        soHocVienQuanSu: thanhVien.filter((member) => member.source === 'MILITARY').length,
        choConTrong: Math.max(0, room.soSinhVienToiDa - count),
        trangThaiSucChua: count >= room.soSinhVienToiDa ? 'DAY' : count === 0 ? 'TRONG' : 'CON_CHO'
    };
};

// Summary endpoints return counts without exposing student or placement records.
const presentRoomOccupancy = (room) => {
    const { hopDongs, militaryRoomAssignments, ...fields } = room;
    const { thanhVien, ...occupancy } = getRoomOccupancy(room);
    return { ...fields, ...occupancy };
};

module.exports = { LIVE_CONTRACT_STATUSES, occupancyRelations, roomMemberRelations, getRoomOccupancy, presentRoomOccupancy };
