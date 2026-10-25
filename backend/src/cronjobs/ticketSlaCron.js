const cron = require('node-cron');
const prisma = require('../config/prisma');
const { ACTIVE_SLA_STATUSES } = require('../services/ticketSla');

const createTicketSlaMonitor = ({ db = prisma, now = () => new Date() } = {}) => {
    let running = false;

    return async () => {
        if (running) return { skipped: true, alerted: 0 };
        running = true;
        try {
            const currentTime = now();
            const overdue = await db.maintenanceTicket.findMany({
                where: {
                    status: { in: ACTIVE_SLA_STATUSES },
                    resolvedAt: null,
                    slaDeadlineAt: { lte: currentTime },
                    slaBreachedAt: null
                },
                select: { id: true, slaDeadlineAt: true }
            });

            if (!overdue.length) return { skipped: false, alerted: 0 };

            const result = await db.maintenanceTicket.updateMany({
                where: {
                    id: { in: overdue.map(({ id }) => id) },
                    slaBreachedAt: null,
                    resolvedAt: null,
                    status: { in: ACTIVE_SLA_STATUSES }
                },
                data: { slaBreachedAt: currentTime }
            });

            console.warn(`[tickets.sla] Đã ghi nhận ${result.count} yêu cầu quá hạn SLA.`);
            return { skipped: false, alerted: result.count };
        } catch (error) {
            console.error('[tickets.sla] Không thể kiểm tra hạn xử lý:', error.code || error.name);
            return { skipped: false, alerted: 0, error };
        } finally {
            running = false;
        }
    };
};

const execute = createTicketSlaMonitor();
const schedule = process.env.TICKET_SLA_CRON || '*/5 * * * *';
const timezone = process.env.TICKET_SLA_TIMEZONE || 'Asia/Ho_Chi_Minh';

if (cron.validate(schedule)) {
    cron.schedule(schedule, execute, { timezone });
    console.log(`[tickets.sla] Đã lên lịch kiểm tra ${schedule} (${timezone}).`);
    execute();
} else {
    console.error(`[tickets.sla] Lịch cron không hợp lệ: ${schedule}`);
}

module.exports = { execute, createTicketSlaMonitor };
