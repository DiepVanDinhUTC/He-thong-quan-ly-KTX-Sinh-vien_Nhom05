const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
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

exports.getRooms = async (_req, res) => {
    try {
        const rows = await prisma.$queryRaw`SELECT
            r.maPhong, r.soPhong, r.loaiPhong, r.soSinhVienToiDa, r.soSinhVienHienTai,
            f.maThietBi AS facilityId, f.tenThietBi, f.soLuong, f.trangThai AS facilityStatus,
            f.ghiChu, f.ngayCapNhat
            FROM [Phong] AS r
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
            sv.hoTen, sv.lop, sv.phone, sv.trangThaiNoiTru
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
                trangThaiNoiTru: member.trangThaiNoiTru,
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
