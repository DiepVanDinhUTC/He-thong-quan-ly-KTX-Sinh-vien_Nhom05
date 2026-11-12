const prisma = require('../config/prisma');
const { loadGroups } = require('./militaryUtilityController');
const { splitAmount } = require('../services/militaryUtility');

const createGenerateMilitaryInvoices = ({ db = prisma, now = () => new Date() } = {}) => async (req, res) => {
    const period = req.body?.period;
    const electricityRate = Number(req.body?.electricityRate);
    const waterRate = Number(req.body?.waterRate);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period || '') || ![electricityRate, waterRate].every((rate) => Number.isSafeInteger(rate) && rate >= 1 && rate <= 1000000)) {
        return res.status(400).json({ success: false, message: 'Chọn kỳ và đơn giá điện, nước hợp lệ.' });
    }
    const [year, month] = period.split('-').map(Number);
    if (year < 2000 || year > 2100) return res.status(400).json({ success: false, message: 'Năm của kỳ phải từ 2000 đến 2100.' });
    const start = new Date(Date.UTC(year, month - 1, 1) - 7 * 3600000);
    const end = new Date(Date.UTC(year, month, 1) - 7 * 3600000);
    const invoicePeriod = new Date(Date.UTC(year, month - 1, 1));
    try {
        const groups = (await loadGroups(db)).filter((group) => group.startsAt >= start && group.startsAt < end
            && (req.buildingScope == null || req.buildingScope.includes(group.phong.maToaNha)));
        let generated = 0, skipped = 0;
        for (const candidate of groups) {
            const outcome = await db.$transaction(async (tx) => {
                const group = (await loadGroups(tx)).find((item) => item.maPhong === candidate.maPhong && +item.startsAt === +candidate.startsAt && +item.endsAt === +candidate.endsAt);
                if (!group || group.ambiguous || group.endsAt > now()) return 0;
                const reading = await tx.militaryUtilityPeriod.findUnique({
                    where: { maPhong_startsAt_endsAt: { maPhong: group.maPhong, startsAt: group.startsAt, endsAt: group.endsAt } },
                    include: { invoices: { select: { status: true, maSinhVien: true } } }
                });
                if (!reading || reading.invoices.length) return 0;
                const totals = [(reading.electricityEnd - reading.electricityStart) * electricityRate, (reading.waterEnd - reading.waterStart) * waterRate];
                if (totals.some((amount) => !Number.isSafeInteger(amount) || amount > 2147483647)) return 0;
                const students = [...new Set(group.assignments.map((item) => item.maSinhVien))].sort();
                for (let index = 0; index < students.length; index += 1) {
                    const student = students[index];
                    const invoice = await tx.monthlyInvoice.upsert({
                        where: { militaryUtilityPeriodId_maSinhVien: { militaryUtilityPeriodId: reading.id, maSinhVien: student } },
                        create: { militaryUtilityPeriodId: reading.id, maSinhVien: student, periodStart: invoicePeriod }, update: {}
                    });
                    await tx.monthlyInvoiceItem.deleteMany({ where: { invoiceId: invoice.id, type: { in: ['ELECTRICITY', 'WATER'] } } });
                    const remaining = await tx.monthlyInvoiceItem.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
                    const amounts = totals.map((total) => splitAmount(total, students.length, index));
                    const common = `phòng ${group.phong.soPhong}, đợt GDQP ${group.startsAt.toISOString()} đến ${group.endsAt.toISOString()}, chia ${students.length} học viên`;
                    await tx.monthlyInvoiceItem.createMany({ data: [
                        { invoiceId: invoice.id, type: 'ELECTRICITY', description: `Điện ${common}; chỉ số ${reading.electricityStart} → ${reading.electricityEnd}; đơn giá ${electricityRate} đ/kWh.`, amount: amounts[0], assessedById: req.user.id },
                        { invoiceId: invoice.id, type: 'WATER', description: `Nước ${common}; chỉ số ${reading.waterStart} → ${reading.waterEnd}; đơn giá ${waterRate} đ/m³.`, amount: amounts[1], assessedById: req.user.id }
                    ] });
                    const total = (remaining._sum.amount || 0) + amounts[0] + amounts[1];
                    if (total > 2147483647) throw new Error('Tổng hóa đơn vượt giới hạn.');
                    await tx.monthlyInvoice.update({ where: { id: invoice.id }, data: { totalAmount: total } });
                }
                return students.length;
            }, { isolationLevel: 'Serializable', maxWait: 10000, timeout: 60000 });
            if (outcome) generated += outcome;
            else skipped += 1;
        }
        return res.json({ success: true, generated, skipped, message: `Đã lập ${generated} hóa đơn GDQP; bỏ qua ${skipped} đợt chưa đủ điều kiện hoặc đã lập hóa đơn.` });
    } catch (error) {
        console.error(`[military-billing.generate] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lập hóa đơn GDQP lúc này.' });
    }
};

exports.createGenerateMilitaryInvoices = createGenerateMilitaryInvoices;
exports.generate = createGenerateMilitaryInvoices();
