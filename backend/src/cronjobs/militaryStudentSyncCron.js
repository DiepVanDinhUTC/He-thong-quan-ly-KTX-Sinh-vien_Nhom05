const cron = require('node-cron');
const prisma = require('../config/prisma');
const { createMilitaryStudentSyncService, validateConfiguration } = require('../services/militaryStudentSyncService');
const { assignMilitaryStudentsToA1 } = require('../services/militaryRoomAssignmentService');

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
        const officer = await prisma.user.findFirst({ where: { role: 'MILITARY_OFFICER', isActive: true }, select: { id: true } });
        if (officer) {
            try {
                result.roomAssignment = await assignMilitaryStudentsToA1({ db: prisma, assignedById: officer.id });
            } catch (error) {
                result.roomAssignmentError = error.message;
                console.warn('[sis.gdqp] Không thể tự xếp phòng A1:', error.message);
            }
        } else {
            result.roomAssignmentError = 'Chưa có tài khoản cán bộ quân sự để ghi nhận người thực hiện xếp phòng.';
            console.warn('[sis.gdqp] Bỏ qua tự xếp phòng vì chưa có tài khoản cán bộ quân sự.');
        }
        console.log('[sis.gdqp] Đồng bộ hoàn tất:', JSON.stringify({
            received: result.received,
            selected: result.selected,
            createdAccounts: result.createdAccounts,
            militaryStudentsMarked: result.militaryStudentsMarked,
            linkedProfiles: result.linkedProfiles,
            skipped: result.skipped.length,
            assignedRooms: result.roomAssignment?.assigned ?? 0,
            unassignedStudents: result.roomAssignment?.unassignedCount ?? null,
            roomAssignmentError: result.roomAssignmentError
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
