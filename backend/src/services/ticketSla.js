const SLA_HOURS_BY_PRIORITY = Object.freeze({
    LOW: 24,
    MEDIUM: 48,
    HIGH: 72
});

const ACTIVE_SLA_STATUSES = Object.freeze(['PENDING', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS']);
const DUE_SOON_WINDOW_MS = 6 * 60 * 60 * 1000;

const getSlaHours = (priority) => SLA_HOURS_BY_PRIORITY[priority] || SLA_HOURS_BY_PRIORITY.MEDIUM;

const getSlaDeadline = (createdAt, priority) => new Date(
    new Date(createdAt).getTime() + getSlaHours(priority) * 60 * 60 * 1000
);

const getTicketSla = (ticket, currentTime = new Date()) => {
    if (!ticket) return null;

    const priority = SLA_HOURS_BY_PRIORITY[ticket.priority] ? ticket.priority : 'MEDIUM';
    const hours = Number.isInteger(ticket.slaHours) && ticket.slaHours > 0
        ? ticket.slaHours
        : getSlaHours(priority);
    const deadlineAt = ticket.slaDeadlineAt
        ? new Date(ticket.slaDeadlineAt)
        : ticket.createdAt ? getSlaDeadline(ticket.createdAt, priority) : null;

    if (!deadlineAt || Number.isNaN(deadlineAt.getTime())) return null;

    const nowMs = new Date(currentTime).getTime();
    const deadlineMs = deadlineAt.getTime();
    const resolvedAt = ticket.resolvedAt || ticket.completedAt || null;
    let state = 'ON_TRACK';

    if (ticket.status === 'REJECTED') {
        state = 'CANCELLED';
    } else if (resolvedAt) {
        state = new Date(resolvedAt).getTime() <= deadlineMs ? 'MET' : 'BREACHED';
    } else if (deadlineMs <= nowMs || ticket.slaBreachedAt) {
        state = 'OVERDUE';
    } else if (deadlineMs - nowMs <= DUE_SOON_WINDOW_MS) {
        state = 'DUE_SOON';
    }

    return {
        priority,
        hours,
        deadlineAt,
        breachedAt: ticket.slaBreachedAt || null,
        resolvedAt,
        state,
        remainingMs: resolvedAt || state === 'CANCELLED' ? null : Math.max(0, deadlineMs - nowMs),
        overdueMs: ['OVERDUE', 'BREACHED'].includes(state)
            ? Math.max(0, (resolvedAt ? new Date(resolvedAt).getTime() : nowMs) - deadlineMs)
            : 0
    };
};

module.exports = { SLA_HOURS_BY_PRIORITY, ACTIVE_SLA_STATUSES, getSlaHours, getSlaDeadline, getTicketSla };
