const cron = require('node-cron');
const prisma = require('../config/prisma');
const { syncStudentBillNotifications } = require('../services/studentBillNotifications');

let running = false;

const execute = async () => {
    if (running) return { skipped: true, students: 0 };
    running = true;
    try {
        const students = await prisma.monthlyInvoice.findMany({
            where: { status: 'UNPAID' },
            distinct: ['maSinhVien'],
            select: { maSinhVien: true }
        });
        const pendingContracts = await prisma.hopDong.findMany({
            where: { trangThai: 'PENDING_PAYMENT' },
            distinct: ['maSinhVien'],
            select: { maSinhVien: true }
        });
        const studentIds = new Set([
            ...students.map(({ maSinhVien }) => maSinhVien),
            ...pendingContracts.map(({ maSinhVien }) => maSinhVien)
        ]);
        const results = [];
        const targetStudents = [...studentIds];
        for (let index = 0; index < targetStudents.length; index += 20) {
            const batch = targetStudents.slice(index, index + 20);
            results.push(...await Promise.all(batch.map((maSinhVien) => syncStudentBillNotifications(maSinhVien))));
        }
        const summary = results.reduce((total, result) => ({
            remindersCreated: total.remindersCreated + result.remindersCreated,
            overdueCreated: total.overdueCreated + result.overdueCreated,
            resolved: total.resolved + result.resolved
        }), { remindersCreated: 0, overdueCreated: 0, resolved: 0 });
        if (summary.remindersCreated || summary.overdueCreated || summary.resolved) {
            console.info(`[notifications.bill] reminders=${summary.remindersCreated}, overdue=${summary.overdueCreated}, resolved=${summary.resolved}`);
        }
        return { skipped: false, students: studentIds.size, ...summary };
    } catch (error) {
        console.error(`[notifications.bill] Không thể đồng bộ thông báo hóa đơn: ${error.code || error.message}`);
        return { skipped: false, students: 0, error };
    } finally {
        running = false;
    }
};

const schedule = process.env.BILLING_NOTIFICATION_CRON || '*/15 * * * *';
const timezone = process.env.BILLING_NOTIFICATION_TIMEZONE || 'Asia/Ho_Chi_Minh';

if (cron.validate(schedule)) {
    cron.schedule(schedule, execute, { timezone });
    console.log(`[notifications.bill] Đã lên lịch kiểm tra ${schedule} (${timezone}).`);
    execute();
} else {
    console.error(`[notifications.bill] Lịch cron không hợp lệ: ${schedule}`);
}

module.exports = { execute };
