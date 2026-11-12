require('dotenv').config();
const prisma = require('../config/prisma');
const { createQldtMilitarySync } = require('../services/qldtMilitarySyncService');

const run = createQldtMilitarySync({ db: prisma });

run({ assignedById: process.env.QLDT_GDQP_ASSIGNED_BY_ID })
    .then((result) => {
        console.log('[qldt.gdqp] Kết quả chạy thủ công:', JSON.stringify(result, null, 2));
    })
    .catch((error) => {
        console.error('[qldt.gdqp] Chạy đồng bộ thủ công thất bại:', error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
