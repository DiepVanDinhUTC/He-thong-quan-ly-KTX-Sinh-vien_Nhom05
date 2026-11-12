const { MILITARY_STAY_MS } = require('./militaryStay');

// A full-period meter reading cannot fairly allocate a room transfer or early departure.
function groupMilitaryPeriods(assignments) {
    const groups = new Map();
    const studentPeriods = new Map();
    for (const item of assignments) {
        const start = new Date(item.startsAt);
        const end = new Date(item.endsAt);
        if (end - start !== MILITARY_STAY_MS) continue;
        const key = `${item.maPhong}|${start.toISOString()}|${end.toISOString()}`;
        const studentKey = `${item.maSinhVien}|${start.toISOString()}|${end.toISOString()}`;
        studentPeriods.set(studentKey, (studentPeriods.get(studentKey) || 0) + 1);
        if (!groups.has(key)) groups.set(key, { maPhong: item.maPhong, startsAt: start, endsAt: end, phong: item.phong, assignments: [] });
        groups.get(key).assignments.push(item);
    }
    const all = [...groups.values()];
    return all.map((group) => ({ ...group, ambiguous: assignments.some((other) => other.maPhong === group.maPhong
        && new Date(other.startsAt) < group.endsAt && new Date(other.endsAt) > group.startsAt
        && (+new Date(other.startsAt) !== +group.startsAt || +new Date(other.endsAt) !== +group.endsAt)) || group.assignments.some((item) =>
        (item.status === 'ENDED' && !item.endedAt)
        || (item.endedAt && new Date(item.endedAt) < group.endsAt)
        || studentPeriods.get(`${item.maSinhVien}|${group.startsAt.toISOString()}|${group.endsAt.toISOString()}`) > 1
    ) }));
}

function splitAmount(total, count, index) {
    return Math.floor(total / count) + (index < total % count ? 1 : 0);
}

module.exports = { groupMilitaryPeriods, splitAmount };
