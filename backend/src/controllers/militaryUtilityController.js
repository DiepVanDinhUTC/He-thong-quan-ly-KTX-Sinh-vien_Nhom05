const prisma = require('../config/prisma');
const { groupMilitaryPeriods } = require('../services/militaryUtility');

const allowed = (req, building) => req.buildingScope == null || req.buildingScope.includes(building);

async function loadGroups(db) {
    const assignments = await db.militaryRoomAssignment.findMany({
        where: { status: { in: ['ACTIVE', 'ENDED'] } },
        select: { id: true, maPhong: true, maSinhVien: true, status: true, startsAt: true, endsAt: true, endedAt: true,
            phong: { select: { soPhong: true, maToaNha: true, toaNha: { select: { tenToaNha: true } } } } }
    });
    return groupMilitaryPeriods(assignments);
}

exports.list = async (req, res) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(req.query.period || '')) return res.status(400).json({ success: false, message: 'Kỳ phải có dạng YYYY-MM.' });
    try {
        const [year, month] = req.query.period.split('-').map(Number);
        if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: 'Năm của kỳ phải từ 2000 đến 2100.' });
        const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600000);
        const end = new Date(Date.UTC(year, month, 1) - 7 * 3600000);
        const groups = (await loadGroups(prisma)).filter((group) => group.startsAt >= start && group.startsAt < end && allowed(req, group.phong.maToaNha));
        const readings = await prisma.militaryUtilityPeriod.findMany({ where: { OR: groups.map(({ maPhong, startsAt, endsAt }) => ({ maPhong, startsAt, endsAt })) } });
        return res.json({ success: true, data: groups.map((group) => ({
            assignmentId: group.assignments[0].id, maPhong: group.maPhong, phong: group.phong, startsAt: group.startsAt, endsAt: group.endsAt,
            residentCount: new Set(group.assignments.map((item) => item.maSinhVien)).size, ambiguous: group.ambiguous,
            reading: readings.find((row) => row.maPhong === group.maPhong && +row.startsAt === +group.startsAt && +row.endsAt === +group.endsAt) || null
        })) });
    } catch (error) {
        console.error(`[military-utility.list] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải chỉ số đợt GDQP.' });
    }
};

exports.record = async (req, res) => {
    const fields = ['electricityStart', 'electricityEnd', 'waterStart', 'waterEnd'];
    const values = Object.fromEntries(fields.map((key) => [key, Number(req.body?.[key])]));
    if (fields.some((key) => req.body?.[key] === '' || req.body?.[key] == null || !Number.isSafeInteger(values[key]) || values[key] < 0 || values[key] > 2147483647)
        || values.electricityEnd < values.electricityStart || values.waterEnd < values.waterStart) {
        return res.status(400).json({ success: false, message: 'Nhập chỉ số nguyên không âm; chỉ số cuối không được nhỏ hơn đầu kỳ.' });
    }
    try {
        const result = await prisma.$transaction(async (tx) => {
            const group = (await loadGroups(tx)).find((item) => item.assignments.some(({ id }) => id === req.params.assignmentId));
            if (!group || !allowed(req, group.phong.maToaNha)) return { status: 404, message: 'Không tìm thấy đợt trong tòa nhà được phân công.' };
            if (group.ambiguous) return { status: 409, message: 'Đợt có chuyển phòng, kết thúc sớm hoặc chồng lấn; cần xử lý riêng.' };
            if (group.endsAt > new Date()) return { status: 400, message: 'Chỉ ghi chỉ số cuối sau khi đợt đã kết thúc.' };
            const key = { maPhong: group.maPhong, startsAt: group.startsAt, endsAt: group.endsAt };
            const existing = await tx.militaryUtilityPeriod.findUnique({ where: { maPhong_startsAt_endsAt: key }, include: { invoices: { select: { status: true } } } });
            if (existing?.invoices.length) return { status: 409, message: 'Đợt đã lập hóa đơn; không thể sửa chỉ số.' };
            const reading = existing
                ? await tx.militaryUtilityPeriod.update({ where: { id: existing.id }, data: { ...values, recordedById: req.user.id } })
                : await tx.militaryUtilityPeriod.create({ data: { ...key, ...values, recordedById: req.user.id } });
            return { reading };
        }, { isolationLevel: 'Serializable' });
        if (result.status) return res.status(result.status).json({ success: false, message: result.message });
        return res.json({ success: true, data: result.reading, message: 'Đã ghi chỉ số cho đợt GDQP.' });
    } catch (error) {
        console.error(`[military-utility.record] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lưu chỉ số đợt GDQP.' });
    }
};

exports.loadGroups = loadGroups;
