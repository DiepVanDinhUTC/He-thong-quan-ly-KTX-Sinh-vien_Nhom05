const prisma = require('../config/prisma');
const { syncStudentBillNotifications } = require('../services/studentBillNotifications');

exports.getMine = async (req, res) => {
    const maSinhVien = req.user?.maSV;
    if (!maSinhVien) return res.status(403).json({ success: false, message: 'Tài khoản chưa được liên kết với hồ sơ sinh viên.' });

    try {
        await syncStudentBillNotifications(maSinhVien);
        const where = { maSinhVien, resolvedAt: null };
        const [billNotifications, billUnreadCount, militaryNotifications, militaryUnreadCount] = await Promise.all([
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
            prisma.studentBillNotification.count({ where: { ...where, readAt: null } }),
            prisma.militaryNotification.findMany({ where: { maSinhVien }, orderBy: { createdAt: 'desc' }, take: 20 }),
            prisma.militaryNotification.count({ where: { maSinhVien, readAt: null } })
        ]);
        const notifications = [...billNotifications, ...militaryNotifications.map((item) => ({ ...item, id: `military:${item.id}`, kind: 'MILITARY' }))]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
        const unreadCount = billUnreadCount + militaryUnreadCount;
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
        if (id.startsWith('military:')) {
            const militaryId = id.slice('military:'.length);
            const notification = await prisma.militaryNotification.findFirst({ where: { id: militaryId, maSinhVien }, select: { id: true } });
            if (!notification) return res.status(404).json({ success: false, message: 'Không tìm thấy thông báo.' });
            await prisma.militaryNotification.updateMany({ where: { id: militaryId, maSinhVien, readAt: null }, data: { readAt: new Date() } });
            return res.json({ success: true });
        }
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
        const now = new Date();
        const [bills, military] = await prisma.$transaction([
            prisma.studentBillNotification.updateMany({ where: { maSinhVien, resolvedAt: null, readAt: null }, data: { readAt: now } }),
            prisma.militaryNotification.updateMany({ where: { maSinhVien, readAt: null }, data: { readAt: now } })
        ]);
        return res.json({ success: true, updated: bills.count + military.count });
    } catch (error) {
        console.error(`[notifications.bill.read-all] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái thông báo.' });
    }
};
