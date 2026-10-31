const prisma = require('../config/prisma');
const { approveApplication } = require('../services/applicationApproval');
const { isPriorityStudent, sortByStudentPriority } = require('../services/studentPriority');
const { occupancyRelations, presentRoomOccupancy } = require('../services/roomOccupancy');

exports.createContract = async (req, res) => {
    const { maDangKy, maPhong, ngayBatDau, ngayKetThuc, tongTien } = req.body;

    if (!maDangKy || !maPhong || !ngayBatDau || !ngayKetThuc || tongTien === undefined) {
        return res.status(400).json({
            success: false,
            message: 'Cần có mã đăng ký, mã phòng, ngày bắt đầu, ngày kết thúc và tổng tiền.'
        });
    }

    const startDate = new Date(ngayBatDau);
    const endDate = new Date(ngayKetThuc);
    const amount = Number(tongTien);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate) {
        return res.status(400).json({ success: false, message: 'Khoảng thời gian hợp đồng không hợp lệ.' });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Tổng tiền hợp đồng phải lớn hơn 0.' });
    }

    try {
        const contract = await prisma.$transaction((tx) => approveApplication(tx, {
            maDangKy, maPhong, ngayBatDau: startDate, ngayKetThuc: endDate, tongTien: amount
        }), { isolationLevel: 'Serializable' });

        return res.status(201).json({
            success: true,
            data: contract,
            message: 'Đã duyệt đơn và giữ chỗ. Sinh viên cần thanh toán hợp đồng trong 3 ngày làm việc.'
        });
    } catch (error) {
        if (error.status) {
            return res.status(error.status).json({ success: false, message: error.message });
        }
        if (error.code === 'P2034') {
            return res.status(409).json({ success: false, message: 'Có yêu cầu đồng thời thay đổi đơn hoặc phòng. Vui lòng thử lại.' });
        }
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi duyệt đơn và tạo hợp đồng nháp.',
            error: error.message
        });
    }
};

exports.getContracts = async (req, res) => {
    try {
        const where = req.buildingScope === null
            ? undefined
            : { phong: { is: { maToaNha: { in: req.buildingScope } } } };
        const data = await prisma.hopDong.findMany({
            where,
            include: { sinhVien: true, phong: true },
            orderBy: { ngayTao: 'desc' }
        });
        return res.status(200).json({
            success: true,
            data: sortByStudentPriority(data, (contract) => contract.sinhVien).map((contract) => ({
                ...contract, isPriority: isPriorityStudent(contract.sinhVien)
            }))
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách hợp đồng.', error: error.message });
    }
};

exports.getRooms = async (req, res) => {
    try {
        const loaiPhong = req.query.loaiPhong;
        const where = {
            ...(loaiPhong ? { loaiPhong } : {}),
            ...(req.buildingScope === null ? {} : { maToaNha: { in: req.buildingScope } })
        };
        const data = await prisma.phong.findMany({
            where,
            include: occupancyRelations,
            orderBy: { soPhong: 'asc' }
        });
        return res.status(200).json({ success: true, data: data.map(presentRoomOccupancy) });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách phòng.', error: error.message });
    }
};

exports.updateContract = async (req, res) => {
    const { maPhong, ngayBatDau, ngayKetThuc, tongTien } = req.body;
    const startDate = new Date(ngayBatDau);
    const endDate = new Date(ngayKetThuc);
    const amount = Number(tongTien);
    if (!maPhong || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || startDate >= endDate || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Phòng, thời hạn hoặc tổng tiền hợp đồng không hợp lệ.' });
    }

    try {
        const contract = await prisma.$transaction(async (tx) => {
            const current = await tx.hopDong.findUnique({ where: { maHopDong: req.params.id } });
            if (!current) {
                const error = new Error('Không tìm thấy hợp đồng.');
                error.status = 404;
                throw error;
            }
            if (current.trangThai !== 'PENDING_PAYMENT') {
                const error = new Error('Chỉ có thể chỉnh sửa hợp đồng đang chờ thanh toán.');
                error.status = 409;
                throw error;
            }

            if (current.maPhong !== maPhong) {
                const [newRoom, oldRoom] = await Promise.all([
                    tx.phong.findUnique({ where: { maPhong } }),
                    tx.phong.findUnique({ where: { maPhong: current.maPhong } })
                ]);
                if (!newRoom) {
                    const error = new Error('Không tìm thấy phòng được chọn.');
                    error.status = 404;
                    throw error;
                }
                if (oldRoom && newRoom.loaiPhong !== oldRoom.loaiPhong) {
                    const error = new Error('Phòng thay thế phải cùng loại với nguyện vọng ban đầu.');
                    error.status = 400;
                    throw error;
                }
                const reserved = await tx.phong.updateMany({
                    where: { maPhong, soSinhVienHienTai: { lt: newRoom.soSinhVienToiDa } },
                    data: { soSinhVienHienTai: { increment: 1 } }
                });
                if (reserved.count !== 1) {
                    const error = new Error('Phòng mới đã hết chỗ.');
                    error.status = 409;
                    throw error;
                }
                if (oldRoom) {
                    await tx.phong.updateMany({
                        where: { maPhong: current.maPhong, soSinhVienHienTai: { gt: 0 } },
                        data: { soSinhVienHienTai: { decrement: 1 } }
                    });
                }
            }

            return tx.hopDong.update({
                where: { maHopDong: req.params.id },
                data: { maPhong, ngayBatDau: startDate, ngayKetThuc: endDate, tongTien: amount },
                include: { sinhVien: true, phong: true }
            });
        }, { isolationLevel: 'Serializable' });
        return res.status(200).json({ success: true, data: contract, message: 'Đã cập nhật hợp đồng.' });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Không thể cập nhật hợp đồng.', error: error.status ? undefined : error.message });
    }
};
