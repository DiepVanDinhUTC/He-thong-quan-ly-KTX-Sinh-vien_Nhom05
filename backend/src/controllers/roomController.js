const prisma = require('../config/prisma');
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');
const { randomUUID } = require('crypto');
const { ROOM_TYPES, LEGACY_ROOM_TYPE_CODES, A4_ONLY_ROOM_TYPES } = require('../config/roomTypes');
const { GLOBAL_BUILDING_ROLES } = require('../config/roles');

const facilityStatuses = ['TOT', 'HU_HONG', 'DANG_BAO_TRI'];
const liveContractStatuses = ['ACTIVE', 'PENDING_PAYMENT'];
const NO_DORM_BUILDING_IDS = new Set(['A2', 'A5']);

const summarizeFacilities = (facilities) => {
    if (!facilities.length) return 'CHUA_CAP_NHAT';
    if (facilities.some((item) => item.trangThai === 'DANG_BAO_TRI')) return 'DANG_BAO_TRI';
    if (facilities.some((item) => item.trangThai === 'HU_HONG')) return 'CO_HU_HONG';
    return 'TOT';
};

const validFacilityInput = (body) => (
    typeof body.tenThietBi === 'string'
    && body.tenThietBi.trim().length > 0
    && body.tenThietBi.trim().length <= 120
    && Number.isInteger(Number(body.soLuong))
    && Number(body.soLuong) > 0
    && facilityStatuses.includes(body.trangThai)
    && (body.ghiChu === undefined || body.ghiChu === null || String(body.ghiChu).length <= 255)
);

const isDuplicateKeyError = (error) => error.code === 'P2002' || /duplicate key|2627|2601/i.test(error.message || '');

exports.getLocations = async (req, res) => {
    try {
        const buildingFilter = req.buildingScope === null ? undefined : { maToaNha: { in: req.buildingScope } };
        const locations = await prisma.khu.findMany({
            where: buildingFilter ? { toaNhas: { some: buildingFilter } } : undefined,
            include: {
                toaNhas: {
                    where: buildingFilter,
                    select: { maToaNha: true, tenToaNha: true, soTang: true },
                    orderBy: { tenToaNha: 'asc' }
                }
            },
            orderBy: { tenKhu: 'asc' }
        });
        const data = locations.map(({ maKhu, tenKhu, diaChi, toaNhas }) => ({ maKhu, tenKhu, diaChi, toaNhas }));
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách khu và tòa nhà.', error: error.message });
    }
};

const normalizeBuildingInput = (body = {}, includeCode = false) => {
    body = body || {};
    const maToaNha = String(body.maToaNha || '').trim();
    const maKhu = String(body.maKhu || '').trim();
    const tenToaNha = String(body.tenToaNha || '').trim();
    const soTang = Number(body.soTang);
    if ((includeCode && !/^[a-zA-Z0-9_-]{1,20}$/.test(maToaNha))
        || (includeCode && !maKhu)
        || !tenToaNha || tenToaNha.length > 120
        || !Number.isInteger(soTang) || soTang < 1 || soTang > 100) return null;
    return { ...(includeCode ? { maToaNha, maKhu } : {}), tenToaNha, soTang };
};

exports.createBuilding = async (req, res) => {
    const building = normalizeBuildingInput(req.body, true);
    if (!building) return res.status(400).json({ success: false, message: 'Mã, khu, tên tòa nhà hoặc số tầng không hợp lệ.' });

    try {
        const khu = await prisma.khu.findUnique({ where: { maKhu: building.maKhu }, select: { maKhu: true } });
        if (!khu) return res.status(404).json({ success: false, message: 'Không tìm thấy khu được chọn.' });

        const isGlobalManager = GLOBAL_BUILDING_ROLES.has(req.user.role);
        if (!isGlobalManager) {
            const assignedInKhu = await prisma.userBuildingAccess.findFirst({
                where: {
                    userId: req.user.id,
                    toaNha: { is: { maKhu: building.maKhu } }
                },
                select: { maToaNha: true }
            });
            if (!assignedInKhu) return res.status(403).json({ success: false, message: 'Chỉ có thể thêm tòa nhà trong khu được phân công.' });
        }

        const created = await prisma.$transaction(async (tx) => {
            const toaNha = await tx.toaNha.create({ data: building });
            if (!isGlobalManager) {
                await tx.userBuildingAccess.create({ data: { userId: req.user.id, maToaNha: toaNha.maToaNha } });
            }
            return toaNha;
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, data: created, message: 'Đã thêm tòa nhà.' });
    } catch (error) {
        if (isDuplicateKeyError(error)) return res.status(409).json({ success: false, message: 'Mã tòa nhà hoặc tên tòa nhà trong khu này đã tồn tại.' });
        return res.status(500).json({ success: false, message: 'Không thể thêm tòa nhà.', error: error.message });
    }
};

exports.updateBuilding = async (req, res) => {
    const building = normalizeBuildingInput(req.body);
    if (!building) return res.status(400).json({ success: false, message: 'Tên tòa nhà hoặc số tầng không hợp lệ.' });
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.toaNha.findUnique({ where: { maToaNha: req.params.maToaNha }, select: { maToaNha: true } });
            if (!current) throw Object.assign(new Error('Không tìm thấy tòa nhà.'), { status: 404 });
            const floors = await tx.phong.aggregate({ where: { maToaNha: current.maToaNha }, _max: { tang: true } });
            if (floors._max.tang && building.soTang < floors._max.tang) {
                throw Object.assign(new Error(`Số tầng không thể nhỏ hơn tầng cao nhất đang có (${floors._max.tang}).`), { status: 409 });
            }
            return tx.toaNha.update({
                where: { maToaNha: current.maToaNha },
                data: building,
                select: { maToaNha: true, maKhu: true, tenToaNha: true, soTang: true }
            });
        }, { isolationLevel: 'Serializable' });
        return res.status(200).json({ success: true, data: updated, message: 'Đã cập nhật tòa nhà.' });
    } catch (error) {
        if (error.status) return res.status(error.status).json({ success: false, message: error.message });
        if (error.code === 'P2025') return res.status(404).json({ success: false, message: 'Không tìm thấy tòa nhà.' });
        if (isDuplicateKeyError(error)) return res.status(409).json({ success: false, message: 'Tên tòa nhà đã tồn tại trong khu này.' });
        return res.status(500).json({ success: false, message: 'Không thể cập nhật tòa nhà.', error: error.message });
    }
};

exports.deleteBuilding = async (req, res) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const building = await tx.toaNha.findUnique({
                where: { maToaNha: req.params.maToaNha },
                include: { _count: { select: { phongs: true, securityAccessLogs: true, securityViolations: true, medicalIncidents: true } } }
            });
            if (!building) return { status: 404, message: 'Không tìm thấy tòa nhà.' };
            const hasHistory = Object.values(building._count).some((count) => count > 0);
            if (hasHistory) return { status: 409, message: 'Không thể xóa tòa nhà đã có phòng hoặc lịch sử hoạt động.' };

            const assignments = await tx.userBuildingAccess.findMany({ where: { maToaNha: building.maToaNha }, select: { userId: true } });
            const isAdmin = req.user.role === 'ADMIN';
            if (!isAdmin && assignments.some(({ userId }) => userId !== req.user.id)) {
                return { status: 409, message: 'Tòa nhà đang được phân công cho nhân viên khác. Hãy gỡ phân công trước khi xóa.' };
            }
            await tx.userBuildingAccess.deleteMany({ where: { maToaNha: building.maToaNha } });
            await tx.toaNha.delete({ where: { maToaNha: building.maToaNha } });
            return { status: 200, message: 'Đã xóa tòa nhà trống.' };
        }, { isolationLevel: 'Serializable' });
        return res.status(result.status).json({ success: result.status === 200, message: result.message });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể xóa tòa nhà.', error: error.message });
    }
};

exports.getRooms = async (req, res) => {
    try {
        const rooms = await prisma.phong.findMany({
            where: req.buildingScope === null ? undefined : { maToaNha: { in: req.buildingScope } },
            include: {
                toaNha: { include: { khu: true } },
                thietBis: true,
                hopDongs: {
                    where: { trangThai: { in: liveContractStatuses } },
                    include: { sinhVien: { select: { hoTen: true, lop: true, phone: true } } }
                }
            },
            orderBy: { soPhong: 'asc' }
        });
        const data = rooms.map((room) => {
            const facilities = room.thietBis.map((item) => ({
                maThietBi: item.maThietBi,
                tenThietBi: item.tenThietBi,
                soLuong: item.soLuong,
                trangThai: item.trangThai,
                ghiChu: item.ghiChu,
                ngayCapNhat: item.ngayCapNhat
            }));
            const members = room.hopDongs.map((contract) => ({
                maHopDong: contract.maHopDong,
                maSinhVien: contract.maSinhVien,
                hoTen: contract.sinhVien.hoTen,
                lop: contract.sinhVien.lop,
                phone: contract.sinhVien.phone,
                trangThaiNoiTru: deriveStudentHousingStatus([{ trangThai: contract.trangThai }]),
                trangThaiHopDong: contract.trangThai
            }));
            return {
                maPhong: room.maPhong,
                soPhong: room.soPhong,
                loaiPhong: room.loaiPhong,
                soSinhVienToiDa: room.soSinhVienToiDa,
                soSinhVienHienTai: room.soSinhVienHienTai,
                phiNoiTruThang: room.phiNoiTruThang,
                maKhu: room.toaNha?.khu?.maKhu || null,
                tenKhu: room.toaNha?.khu?.tenKhu || null,
                diaChiKhu: room.toaNha?.khu?.diaChi || null,
                maToaNha: room.maToaNha,
                tenToaNha: room.toaNha?.tenToaNha || null,
                tang: room.tang,
                thietBis: facilities,
                thanhVien: members,
                choConTrong: Math.max(0, room.soSinhVienToiDa - room.soSinhVienHienTai),
                trangThaiSucChua: room.soSinhVienHienTai >= room.soSinhVienToiDa
                    ? 'DAY'
                    : room.soSinhVienHienTai === 0 ? 'TRONG' : 'CON_CHO',
                trangThaiCSVC: summarizeFacilities(facilities)
            };
        });
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải sơ đồ phòng.', error: error.message });
    }
};

const normalizeRoomInput = (body) => {
    const maPhong = String(body.maPhong || '').trim();
    const soPhong = String(body.soPhong || '').trim();
    const loaiPhong = String(body.loaiPhong || '').trim();
    const capacity = Number(body.soSinhVienToiDa);
    const monthlyFee = body.phiNoiTruThang === '' || body.phiNoiTruThang === null || body.phiNoiTruThang === undefined
        ? null
        : Number(body.phiNoiTruThang);
    const maToaNha = body.maToaNha ? String(body.maToaNha).trim() : null;
    const tang = body.tang === '' || body.tang === null || body.tang === undefined ? null : Number(body.tang);

    if (!maPhong || maPhong.length > 100 || !soPhong || soPhong.length > 100
        || (!Object.hasOwn(ROOM_TYPES, loaiPhong) && !LEGACY_ROOM_TYPE_CODES.includes(loaiPhong))
        || !Number.isInteger(capacity) || capacity < 1 || capacity > 200
        || (ROOM_TYPES[loaiPhong] && !ROOM_TYPES[loaiPhong].capacities.includes(capacity))
        || (monthlyFee !== null && (!Number.isInteger(monthlyFee) || monthlyFee < 0))
        || (maToaNha && (!Number.isInteger(tang) || tang < 1))
        || (!maToaNha && tang !== null)) {
        return null;
    }
    return { maPhong, soPhong, loaiPhong, capacity, monthlyFee, maToaNha, tang };
};

const validateBuildingFloor = async (room) => {
    if (!room.maToaNha) return true;
    const building = await prisma.toaNha.findUnique({
        where: { maToaNha: room.maToaNha },
        select: { soTang: true, maKhu: true }
    });
    if (!building || building.soTang < 1 || room.tang > building.soTang) return false;
    if (NO_DORM_BUILDING_IDS.has(room.maToaNha)) return false;
    if (A4_ONLY_ROOM_TYPES.has(room.loaiPhong)
        && (room.maToaNha !== 'A4' || building.maKhu !== 'KHU_NCT')) return false;
    return true;
};

exports.createRoom = async (req, res) => {
    const room = normalizeRoomInput(req.body);
    if (!room) return res.status(400).json({ success: false, message: 'Thông tin phòng không hợp lệ. Hãy kiểm tra mã, số phòng, loại phòng, sức chứa và vị trí.' });
    try {
        if (!(await validateBuildingFloor(room))) {
            return res.status(400).json({ success: false, message: 'Tòa nhà không tồn tại, không có phòng nội trú hoặc tầng/loại phòng không phù hợp.' });
        }
        const created = await prisma.phong.create({
            data: {
                maPhong: room.maPhong,
                soPhong: room.soPhong,
                loaiPhong: room.loaiPhong,
                soSinhVienToiDa: room.capacity,
                soSinhVienHienTai: 0,
                phiNoiTruThang: room.monthlyFee,
                maToaNha: room.maToaNha,
                tang: room.tang
            }
        });
        return res.status(201).json({ success: true, data: created, message: 'Đã thêm phòng mới.' });
    } catch (error) {
        if (isDuplicateKeyError(error)) return res.status(409).json({ success: false, message: 'Mã phòng đã tồn tại.' });
        return res.status(500).json({ success: false, message: 'Không thể thêm phòng.', error: error.message });
    }
};

exports.updateRoom = async (req, res) => {
    const room = normalizeRoomInput({ ...req.body, maPhong: req.params.maPhong });
    if (!room) return res.status(400).json({ success: false, message: 'Thông tin phòng không hợp lệ. Hãy kiểm tra số phòng, loại phòng, sức chứa và vị trí.' });
    try {
        const current = await prisma.phong.findUnique({ where: { maPhong: req.params.maPhong } });
        if (!current) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng.' });
        if (room.capacity < current.soSinhVienHienTai) {
            return res.status(409).json({ success: false, message: `Sức chứa mới không thể thấp hơn ${current.soSinhVienHienTai} sinh viên hiện tại.` });
        }
        if (!(await validateBuildingFloor(room))) {
            return res.status(400).json({ success: false, message: 'Tòa nhà không tồn tại, không có phòng nội trú hoặc tầng/loại phòng không phù hợp.' });
        }
        const updated = await prisma.phong.update({
            where: { maPhong: req.params.maPhong },
            data: { soPhong: room.soPhong, loaiPhong: room.loaiPhong, soSinhVienToiDa: room.capacity, phiNoiTruThang: room.monthlyFee, maToaNha: room.maToaNha, tang: room.tang }
        });
        return res.status(200).json({ success: true, data: updated, message: 'Đã cập nhật phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể cập nhật phòng.', error: error.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const room = await tx.phong.findUnique({ where: { maPhong: req.params.maPhong } });
            if (!room) return { status: 404, message: 'Không tìm thấy phòng.' };
            const contract = await tx.hopDong.findFirst({ where: { maPhong: req.params.maPhong }, select: { maHopDong: true } });
            if (contract) return { status: 409, message: 'Không thể xóa phòng đã có hợp đồng. Hãy giữ hồ sơ để bảo toàn lịch sử lưu trú.' };
            const application = await tx.dangKyKTX.findFirst({ where: { maPhongYeuCau: req.params.maPhong }, select: { maDangKy: true } });
            if (application) return { status: 409, message: 'Không thể xóa phòng đang được chọn trong đơn đăng ký nội trú.' };
            await tx.thietBiPhong.deleteMany({ where: { maPhong: req.params.maPhong } });
            await tx.phong.delete({ where: { maPhong: req.params.maPhong } });
            return { status: 200, message: 'Đã xóa phòng và danh sách thiết bị đi kèm.' };
        }, { isolationLevel: 'Serializable' });
        return res.status(result.status).json({ success: result.status === 200, message: result.message });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể xóa phòng.', error: error.message });
    }
};

exports.createFacility = async (req, res) => {
    if (!validFacilityInput(req.body)) return res.status(400).json({ success: false, message: 'Tên, số lượng hoặc trạng thái thiết bị không hợp lệ.' });
    try {
        const room = await prisma.phong.findUnique({ where: { maPhong: req.params.maPhong }, select: { maPhong: true } });
        if (!room) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng.' });
        const data = await prisma.thietBiPhong.create({
            data: {
                maThietBi: randomUUID(),
                maPhong: room.maPhong,
                tenThietBi: req.body.tenThietBi.trim(),
                soLuong: Number(req.body.soLuong),
                trangThai: req.body.trangThai,
                ghiChu: req.body.ghiChu?.trim() || null
            }
        });
        return res.status(201).json({ success: true, data, message: 'Đã thêm thiết bị vào phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể thêm thiết bị.', error: error.message });
    }
};

exports.updateFacility = async (req, res) => {
    if (!validFacilityInput(req.body)) return res.status(400).json({ success: false, message: 'Tên, số lượng hoặc trạng thái thiết bị không hợp lệ.' });
    try {
        const facility = await prisma.thietBiPhong.findFirst({ where: { maThietBi: req.params.id, maPhong: req.params.maPhong }, select: { maThietBi: true } });
        if (!facility) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị trong phòng.' });
        const data = await prisma.thietBiPhong.update({
            where: { maThietBi: facility.maThietBi },
            data: { tenThietBi: req.body.tenThietBi.trim(), soLuong: Number(req.body.soLuong), trangThai: req.body.trangThai, ghiChu: req.body.ghiChu?.trim() || null }
        });
        return res.status(200).json({ success: true, data, message: 'Đã cập nhật thiết bị.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thiết bị.', error: error.message });
    }
};

exports.deleteFacility = async (req, res) => {
    try {
        const result = await prisma.thietBiPhong.deleteMany({ where: { maThietBi: req.params.id, maPhong: req.params.maPhong } });
        if (!result.count) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị trong phòng.' });
        return res.status(200).json({ success: true, message: 'Đã xóa thiết bị khỏi danh sách phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể xóa thiết bị.', error: error.message });
    }
};

exports.moveRoomMember = async (req, res) => {
    const { maPhong, maHopDong } = req.params;
    const maPhongMoi = String(req.body.maPhongMoi || '').trim();
    if (!maPhongMoi) return res.status(400).json({ success: false, message: 'Hãy chọn phòng muốn chuyển đến.' });
    try {
        await prisma.$transaction(async (tx) => {
            const contract = await tx.hopDong.findFirst({
                where: { maHopDong, maPhong, trangThai: { in: liveContractStatuses } },
                select: { maHopDong: true, maPhong: true }
            });
            if (!contract) throw Object.assign(new Error('Không tìm thấy hợp đồng lưu trú đang hiệu lực trong phòng này.'), { status: 404 });
            if (maPhongMoi === maPhong) throw Object.assign(new Error('Sinh viên đang ở phòng này.'), { status: 400 });
            const [destination, source] = await Promise.all([
                tx.phong.findUnique({ where: { maPhong: maPhongMoi } }),
                tx.phong.findUnique({ where: { maPhong } })
            ]);
            if (!destination) throw Object.assign(new Error('Không tìm thấy phòng muốn chuyển đến.'), { status: 404 });
            if (destination.loaiPhong !== source?.loaiPhong) throw Object.assign(new Error('Chỉ có thể chuyển sinh viên sang phòng cùng loại.'), { status: 409 });
            if (destination.soSinhVienHienTai >= destination.soSinhVienToiDa) throw Object.assign(new Error('Phòng được chọn đã đủ sức chứa.'), { status: 409 });
            await tx.phong.update({ where: { maPhong: maPhongMoi }, data: { soSinhVienHienTai: { increment: 1 } } });
            await tx.phong.updateMany({ where: { maPhong, soSinhVienHienTai: { gt: 0 } }, data: { soSinhVienHienTai: { decrement: 1 } } });
            await tx.hopDong.update({ where: { maHopDong }, data: { maPhong: maPhongMoi } });
        }, { isolationLevel: 'Serializable' });
        return res.status(200).json({ success: true, message: 'Đã chuyển sinh viên sang phòng mới.' });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể chuyển phòng.' });
    }
};

exports.removeRoomMember = async (req, res) => {
    const { maPhong, maHopDong } = req.params;
    try {
        await prisma.$transaction(async (tx) => {
            const contract = await tx.hopDong.findFirst({
                where: { maHopDong, maPhong, trangThai: { in: liveContractStatuses } },
                select: { maHopDong: true }
            });
            if (!contract) throw Object.assign(new Error('Không tìm thấy hợp đồng lưu trú đang hiệu lực trong phòng này.'), { status: 404 });
            await tx.hopDong.update({ where: { maHopDong }, data: { trangThai: 'CANCELLED' } });
            await tx.phong.updateMany({ where: { maPhong, soSinhVienHienTai: { gt: 0 } }, data: { soSinhVienHienTai: { decrement: 1 } } });
        }, { isolationLevel: 'Serializable' });
        return res.status(200).json({ success: true, message: 'Đã kết thúc hợp đồng và xóa sinh viên khỏi phòng. Lịch sử hợp đồng được giữ lại.' });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể xóa sinh viên khỏi phòng.' });
    }
};
