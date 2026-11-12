const cron = require('node-cron');
const prisma = require('../config/prisma');
const { expireMilitaryStays } = require('../services/militaryStayLifecycle');

// Expiry is independent of synchronization being enabled.
cron.schedule('*/5 * * * *', async () => {
    try { await expireMilitaryStays(prisma); }
    catch (error) { console.error('[military-stay.expire]', error.message); }
}, { timezone: 'Asia/Ho_Chi_Minh', noOverlap: true });

// QLĐT sync creates new simulated students on every run; enable the schedule explicitly.
const { createQldtMilitarySync } = require('../services/qldtMilitarySyncService');
const runMilitaryStudentSync = createQldtMilitarySync({ db: prisma });
const schedule = process.env.QLDT_GDQP_CRON || '15 2 * * *';
const timezone = process.env.QLDT_GDQP_TIMEZONE || 'Asia/Ho_Chi_Minh';
const execute = async () => {
    try {
        const result = await runMilitaryStudentSync({ assignedById: process.env.QLDT_GDQP_ASSIGNED_BY_ID });
        console.log('[qldt.gdqp] Đồng bộ hoàn tất:', JSON.stringify(result));
    } catch (error) {
        console.error('[qldt.gdqp] Đồng bộ thất bại:', error.message);
    }
};
if (/^(true|1|yes)$/i.test(process.env.QLDT_GDQP_ENABLED || '')) {
    if (!process.env.QLDT_GDQP_ASSIGNED_BY_ID || !cron.validate(schedule)) {
        console.error('[qldt.gdqp] Cần cấu hình QLDT_GDQP_ASSIGNED_BY_ID và lịch cron hợp lệ.');
    } else {
        cron.schedule(schedule, execute, { timezone, noOverlap: true });
    }
}
module.exports = { execute };
