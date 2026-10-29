require('dotenv').config();
const prisma = require('../config/prisma');
const { createMilitaryStudentSyncService } = require('../services/militaryStudentSyncService');

const run = createMilitaryStudentSyncService({ db: prisma });

run()
    .then((result) => {
        console.log('[sis.gdqp] Kết quả chạy thủ công:', JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error('[sis.gdqp] Chạy đồng bộ thủ công thất bại:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
