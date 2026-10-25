const prisma = require('../config/prisma');
const { syncStudentBillNotifications } = require('../services/studentBillNotifications');

exports.getMine = async (req, res) => {
    const maSinhVien = req.user?.maSV;
    if (!maSinhVien) return res.status(403).json({ success: false, message: 'Tài khoản chưa được liên kết với hồ sơ sinh viên.' });

    try {
        await syncStudentBillNotifications(maSinhVien);
        const where = { maSinhVien, resolvedAt: null };
        const [notifications, unreadCount] = await Promise.all([
            prisma.studentBillNotification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: 20,
                select: {
                    id: true,
                    invoiceType: true,
                    invoiceId: true,
                    kind: true,
                    title: true,
                    message: true,
                    createdAt: true,
                    readAt: true
                }
            }),
            prisma.studentBillNotification.count({ where: { ...where, readAt: null } })
        ]);
        return res.json({ success: true, notifications, unreadCount });
    } catch (error) {
        console.error(`[notifications.bill.mine] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải thông báo hóa đơn lúc này.' });
    }
};

exports.markRead = async (req, res) => {
    const maSinhVien = req.user?.maSV;
    const id = String(req.params.id || '');
    if (!maSinhVien) return res.status(403).json({ success: false, message: 'Tài khoản chưa được liên kết với hồ sơ sinh viên.' });
    if (!id) return res.status(400).json({ success: false, message: 'Mã thông báo không hợp lệ.' });

    try {
        const notification = await prisma.studentBillNotification.findFirst({
            where: { id, maSinhVien, resolvedAt: null },
            select: { id: true, readAt: true }
        });
        if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
        if (!notification.readAt) {
            await prisma.studentBillNotification.updateMany({
                where: { id, maSinhVien, readAt: null, resolvedAt: null },
                data: { readAt: new Date() }
            });
        }
        return res.json({ success: true });
    } catch (error) {
        console.error(`[notifications.bill.read] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái thông báo.' });
    }
};

exports.markAllRead = async (req, res) => {
    const maSinhVien = req.user?.maSV;
    if (!maSinhVien) return res.status(403).json({ success: false, message: 'Tài khoản chưa được liên kết với hồ sơ sinh viên.' });

    try {
        const result = await prisma.studentBillNotification.updateMany({
            where: { maSinhVien, resolvedAt: null, readAt: null },
            data: { readAt: new Date() }
        });
        return res.json({ success: true, updated: result.count });
    } catch (error) {
        console.error(`[notifications.bill.read-all] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái thông báo.' });
    }
};
