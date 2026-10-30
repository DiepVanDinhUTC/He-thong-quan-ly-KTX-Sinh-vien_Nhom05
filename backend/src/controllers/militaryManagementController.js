const prisma = require('../config/prisma');
const { createMilitaryStudentSyncService } = require('../services/militaryStudentSyncService');
const { assignMilitaryStudentsToA1, selectA1MilitaryRooms } = require('../services/militaryRoomAssignmentService');
const { occupancyRelations, presentRoomOccupancy } = require('../services/roomOccupancy');
const { resolveMilitaryStayPeriod } = require('../services/militaryStay');
const { endExpiredMilitaryStays, expireMilitaryStays, refreshMilitaryRoomCounts } = require('../services/militaryStayLifecycle');

const syncMilitaryStudents = createMilitaryStudentSyncService({ db: prisma });
const liveMilitaryAssignment = { status: 'ACTIVE' };
const militaryStudentWhere = { laHocVienQuanSu: true };

const sendError = (res, error, fallback) => {
    const status = error.status || (error.code === 'P2002' ? 409 : 500);
    const safeSisError = String(error.code || '').startsWith('SIS_');
    if (status >= 500) {
        console.error(`[military-management] ${error.code || 'ERROR'}: ${error.message}`);
    }
    return res.status(status).json({ success: false, message: safeSisError || status < 500 ? error.message || fallback : fallback });
};

exports.getOverview = async (req, res) => {
    try {
        await expireMilitaryStays(prisma);
        const [studentCount, assignedCount, equipmentCount, meetingRoomCount, upcomingBookingCount] = await Promise.all([
            prisma.sinhVien.count({ where: militaryStudentWhere }),
            prisma.militaryRoomAssignment.count({ where: { ...liveMilitaryAssignment, sinhVien: militaryStudentWhere } }),
            prisma.militaryEquipmentItem.count({ where: { isActive: true } }),
            prisma.meetingRoom.count({ where: { isActive: true } }),
            prisma.meetingRoomBooking.count({ where: { status: 'BOOKED', startsAt: { gte: new Date() } } })
        ]);
        return res.json({ success: true, data: { studentCount, assignedCount, equipmentCount, meetingRoomCount, upcomingBookingCount } });
    } catch (error) {
        return sendError(res, error, 'Không thể tải tổng quan quản lý quân sự.');
    }
};

exports.getMilitaryStudents = async (req, res) => {
    try {
        const data = await prisma.sinhVien.findMany({
            where: militaryStudentWhere,
            orderBy: { hoTen: 'asc' },
            select: {
                maSV: true, hoTen: true, lop: true, khoa: true, email: true, gioiTinh: true, laHocVienQuanSu: true,
                militaryRoomAssignments: {
                    where: { ...liveMilitaryAssignment, endsAt: { gt: new Date() } },
                    orderBy: { startsAt: 'desc' },
                    take: 1,
                    include: { phong: { select: { maPhong: true, soPhong: true, maToaNha: true, tang: true, toaNha: { select: { tenToaNha: true } } } } }
                }
            }
        });
        return res.json({ success: true, data });
    } catch (error) {
        return sendError(res, error, 'Không thể tải danh sách học viên quân sự.');
    }
};

exports.syncMilitaryStudents = async (req, res) => {
    try {
        const data = await syncMilitaryStudents();
        return res.json({ success: true, data, message: 'Đã tiếp nhận học viên từ SIS. Chọn ngày bắt đầu đợt học trong Xếp phòng quân sự để bố trí phòng 14 ngày.' });
    } catch (error) {
        return sendError(res, error, 'Đồng bộ SIS thất bại.');
    }
};

exports.getRooms = async (req, res) => {
    try {
        const rooms = await prisma.phong.findMany({
            orderBy: [{ maToaNha: 'asc' }, { tang: 'asc' }, { soPhong: 'asc' }],
            include: { toaNha: { select: { tenToaNha: true } }, ...occupancyRelations }
        });
        const militaryTargetIds = new Set(selectA1MilitaryRooms(rooms).map((room) => room.maPhong));
        return res.json({ success: true, data: rooms.map(presentRoomOccupancy).map((room) => ({
            maPhong: room.maPhong,
            soPhong: room.soPhong,
            loaiPhong: room.loaiPhong,
            maToaNha: room.maToaNha,
            tenToaNha: room.toaNha?.tenToaNha || '',
            tang: room.tang,
            soSinhVienToiDa: room.soSinhVienToiDa,
            soSinhVienHienTai: room.soSinhVienHienTai,
            choConTrong: Math.max(0, room.soSinhVienToiDa - room.soSinhVienHienTai),
            isMilitaryTarget: militaryTargetIds.has(room.maPhong)
        })) });
    } catch (error) {
        return sendError(res, error, 'Không thể tải danh sách phòng.');
    }
};

exports.autoAssignRooms = async (req, res) => {
    if (!req.body?.startsAt) return res.status(400).json({ success: false, message: 'Chọn ngày bắt đầu đợt GDQP trước khi xếp phòng 14 ngày.' });
    try {
        const data = await assignMilitaryStudentsToA1({ db: prisma, assignedById: req.user.id, startsAt: req.body?.startsAt, batchCode: req.body?.batchCode });
        return res.json({
            success: true,
            data,
            message: `Đã tự xếp ${data.assigned} học viên mới vào khu phòng quân sự A1; ${data.alreadyAssigned} học viên đã có phòng hợp lệ.${data.unassignedCount ? ` Còn ${data.unassignedCount} học viên chưa có phòng do hết chỗ phù hợp.` : ''}`
        });
    } catch (error) {
        return sendError(res, error, 'Không thể tự xếp phòng A1 cho học viên quân sự.');
    }
};

exports.assignRoom = async (req, res) => {
    const maSinhVien = String(req.body.maSinhVien || '').trim();
    const maPhong = String(req.body.maPhong || '').trim();
    if (!maSinhVien || !maPhong) return res.status(400).json({ success: false, message: 'Hãy chọn học viên và phòng.' });
    try {
        const data = await prisma.$transaction(async (tx) => {
            await endExpiredMilitaryStays(tx);
            const student = await tx.sinhVien.findFirst({ where: { maSV: maSinhVien, ...militaryStudentWhere }, select: { maSV: true, gioiTinh: true } });
            if (!student) throw Object.assign(new Error('Không tìm thấy tài khoản học viên quân sự đã được cấp.'), { status: 404 });
            const destination = await tx.phong.findUnique({ where: { maPhong } });
            if (!destination) throw Object.assign(new Error('Không tìm thấy phòng đã chọn.'), { status: 404 });
            const a1Rooms = await tx.phong.findMany({
                where: { maToaNha: 'A1' },
                orderBy: [{ tang: 'asc' }, { soPhong: 'asc' }],
                select: { maPhong: true, soPhong: true, tang: true, maToaNha: true, soSinhVienToiDa: true }
            });
            const allowedRoomIds = new Set(selectA1MilitaryRooms(a1Rooms).map((room) => room.maPhong));
            if (!allowedRoomIds.has(maPhong)) throw Object.assign(new Error('Học viên quân sự chỉ được xếp vào các phòng A1: 103–107, 201–209, 301–309, 401–409.'), { status: 400 });
            const current = await tx.militaryRoomAssignment.findFirst({ where: { maSinhVien, status: 'ACTIVE' } });
            const period = current
                ? { startsAt: current.startsAt, endsAt: current.endsAt, batchCode: current.batchCode }
                : resolveMilitaryStayPeriod(req.body);
            if (current?.maPhong === maPhong) throw Object.assign(new Error('Học viên đã được xếp vào phòng này.'), { status: 409 });
            const occupants = await tx.militaryRoomAssignment.findMany({
                where: { maPhong, status: 'ACTIVE', maSinhVien: { not: maSinhVien }, sinhVien: militaryStudentWhere },
                select: { sinhVien: { select: { gioiTinh: true } } }
            });
            if (occupants.some((occupant) => occupant.sinhVien.gioiTinh !== student.gioiTinh)) {
                throw Object.assign(new Error('Không thể xếp khác giới tính vào cùng một phòng quân sự.'), { status: 409 });
            }
            const occupantCount = await tx.militaryRoomAssignment.count({ where: { maPhong, status: 'ACTIVE', sinhVien: militaryStudentWhere } });
            if (destination.soSinhVienHienTai - occupantCount > 0) {
                throw Object.assign(new Error('Phòng này đang có người ngoài diện học viên quân sự.'), { status: 409 });
            }
            if (current) {
                await tx.militaryRoomAssignment.update({ where: { id: current.id }, data: { status: 'ENDED', endedAt: new Date() } });
                await tx.phong.updateMany({ where: { maPhong: current.maPhong, soSinhVienHienTai: { gt: 0 } }, data: { soSinhVienHienTai: { decrement: 1 } } });
            }
            const updatedRoom = await tx.phong.updateMany({
                where: { maPhong, soSinhVienHienTai: { lt: destination.soSinhVienToiDa } },
                data: { soSinhVienHienTai: { increment: 1 } }
            });
            if (!updatedRoom.count) throw Object.assign(new Error('Phòng đã hết chỗ.'), { status: 409 });
            return tx.militaryRoomAssignment.create({ data: { maSinhVien, maPhong, assignedById: req.user.id, ...period } });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, data, message: 'Đã xếp phòng cho học viên.' });
    } catch (error) {
        return sendError(res, error, 'Không thể xếp phòng cho học viên.');
    }
};

exports.endRoomAssignment = async (req, res) => {
    try {
        await prisma.$transaction(async (tx) => {
            const assignment = await tx.militaryRoomAssignment.findFirst({ where: { id: req.params.id, status: 'ACTIVE' } });
            if (!assignment) throw Object.assign(new Error('Không tìm thấy phân phòng đang hiệu lực.'), { status: 404 });
            await tx.militaryRoomAssignment.update({ where: { id: assignment.id }, data: { status: 'ENDED', endedAt: new Date() } });
            await refreshMilitaryRoomCounts(tx, [assignment.maPhong]);
        }, { isolationLevel: 'Serializable' });
        return res.json({ success: true, message: 'Đã kết thúc phân phòng.' });
    } catch (error) {
        return sendError(res, error, 'Không thể kết thúc phân phòng.');
    }
};

const normalizeEquipmentInput = (body) => ({
    code: String(body.code || '').trim(),
    name: String(body.name || '').trim(),
    category: String(body.category || '').trim(),
    size: String(body.size || '').trim() || null,
    unit: String(body.unit || '').trim() || 'bộ',
    quantityInStock: Number(body.quantityInStock),
    note: String(body.note || '').trim() || null
});

const validEquipment = (item) => item.code.length > 0 && item.name.length > 0 && item.category.length > 0
    && Number.isInteger(item.quantityInStock) && item.quantityInStock >= 0;

exports.getEquipment = async (req, res) => {
    try {
        const [items, issues] = await Promise.all([
            prisma.militaryEquipmentItem.findMany({ where: { isActive: true }, orderBy: [{ category: 'asc' }, { name: 'asc' }] }),
            prisma.militaryEquipmentIssue.findMany({
                take: 100, orderBy: { issuedAt: 'desc' },
                include: { item: { select: { code: true, name: true, unit: true } }, sinhVien: { select: { maSV: true, hoTen: true } }, issuedBy: { select: { username: true } } }
            })
        ]);
        return res.json({ success: true, data: { items, issues } });
    } catch (error) {
        return sendError(res, error, 'Không thể tải kho quân tư trang.');
    }
};

exports.createEquipment = async (req, res) => {
    const item = normalizeEquipmentInput(req.body);
    if (!validEquipment(item)) return res.status(400).json({ success: false, message: 'Mã, tên, loại và số lượng tồn kho phải hợp lệ.' });
    try {
        const data = await prisma.militaryEquipmentItem.create({ data: item });
        return res.status(201).json({ success: true, data, message: 'Đã thêm mặt hàng quân tư trang.' });
    } catch (error) {
        return sendError(res, error, 'Không thể thêm mặt hàng.');
    }
};

exports.updateEquipment = async (req, res) => {
    const item = normalizeEquipmentInput(req.body);
    if (!validEquipment(item)) return res.status(400).json({ success: false, message: 'Mã, tên, loại và số lượng tồn kho phải hợp lệ.' });
    try {
        const data = await prisma.militaryEquipmentItem.update({ where: { id: req.params.id }, data: { ...item, isActive: req.body.isActive !== false } });
        return res.json({ success: true, data, message: 'Đã cập nhật mặt hàng quân tư trang.' });
    } catch (error) {
        return sendError(res, error, 'Không thể cập nhật mặt hàng.');
    }
};

exports.issueEquipment = async (req, res) => {
    const maSinhVien = String(req.body.maSinhVien || '').trim();
    const quantity = Number(req.body.quantity);
    if (!maSinhVien || !Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: 'Hãy chọn học viên và số lượng cấp hợp lệ.' });
    try {
        const data = await prisma.$transaction(async (tx) => {
            const student = await tx.sinhVien.findFirst({ where: { maSV: maSinhVien, ...militaryStudentWhere }, select: { maSV: true } });
            if (!student) throw Object.assign(new Error('Không tìm thấy tài khoản học viên quân sự.'), { status: 404 });
            const item = await tx.militaryEquipmentItem.findFirst({ where: { id: req.params.id, isActive: true } });
            if (!item) throw Object.assign(new Error('Mặt hàng không còn hoạt động.'), { status: 404 });
            if (item.quantityInStock < quantity) throw Object.assign(new Error('Số lượng tồn kho không đủ.'), { status: 409 });
            await tx.militaryEquipmentItem.update({ where: { id: item.id }, data: { quantityInStock: { decrement: quantity } } });
            return tx.militaryEquipmentIssue.create({ data: { itemId: item.id, maSinhVien, quantity, issuedById: req.user.id, note: String(req.body.note || '').trim() || null } });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, data, message: 'Đã ghi nhận cấp quân tư trang.' });
    } catch (error) {
        return sendError(res, error, 'Không thể cấp mặt hàng.');
    }
};

exports.returnEquipment = async (req, res) => {
    const quantity = Number(req.body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) return res.status(400).json({ success: false, message: 'Số lượng hoàn trả phải là số nguyên dương.' });
    try {
        await prisma.$transaction(async (tx) => {
            const issue = await tx.militaryEquipmentIssue.findUnique({ where: { id: req.params.id } });
            if (!issue) throw Object.assign(new Error('Không tìm thấy phiếu cấp phát.'), { status: 404 });
            const remaining = issue.quantity - issue.returnedQuantity;
            if (quantity > remaining) throw Object.assign(new Error(`Chỉ còn ${remaining} ${remaining === 1 ? 'đơn vị' : 'đơn vị'} chưa hoàn trả.`), { status: 409 });
            const returnedQuantity = issue.returnedQuantity + quantity;
            await tx.militaryEquipmentIssue.update({ where: { id: issue.id }, data: { returnedQuantity, lastReturnedAt: new Date() } });
            await tx.militaryEquipmentItem.update({ where: { id: issue.itemId }, data: { quantityInStock: { increment: quantity } } });
        }, { isolationLevel: 'Serializable' });
        return res.json({ success: true, message: 'Đã ghi nhận quân tư trang hoàn trả.' });
    } catch (error) {
        return sendError(res, error, 'Không thể ghi nhận hoàn trả.');
    }
};

const meetingRoomInput = (body) => ({
    code: String(body.code || '').trim(),
    name: String(body.name || '').trim(),
    location: String(body.location || '').trim(),
    capacity: Number(body.capacity)
});
const validMeetingRoom = (room) => room.code && room.name && room.location && Number.isInteger(room.capacity) && room.capacity > 0;

exports.getMeetingRooms = async (req, res) => {
    try {
        const data = await prisma.meetingRoom.findMany({
            where: { isActive: true }, orderBy: { name: 'asc' },
            include: { bookings: { where: { status: 'BOOKED', endsAt: { gte: new Date() } }, orderBy: { startsAt: 'asc' }, take: 20, include: { createdBy: { select: { username: true } } } } }
        });
        return res.json({ success: true, data });
    } catch (error) {
        return sendError(res, error, 'Không thể tải phòng giao ban.');
    }
};

exports.createMeetingRoom = async (req, res) => {
    const room = meetingRoomInput(req.body);
    if (!validMeetingRoom(room)) return res.status(400).json({ success: false, message: 'Mã, tên, vị trí và sức chứa phòng phải hợp lệ.' });
    try {
        const data = await prisma.meetingRoom.create({ data: room });
        return res.status(201).json({ success: true, data, message: 'Đã thêm phòng giao ban.' });
    } catch (error) {
        return sendError(res, error, 'Không thể thêm phòng giao ban.');
    }
};

exports.updateMeetingRoom = async (req, res) => {
    const room = meetingRoomInput(req.body);
    if (!validMeetingRoom(room)) return res.status(400).json({ success: false, message: 'Mã, tên, vị trí và sức chứa phòng phải hợp lệ.' });
    try {
        const data = await prisma.meetingRoom.update({ where: { id: req.params.id }, data: { ...room, isActive: req.body.isActive !== false } });
        return res.json({ success: true, data, message: 'Đã cập nhật phòng giao ban.' });
    } catch (error) {
        return sendError(res, error, 'Không thể cập nhật phòng giao ban.');
    }
};

exports.createMeetingBooking = async (req, res) => {
    const meetingRoomId = String(req.body.meetingRoomId || '').trim();
    const title = String(req.body.title || '').trim();
    const purpose = String(req.body.purpose || '').trim();
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (!meetingRoomId || !title || !purpose || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập phòng, nội dung và khoảng thời gian hợp lệ.' });
    }
    try {
        const data = await prisma.$transaction(async (tx) => {
            const room = await tx.meetingRoom.findFirst({ where: { id: meetingRoomId, isActive: true } });
            if (!room) throw Object.assign(new Error('Không tìm thấy phòng giao ban đang hoạt động.'), { status: 404 });
            const conflict = await tx.meetingRoomBooking.findFirst({
                where: { meetingRoomId, status: 'BOOKED', startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }
            });
            if (conflict) throw Object.assign(new Error('Phòng đã có lịch giao ban trùng thời gian.'), { status: 409 });
            return tx.meetingRoomBooking.create({ data: { meetingRoomId, title, purpose, startsAt, endsAt, createdById: req.user.id } });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, data, message: 'Đã đặt lịch phòng giao ban.' });
    } catch (error) {
        return sendError(res, error, 'Không thể đặt lịch phòng giao ban.');
    }
};

exports.cancelMeetingBooking = async (req, res) => {
    try {
        const booking = await prisma.meetingRoomBooking.findFirst({ where: { id: req.params.id, status: 'BOOKED' } });
        if (!booking) return res.status(404).json({ success: false, message: 'Không tìm thấy lịch giao ban đang hiệu lực.' });
        await prisma.meetingRoomBooking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } });
        return res.json({ success: true, message: 'Đã hủy lịch giao ban.' });
    } catch (error) {
        return sendError(res, error, 'Không thể hủy lịch giao ban.');
    }
};
