const MILITARY_STAY_MS = 14 * 24 * 60 * 60 * 1000;

const date = (value) => value == null ? null : new Date(value);
const getMilitaryStayPeriod = (assignment) => {
    const startsAt = date(assignment.startsAt || assignment.assignedAt);
    const endsAt = date(assignment.endsAt) || (startsAt ? new Date(startsAt.getTime() + MILITARY_STAY_MS) : null);
    return { startsAt, endsAt };
};

const militaryStayState = (assignment, now = new Date()) => {
    if (!assignment || assignment.status === 'ENDED') return 'ENDED';
    const { startsAt, endsAt } = getMilitaryStayPeriod(assignment);
    if (endsAt && endsAt <= now) return 'ENDED';
    if (startsAt && startsAt > now) return 'UPCOMING';
    return 'ACTIVE';
};

const resolveMilitaryStayPeriod = ({ startsAt, batchCode } = {}, now = new Date()) => {
    const dateOnly = typeof startsAt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startsAt);
    const input = dateOnly
        ? `${startsAt}T00:00:00+07:00` : startsAt;
    const start = input == null ? new Date(now) : new Date(input);
    const code = batchCode == null ? null : String(batchCode).trim();
    if (Number.isNaN(start.getTime()) || (batchCode != null && typeof batchCode !== 'string') || (code && code.length > 50)
        || (dateOnly && new Date(start.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10) !== startsAt)) {
        throw Object.assign(new Error('Ngày bắt đầu đợt học hoặc mã đợt GDQP không hợp lệ.'), { status: 400 });
    }
    const endsAt = new Date(start.getTime() + MILITARY_STAY_MS);
    if (endsAt <= now) throw Object.assign(new Error('Đợt GDQP 14 ngày này đã kết thúc. Hãy chọn ngày bắt đầu phù hợp.'), { status: 400 });
    return { startsAt: start, endsAt, batchCode: code || null };
};

const currentMilitaryStayWhere = (now = new Date()) => ({ status: 'ACTIVE', startsAt: { lte: now }, endsAt: { gt: now } });

module.exports = { MILITARY_STAY_MS, getMilitaryStayPeriod, militaryStayState, resolveMilitaryStayPeriod, currentMilitaryStayWhere };
