const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { deriveStudentHousingStatus } = require('../services/studentHousingStatus');
const { randomUUID } = require('crypto');

const facilityStatuses = ['TOT', 'HU_HONG', 'DANG_BAO_TRI'];

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

exports.getLocations = async (_req, res) => {
    try {
        const rows = await prisma.$queryRaw`SELECT
            c.maCoSo, c.tenCoSo, c.diaChi,
            b.maToaNha, b.tenToaNha, b.soTang
            FROM [CO_SO] AS c
            LEFT JOIN [TOA_NHA] AS b ON b.maCoSo = c.maCoSo
            ORDER BY c.tenCoSo, b.tenToaNha`;
        const campuses = new Map();
        for (const row of rows) {
            if (!campuses.has(row.maCoSo)) {
                campuses.set(row.maCoSo, {
                    maCoSo: row.maCoSo,
                    tenCoSo: row.tenCoSo,
                    diaChi: row.diaChi,
                    toaNhas: []
                });
            }
            if (row.maToaNha) {
                campuses.get(row.maCoSo).toaNhas.push({
                    maToaNha: row.maToaNha,
                    tenToaNha: row.tenToaNha,
                    soTang: row.soTang
                });
            }
        }
        return res.status(200).json({ success: true, data: Array.from(campuses.values()) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách cơ sở và tòa nhà.', error: error.message });
    }
};

exports.getRooms = async (_req, res) => {
    try {
        const rows = await prisma.$queryRaw`SELECT
            r.maPhong, r.soPhong, r.loaiPhong, r.soSinhVienToiDa, r.soSinhVienHienTai,
            r.maToaNha, r.tang,
            b.tenToaNha, b.soTang, c.maCoSo, c.tenCoSo, c.diaChi AS diaChiCoSo,
            f.maThietBi AS facilityId, f.tenThietBi, f.soLuong, f.trangThai AS facilityStatus,
            f.ghiChu, f.ngayCapNhat
            FROM [Phong] AS r
            LEFT JOIN [TOA_NHA] AS b ON b.maToaNha = r.maToaNha
            LEFT JOIN [CO_SO] AS c ON c.maCoSo = b.maCoSo
            LEFT JOIN [THIET_BI_PHONG] AS f ON f.maPhong = r.maPhong
            ORDER BY r.soPhong, f.tenThietBi`;
        const roomsById = new Map();
        for (const row of rows) {
            if (!roomsById.has(row.maPhong)) {
                roomsById.set(row.maPhong, {
                    maPhong: row.maPhong,
                    soPhong: row.soPhong,
                    loaiPhong: row.loaiPhong,
                    soSinhVienToiDa: row.soSinhVienToiDa,
                    soSinhVienHienTai: row.soSinhVienHienTai,
                    maCoSo: row.maCoSo,
                    tenCoSo: row.tenCoSo,
                    diaChiCoSo: row.diaChiCoSo,
                    maToaNha: row.maToaNha,
                    tenToaNha: row.tenToaNha,
                    tang: row.tang,
                    thietBis: [],
                    thanhVien: []
                });
            }
            if (row.facilityId) {
                roomsById.get(row.maPhong).thietBis.push({
                    maThietBi: row.facilityId,
                    tenThietBi: row.tenThietBi,
                    soLuong: row.soLuong,
                    trangThai: row.facilityStatus,
                    ghiChu: row.ghiChu,
                    ngayCapNhat: row.ngayCapNhat
                });
            }
        }
        const memberRows = await prisma.$queryRaw`SELECT
            hd.maPhong, hd.maHopDong, hd.maSinhVien, hd.trangThai AS trangThaiHopDong,
            sv.hoTen, sv.lop, sv.phone
            FROM [HopDong] AS hd
            INNER JOIN [SINH_VIEN] AS sv ON sv.maSV = hd.maSinhVien
            WHERE hd.trangThai IN ('ACTIVE', 'PENDING_PAYMENT')
            ORDER BY hd.maPhong, sv.hoTen`;
        for (const member of memberRows) {
            const room = roomsById.get(member.maPhong);
            if (!room) continue;
            room.thanhVien.push({
                maHopDong: member.maHopDong,
                maSinhVien: member.maSinhVien,
                hoTen: member.hoTen,
                lop: member.lop,
                phone: member.phone,
                trangThaiNoiTru: deriveStudentHousingStatus([{ trangThai: member.trangThaiHopDong }]),
                trangThaiHopDong: member.trangThaiHopDong
            });
        }
        const data = Array.from(roomsById.values()).map((room) => ({
            ...room,
            choConTrong: Math.max(0, room.soSinhVienToiDa - room.soSinhVienHienTai),
            trangThaiSucChua: room.soSinhVienHienTai >= room.soSinhVienToiDa
                ? 'DAY'
                : room.soSinhVienHienTai === 0 ? 'TRONG' : 'CON_CHO',
            trangThaiCSVC: summarizeFacilities(room.thietBis)
        }));
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
    const maToaNha = body.maToaNha ? String(body.maToaNha).trim() : null;
    const tang = body.tang === '' || body.tang === null || body.tang === undefined ? null : Number(body.tang);

    if (!maPhong || maPhong.length > 100 || !soPhong || soPhong.length > 100
        || !['QUAT', 'DIEU_HOA'].includes(loaiPhong)
        || !Number.isInteger(capacity) || capacity < 1 || capacity > 200
        || (maToaNha && (!Number.isInteger(tang) || tang < 1))
        || (!maToaNha && tang !== null)) {
        return null;
    }
    return { maPhong, soPhong, loaiPhong, capacity, maToaNha, tang };
};

const isDuplicateKeyError = (error) => error.code === 'P2002' || /duplicate key|2627|2601/i.test(error.message || '');

exports.createRoom = async (req, res) => {
    const room = normalizeRoomInput(req.body);
    if (!room) {
        return res.status(400).json({ success: false, message: 'Thông tin phòng không hợp lệ. Hãy kiểm tra mã, số phòng, loại phòng, sức chứa và vị trí.' });
    }
    try {
        if (room.maToaNha) {
            const buildings = await prisma.$queryRaw`SELECT soTang FROM [TOA_NHA] WHERE maToaNha = ${room.maToaNha}`;
            if (!buildings.length || room.tang > buildings[0].soTang) {
                return res.status(400).json({ success: false, message: 'Tòa nhà không tồn tại hoặc tầng vượt quá số tầng của tòa.' });
            }
        }
        const rows = await prisma.$queryRaw`INSERT INTO [Phong]
            (maPhong, soPhong, loaiPhong, soSinhVienToiDa, soSinhVienHienTai, maToaNha, tang)
            OUTPUT INSERTED.maPhong, INSERTED.soPhong, INSERTED.loaiPhong,
                INSERTED.soSinhVienToiDa, INSERTED.soSinhVienHienTai, INSERTED.maToaNha, INSERTED.tang
            VALUES (${room.maPhong}, ${room.soPhong}, ${room.loaiPhong}, ${room.capacity}, 0, ${room.maToaNha}, ${room.tang})`;
        return res.status(201).json({ success: true, data: rows[0], message: 'Đã thêm phòng mới.' });
    } catch (error) {
        if (isDuplicateKeyError(error)) return res.status(409).json({ success: false, message: 'Mã phòng đã tồn tại.' });
        return res.status(500).json({ success: false, message: 'Không thể thêm phòng.', error: error.message });
    }
};

exports.updateRoom = async (req, res) => {
    const room = normalizeRoomInput({ ...req.body, maPhong: req.params.maPhong });
    if (!room) {
        return res.status(400).json({ success: false, message: 'Thông tin phòng không hợp lệ. Hãy kiểm tra số phòng, loại phòng, sức chứa và vị trí.' });
    }
    try {
        const currentRows = await prisma.$queryRaw`SELECT soSinhVienHienTai FROM [Phong] WHERE maPhong = ${req.params.maPhong}`;
        if (!currentRows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng.' });
        if (room.capacity < currentRows[0].soSinhVienHienTai) {
            return res.status(409).json({ success: false, message: `Sức chứa mới không thể thấp hơn ${currentRows[0].soSinhVienHienTai} sinh viên hiện tại.` });
        }
        if (room.maToaNha) {
            const buildings = await prisma.$queryRaw`SELECT soTang FROM [TOA_NHA] WHERE maToaNha = ${room.maToaNha}`;
            if (!buildings.length || room.tang > buildings[0].soTang) {
                return res.status(400).json({ success: false, message: 'Tòa nhà không tồn tại hoặc tầng vượt quá số tầng của tòa.' });
            }
        }
        const rows = await prisma.$queryRaw`UPDATE [Phong]
            SET soPhong = ${room.soPhong}, loaiPhong = ${room.loaiPhong}, soSinhVienToiDa = ${room.capacity},
                maToaNha = ${room.maToaNha}, tang = ${room.tang}
            OUTPUT INSERTED.maPhong, INSERTED.soPhong, INSERTED.loaiPhong,
                INSERTED.soSinhVienToiDa, INSERTED.soSinhVienHienTai, INSERTED.maToaNha, INSERTED.tang
            WHERE maPhong = ${req.params.maPhong}`;
        if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng.' });
        return res.status(200).json({ success: true, data: rows[0], message: 'Đã cập nhật phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể cập nhật phòng.', error: error.message });
    }
};

exports.deleteRoom = async (req, res) => {
    try {
        const result = await prisma.$transaction(async (tx) => {
            const rooms = await tx.$queryRaw`SELECT maPhong FROM [Phong] WITH (UPDLOCK, HOLDLOCK) WHERE maPhong = ${req.params.maPhong}`;
            if (!rooms.length) return { status: 404, message: 'Không tìm thấy phòng.' };
            const contracts = await tx.$queryRaw`SELECT TOP (1) maHopDong FROM [HopDong] WHERE maPhong = ${req.params.maPhong}`;
            if (contracts.length) return { status: 409, message: 'Không thể xóa phòng đã có hợp đồng. Hãy giữ hồ sơ để bảo toàn lịch sử lưu trú.' };
            const applications = await tx.$queryRaw`SELECT TOP (1) maDangKy FROM [DangKyKTX] WHERE maPhongYeuCau = ${req.params.maPhong}`;
            if (applications.length) return { status: 409, message: 'Không thể xóa phòng đang được chọn trong đơn đăng ký nội trú.' };
            await tx.$executeRaw`DELETE FROM [THIET_BI_PHONG] WHERE maPhong = ${req.params.maPhong}`;
            await tx.$executeRaw`DELETE FROM [Phong] WHERE maPhong = ${req.params.maPhong}`;
            return { status: 200, message: 'Đã xóa phòng và danh sách thiết bị đi kèm.' };
        }, { isolationLevel: 'Serializable' });
        return res.status(result.status).json({ success: result.status === 200, message: result.message });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể xóa phòng.', error: error.message });
    }
};

exports.createFacility = async (req, res) => {
    if (!validFacilityInput(req.body)) {
        return res.status(400).json({ success: false, message: 'Tên, số lượng hoặc trạng thái thiết bị không hợp lệ.' });
    }
    try {
        const room = await prisma.$queryRaw`SELECT maPhong FROM [Phong] WHERE maPhong = ${req.params.maPhong}`;
        if (!room.length) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng.' });
        const id = randomUUID();
        const rows = await prisma.$queryRaw`INSERT INTO [THIET_BI_PHONG]
            (maThietBi, maPhong, tenThietBi, soLuong, trangThai, ghiChu, ngayCapNhat)
            OUTPUT INSERTED.maThietBi, INSERTED.maPhong, INSERTED.tenThietBi, INSERTED.soLuong,
                INSERTED.trangThai, INSERTED.ghiChu, INSERTED.ngayCapNhat
            VALUES (${id}, ${req.params.maPhong}, ${req.body.tenThietBi.trim()}, ${Number(req.body.soLuong)},
                ${req.body.trangThai}, ${req.body.ghiChu?.trim() || null}, SYSUTCDATETIME())`;
        const row = rows[0];
        const data = { maThietBi: row.maThietBi, maPhong: row.maPhong, tenThietBi: row.tenThietBi, soLuong: row.soLuong, trangThai: row.trangThai, ghiChu: row.ghiChu, ngayCapNhat: row.ngayCapNhat };
        return res.status(201).json({ success: true, data, message: 'Đã thêm thiết bị vào phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể thêm thiết bị.', error: error.message });
    }
};

exports.updateFacility = async (req, res) => {
    if (!validFacilityInput(req.body)) {
        return res.status(400).json({ success: false, message: 'Tên, số lượng hoặc trạng thái thiết bị không hợp lệ.' });
    }
    try {
        const rows = await prisma.$queryRaw`UPDATE [THIET_BI_PHONG]
            SET tenThietBi = ${req.body.tenThietBi.trim()}, soLuong = ${Number(req.body.soLuong)},
                trangThai = ${req.body.trangThai}, ghiChu = ${req.body.ghiChu?.trim() || null}, ngayCapNhat = SYSUTCDATETIME()
            OUTPUT INSERTED.maThietBi, INSERTED.maPhong, INSERTED.tenThietBi, INSERTED.soLuong,
                INSERTED.trangThai, INSERTED.ghiChu, INSERTED.ngayCapNhat
            WHERE maThietBi = ${req.params.id} AND maPhong = ${req.params.maPhong}`;
        if (!rows.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị trong phòng.' });
        const row = rows[0];
        const data = { maThietBi: row.maThietBi, maPhong: row.maPhong, tenThietBi: row.tenThietBi, soLuong: row.soLuong, trangThai: row.trangThai, ghiChu: row.ghiChu, ngayCapNhat: row.ngayCapNhat };
        return res.status(200).json({ success: true, data, message: 'Đã cập nhật thiết bị.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể cập nhật thiết bị.', error: error.message });
    }
};

exports.deleteFacility = async (req, res) => {
    try {
        const deleted = await prisma.$queryRaw`DELETE FROM [THIET_BI_PHONG]
            OUTPUT DELETED.maThietBi
            WHERE maThietBi = ${req.params.id} AND maPhong = ${req.params.maPhong}`;
        if (!deleted.length) return res.status(404).json({ success: false, message: 'Không tìm thấy thiết bị trong phòng.' });
        return res.status(200).json({ success: true, message: 'Đã xóa thiết bị khỏi danh sách phòng.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể xóa thiết bị.', error: error.message });
    }
};

const liveContractStatuses = ['ACTIVE', 'PENDING_PAYMENT'];

exports.moveRoomMember = async (req, res) => {
    const { maPhong, maHopDong } = req.params;
    const maPhongMoi = String(req.body.maPhongMoi || '').trim();
    if (!maPhongMoi) return res.status(400).json({ success: false, message: 'Hãy chọn phòng muốn chuyển đến.' });
    try {
        await prisma.$transaction(async (tx) => {
            const contracts = await tx.$queryRaw`SELECT maHopDong, maSinhVien, maPhong, trangThai
                FROM [HopDong] WITH (UPDLOCK, HOLDLOCK)
                WHERE maHopDong = ${maHopDong} AND maPhong = ${maPhong} AND trangThai IN ('ACTIVE', 'PENDING_PAYMENT')`;
            if (!contracts.length) throw Object.assign(new Error('Không tìm thấy hợp đồng lưu trú đang hiệu lực trong phòng này.'), { status: 404 });
            if (maPhongMoi === maPhong) throw Object.assign(new Error('Sinh viên đang ở phòng này.'), { status: 400 });
            const destinations = await tx.$queryRaw`SELECT maPhong, loaiPhong, soSinhVienToiDa, soSinhVienHienTai
                FROM [Phong] WITH (UPDLOCK, HOLDLOCK) WHERE maPhong = ${maPhongMoi}`;
            if (!destinations.length) throw Object.assign(new Error('Không tìm thấy phòng muốn chuyển đến.'), { status: 404 });
            const destination = destinations[0];
            const sourceRows = await tx.$queryRaw`SELECT loaiPhong FROM [Phong] WITH (UPDLOCK, HOLDLOCK) WHERE maPhong = ${maPhong}`;
            if (destination.loaiPhong !== sourceRows[0]?.loaiPhong) {
                throw Object.assign(new Error('Chỉ có thể chuyển sinh viên sang phòng cùng loại.'), { status: 409 });
            }
            if (destination.soSinhVienHienTai >= destination.soSinhVienToiDa) {
                throw Object.assign(new Error('Phòng được chọn đã đủ sức chứa.'), { status: 409 });
            }
            await tx.$executeRaw`UPDATE [Phong] SET soSinhVienHienTai = soSinhVienHienTai + 1 WHERE maPhong = ${maPhongMoi}`;
            await tx.$executeRaw`UPDATE [Phong] SET soSinhVienHienTai = CASE WHEN soSinhVienHienTai > 0 THEN soSinhVienHienTai - 1 ELSE 0 END WHERE maPhong = ${maPhong}`;
            await tx.$executeRaw`UPDATE [HopDong] SET maPhong = ${maPhongMoi} WHERE maHopDong = ${maHopDong}`;
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
            const contracts = await tx.$queryRaw`SELECT maHopDong FROM [HopDong] WITH (UPDLOCK, HOLDLOCK)
                WHERE maHopDong = ${maHopDong} AND maPhong = ${maPhong} AND trangThai IN ('ACTIVE', 'PENDING_PAYMENT')`;
            if (!contracts.length) throw Object.assign(new Error('Không tìm thấy hợp đồng lưu trú đang hiệu lực trong phòng này.'), { status: 404 });
            await tx.$executeRaw`UPDATE [HopDong] SET trangThai = 'CANCELLED' WHERE maHopDong = ${maHopDong}`;
            await tx.$executeRaw`UPDATE [Phong] SET soSinhVienHienTai = CASE WHEN soSinhVienHienTai > 0 THEN soSinhVienHienTai - 1 ELSE 0 END WHERE maPhong = ${maPhong}`;
        }, { isolationLevel: 'Serializable' });
        return res.status(200).json({ success: true, message: 'Đã kết thúc hợp đồng và xóa sinh viên khỏi phòng. Lịch sử hợp đồng được giữ lại.' });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || 'Không thể xóa sinh viên khỏi phòng.' });
    }
};
