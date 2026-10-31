const cron = require('node-cron');
const prisma = require('../config/prisma');
const { expireContracts } = require('../services/contractExpiration');

const run = (legacy) => expireContracts(prisma, new Date(), legacy).catch((error) => console.error('[contracts.expire]', error.message));
cron.schedule('* * * * *', () => run(false), { timezone: 'Asia/Ho_Chi_Minh' });
// Preserve the old nightly cancellation schedule for existing contracts without a stored deadline.
cron.schedule('0 0 * * *', () => run(true), { timezone: 'Asia/Ho_Chi_Minh' });
