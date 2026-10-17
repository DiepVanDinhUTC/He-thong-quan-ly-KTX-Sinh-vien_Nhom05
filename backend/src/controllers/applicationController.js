const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getStudentForUser = async (userId) => prisma.sinhVien.findFirst({
    where: { userId },
    select: { maSV: true }
});

exports.createApplication = async (req, res) => {
    const { loaiPhongYeuCau, maPhongYeuCau } = req.body;
    if (!['QUAT', 'DIEU_HOA'].includes(loaiPhongYeuCau) || !maPhongYeuCau) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn loại phòng và phòng mong muốn.' });
    }

    try {
        const student = await getStudentForUser(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: 'Tài khoản chưa liên kết hồ sơ sinh viên.' });

        const application = await prisma.$transaction(async (tx) => {
            const requestedRoom = await tx.phong.findUnique({ where: { maPhong: maPhongYeuCau } });
            if (!requestedRoom) {
                const error = new Error('Phòng bạn chọn không còn tồn tại.');
                error.status = 404;
                throw error;
            }
            if (requestedRoom.loaiPhong !== loaiPhongYeuCau) {
                const error = new Error('Loại phòng không khớp với phòng đã chọn.');
                error.status = 400;
                throw error;
            }
            if (requestedRoom.soSinhVienHienTai >= requestedRoom.soSinhVienToiDa) {
                const error = new Error('Phòng vừa hết chỗ, vui lòng chọn phòng khác.');
                error.status = 409;
                throw error;
            }

            const activeContract = await tx.hopDong.findFirst({
                where: { maSinhVien: student.maSV, trangThai: { in: ['PENDING_PAYMENT', 'ACTIVE'] } },
                select: { maHopDong: true }
            });
            if (activeContract) {
                const error = new Error('Bạn đã có hợp đồng đang chờ thanh toán hoặc còn hiệu lực.');
                error.status = 409;
                throw error;
            }

            const pendingApplication = await tx.dangKyKTX.findFirst({
                where: { maSinhVien: student.maSV, trangThai: 'PENDING' },
                select: { maDangKy: true }
            });
            if (pendingApplication) {
                const error = new Error('Bạn đã có đơn đăng ký đang chờ Ban quản lý xác nhận.');
                error.status = 409;
                throw error;
            }

            const application = await tx.dangKyKTX.create({
                data: { maSinhVien: student.maSV, maPhongYeuCau, loaiPhongYeuCau, trangThai: 'PENDING' }
            });
            return application;
        }, { isolationLevel: 'Serializable' });

        return res.status(201).json({ success: true, data: application, message: 'Đã gửi nguyện vọng nội trú.' });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể gửi đơn đăng ký.', error: error.status ? undefined : error.message });
    }
};

exports.getAvailableRooms = async (req, res) => {
    const { loaiPhong } = req.query;
    if (!['QUAT', 'DIEU_HOA'].includes(loaiPhong)) {
        return res.status(400).json({ success: false, message: 'Loại phòng không hợp lệ.' });
    }
    try {
        const rooms = await prisma.phong.findMany({
            where: { loaiPhong },
            orderBy: { soPhong: 'asc' }
        });
        const data = rooms
            .filter((room) => room.soSinhVienHienTai < room.soSinhVienToiDa)
            .map((room) => ({ ...room, choConTrong: room.soSinhVienToiDa - room.soSinhVienHienTai }));
        return res.status(200).json({ success: true, data });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách phòng.', error: error.message });
    }
};

exports.getMyApplications = async (req, res) => {
    try {
        const student = await getStudentForUser(req.user.id);
        if (!student) return res.status(404).json({ success: false, message: 'Tài khoản chưa liên kết hồ sơ sinh viên.' });

        const data = await prisma.dangKyKTX.findMany({
            where: { maSinhVien: student.maSV },
            orderBy: { ngayDangKy: 'desc' }
        });
        const rooms = await prisma.phong.findMany({ where: { maPhong: { in: data.map((item) => item.maPhongYeuCau).filter(Boolean) } } });
        const roomsById = new Map(rooms.map((room) => [room.maPhong, room]));
        return res.status(200).json({ success: true, data: data.map((item) => ({ ...item, phongYeuCau: roomsById.get(item.maPhongYeuCau) || null })) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải đơn đăng ký.', error: error.message });
    }
};

exports.getAllApplications = async (_req, res) => {
    try {
        const data = await prisma.dangKyKTX.findMany({
            include: { sinhVien: true },
            orderBy: { ngayDangKy: 'desc' }
        });
        const rooms = await prisma.phong.findMany({ where: { maPhong: { in: data.map((item) => item.maPhongYeuCau).filter(Boolean) } } });
        const roomsById = new Map(rooms.map((room) => [room.maPhong, room]));
        return res.status(200).json({ success: true, data: data.map((item) => ({ ...item, phongYeuCau: roomsById.get(item.maPhongYeuCau) || null })) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách đơn đăng ký.', error: error.message });
    }
};

exports.rejectApplication = async (req, res) => {
    try {
        const updated = await prisma.$transaction(async (tx) => {
            const application = await tx.dangKyKTX.findFirst({
                where: { maDangKy: req.params.id, trangThai: 'PENDING' },
                select: { maDangKy: true, maSinhVien: true }
            });
            if (!application) return { count: 0 };
            await tx.dangKyKTX.update({ where: { maDangKy: application.maDangKy }, data: { trangThai: 'REJECTED' } });
            return { count: 1 };
        });
        if (updated.count !== 1) return res.status(409).json({ success: false, message: 'Đơn không tồn tại hoặc đã được xử lý.' });
        return res.status(200).json({ success: true, message: 'Đã từ chối đơn đăng ký.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể từ chối đơn đăng ký.', error: error.message });
    }
};
