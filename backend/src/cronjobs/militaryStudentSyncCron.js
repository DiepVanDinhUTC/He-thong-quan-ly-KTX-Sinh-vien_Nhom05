const cron = require('node-cron');
const prisma = require('../config/prisma');
const { createMilitaryStudentSyncService, validateConfiguration } = require('../services/militaryStudentSyncService');
const { expireMilitaryStays } = require('../services/militaryStayLifecycle');

// Expiry is independent of SIS synchronization being enabled.
cron.schedule('*/5 * * * *', async () => {
    try { await expireMilitaryStays(prisma); }
    catch (error) { console.error('[military-stay.expire]', error.message); }
}, { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true });

const runMilitaryStudentSync = createMilitaryStudentSyncService();
let running = false;
const schedule = process.env.SIS_GDQP_CRON || '15 2 * * *';
const timezone = process.env.SIS_GDQP_TIMEZONE || 'Asia/Ho_Chi_Minh';

const execute = async () => {
    if (running) {
        console.warn('[sis.gdqp] Bỏ qua lượt chạy mới vì lượt trước chưa hoàn tất.');
        return;
    }
    running = true;
    try {
        const result = await runMilitaryStudentSync();
        console.log('[sis.gdqp] Đồng bộ hoàn tất:', JSON.stringify({
            received: result.received,
            selected: result.selected,
            createdAccounts: result.createdAccounts,
            militaryStudentsMarked: result.militaryStudentsMarked,
            linkedProfiles: result.linkedProfiles,
            skipped: result.skipped.length
        }));
        if (result.skipped.length) console.warn('[sis.gdqp] Một số đăng ký chưa được cấp tài khoản:', JSON.stringify(result.skipped));
    } catch (error) {
        console.error('[sis.gdqp] Đồng bộ thất bại:', error.message);
    } finally {
        running = false;
    }
};

const enabled = /^(true|1|yes)$/i.test(process.env.SIS_GDQP_ENABLED || '');

if (!enabled) {
    console.log('[sis.gdqp] Cron đang tắt; đặt SIS_GDQP_ENABLED=true sau khi cấu hình endpoint SIS và bộ lọc.');
} else if (!cron.validate(schedule)) {
    console.error(`[sis.gdqp] Lịch cron không hợp lệ: ${schedule}`);
} else {
    try {
        validateConfiguration(process.env);
        cron.schedule(schedule, execute, { timezone });
        console.log(`[sis.gdqp] Đã lên lịch ${schedule} (${timezone}).`);
    } catch (error) {
        console.error(`[sis.gdqp] Cron chưa được lên lịch: ${error.message}`);
    }
}

module.exports = { execute };
