require('dotenv').config();
const prisma = require('../config/prisma');
const { createMilitaryStudentSyncService } = require('../services/militaryStudentSyncService');
const { assignMilitaryStudentsToA1 } = require('../services/militaryRoomAssignmentService');

const run = createMilitaryStudentSyncService({ db: prisma });

run()
    .then((result) => {
        return prisma.user.findFirst({ where: { role: 'MILITARY_OFFICER', isActive: true }, select: { id: true } })
            .then(async (officer) => {
                if (!officer) {
                    result.roomAssignmentError = 'Chưa có tài khoản cán bộ quân sự để ghi nhận người thực hiện xếp phòng.';
                    return result;
                }
                try {
                    result.roomAssignment = await assignMilitaryStudentsToA1({ db: prisma, assignedById: officer.id });
                } catch (error) {
                    result.roomAssignmentError = error.message;
                }
                return result;
            });
    })
    .then((result) => {
        console.log('[sis.gdqp] Kết quả chạy thủ công:', JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error('[sis.gdqp] Chạy đồng bộ thủ công thất bại:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
