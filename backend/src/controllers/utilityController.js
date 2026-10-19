const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');

const UTILITY_TYPES = new Set(['ELECTRICITY', 'WATER']);

const parsePeriod = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
    const [year, month] = value.split('-').map(Number);
    if (year < 2000 || year > 2100) return null;
    return new Date(Date.UTC(year, month - 1, 1));
};

const formatPeriod = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const isBuildingAllowed = (req, maToaNha) => (
    req.buildingScope === null || req.buildingScope === undefined || req.buildingScope.includes(maToaNha)
);

const sendError = (res, error, fallback) => {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'Chỉ số của phòng và kỳ này vừa được ghi nhận. Hãy tải lại trước khi sửa.' });
    console.error(`[utilities] ${error.code || 'ERROR'}: ${error.message}`);
    if (error.code === 'P2021' && String(error.meta?.table || error.message).includes('UTILITY_METER_READING')) {
        return res.status(503).json({
            success: false,
            message: 'Cơ sở dữ liệu chưa có bảng ghi chỉ số điện nước. Hãy chạy `npx prisma migrate deploy` trong thư mục backend rồi khởi động lại máy chủ.'
        });
    }
    return res.status(500).json({ success: false, message: fallback });
};

exports.listMeterReadings = async (req, res) => {
    const periodStart = parsePeriod(req.query.period);
    if (!periodStart) return res.status(400).json({ success: false, message: 'Kỳ ghi chỉ số phải có định dạng YYYY-MM.' });

    try {
        const rooms = await prisma.phong.findMany({
            where: {
                maToaNha: req.buildingScope === null ? { not: null } : { in: req.buildingScope }
            },
            select: {
                maPhong: true,
                soPhong: true,
                maToaNha: true,
                toaNha: { select: { tenToaNha: true } }
            },
            orderBy: [{ maToaNha: 'asc' }, { soPhong: 'asc' }]
        });
        const roomIds = rooms.map(({ maPhong }) => maPhong);
        const [currentReadings, previousGroups] = roomIds.length ? await Promise.all([
            prisma.utilityMeterReading.findMany({
                where: { maPhong: { in: roomIds }, periodStart },
                orderBy: { utilityType: 'asc' }
            }),
            prisma.utilityMeterReading.groupBy({
                by: ['maPhong', 'utilityType'],
                where: { maPhong: { in: roomIds }, periodStart: { lt: periodStart } },
                _max: { periodStart: true }
            })
        ]) : [[], []];

        const previousKeys = previousGroups.filter(({ _max }) => _max.periodStart).map(({ maPhong, utilityType, _max }) => ({
            maPhong, utilityType, periodStart: _max.periodStart
        }));
        const previousReadings = previousKeys.length
            ? await prisma.utilityMeterReading.findMany({ where: { OR: previousKeys } })
            : [];
        const readingsByKey = new Map();
        for (const reading of [...currentReadings, ...previousReadings]) {
            readingsByKey.set(`${reading.maPhong}:${reading.utilityType}:${formatPeriod(reading.periodStart)}`, reading);
        }

        const data = rooms.map((room) => {
            const utilities = {};
            for (const utilityType of UTILITY_TYPES) {
                const current = readingsByKey.get(`${room.maPhong}:${utilityType}:${formatPeriod(periodStart)}`);
                const previous = previousKeys
                    .filter((item) => item.maPhong === room.maPhong && item.utilityType === utilityType)
                    .map((item) => readingsByKey.get(`${room.maPhong}:${utilityType}:${formatPeriod(item.periodStart)}`))
                    .find(Boolean);
                utilities[utilityType] = current ? {
                    id: current.id,
                    previousReading: current.previousReading,
                    currentReading: current.currentReading,
                    usage: current.currentReading - current.previousReading,
                    memo: current.memo,
                    recordedAt: current.recordedAt
                } : {
                    id: null,
                    previousReading: previous?.currentReading ?? null,
                    previousPeriod: previous?.periodStart ?? null,
                    currentReading: null,
                    usage: null,
                    memo: null,
                    recordedAt: null
                };
            }
            return {
                maPhong: room.maPhong,
                soPhong: room.soPhong,
                maToaNha: room.maToaNha,
                tenToaNha: room.toaNha?.tenToaNha || room.maToaNha,
                utilities
            };
        });

        return res.json({ success: true, period: formatPeriod(periodStart), data });
    } catch (error) {
        return sendError(res, error, 'Không thể tải sổ chỉ số điện nước.');
    }
};

exports.recordMeterReading = async (req, res) => {
    const maPhong = String(req.params.maPhong || '').trim();
    const utilityType = String(req.body.utilityType || '').trim().toUpperCase();
    const periodStart = parsePeriod(req.body.period);
    const currentReading = Number(req.body.currentReading);
    const submittedPrevious = req.body.previousReading === '' || req.body.previousReading === null || req.body.previousReading === undefined
        ? null
        : Number(req.body.previousReading);
    const memo = typeof req.body.memo === 'string' ? req.body.memo.trim() : '';
    const meterMax = 2_147_483_647;

    if (!maPhong || !UTILITY_TYPES.has(utilityType) || !periodStart
        || !Number.isSafeInteger(currentReading) || currentReading < 0 || currentReading > meterMax
        || (submittedPrevious !== null && (!Number.isSafeInteger(submittedPrevious) || submittedPrevious < 0 || submittedPrevious > meterMax))
        || memo.length > 500) {
        return res.status(400).json({ success: false, message: 'Thông tin chỉ số không hợp lệ. Hãy kiểm tra loại dịch vụ, kỳ, chỉ số và ghi chú.' });
    }

    const now = new Date();
    const vietnamParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit'
    }).formatToParts(now);
    const currentPeriod = new Date(Date.UTC(
        Number(vietnamParts.find(({ type }) => type === 'year')?.value),
        Number(vietnamParts.find(({ type }) => type === 'month')?.value) - 1,
        1
    ));
    if (periodStart > currentPeriod) return res.status(400).json({ success: false, message: 'Không thể ghi chỉ số cho kỳ trong tương lai.' });

    try {
        const room = await prisma.phong.findUnique({ where: { maPhong }, select: { maPhong: true, maToaNha: true } });
        if (!room?.maToaNha || !isBuildingAllowed(req, room.maToaNha)) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy phòng trong tòa nhà được phân công.' });
        }

        const existing = await prisma.utilityMeterReading.findUnique({
            where: { maPhong_utilityType_periodStart: { maPhong, utilityType, periodStart } }
        });
        const previous = existing || await prisma.utilityMeterReading.findFirst({
            where: { maPhong, utilityType, periodStart: { lt: periodStart } },
            orderBy: { periodStart: 'desc' }
        });
        const future = await prisma.utilityMeterReading.findFirst({
            where: { maPhong, utilityType, periodStart: { gt: periodStart } },
            orderBy: { periodStart: 'asc' },
            select: { id: true }
        });
        if (future) return res.status(409).json({ success: false, message: 'Không thể sửa kỳ cũ vì đã có chỉ số của kỳ sau.' });

        const previousReading = existing?.previousReading ?? previous?.currentReading ?? submittedPrevious;
        if (previousReading === null || previousReading === undefined) {
            return res.status(400).json({ success: false, message: 'Lần ghi đầu tiên cần nhập chỉ số đầu kỳ.' });
        }
        if (!existing && previous && submittedPrevious !== null && submittedPrevious !== previous.currentReading) {
            return res.status(409).json({ success: false, message: `Chỉ số đầu kỳ phải khớp với lần ghi trước (${previous.currentReading}).` });
        }
        if (currentReading < previousReading) {
            return res.status(400).json({ success: false, message: 'Chỉ số cuối kỳ không được nhỏ hơn chỉ số đầu kỳ.' });
        }

        const data = existing
            ? await prisma.utilityMeterReading.update({
                where: { id: existing.id },
                data: { currentReading, memo: memo || null, updatedById: req.user.id }
            })
            : await prisma.utilityMeterReading.create({
                data: {
                    id: randomUUID(), maPhong, utilityType, periodStart,
                    previousReading, currentReading, memo: memo || null, recordedById: req.user.id
                }
            });

        return res.status(existing ? 200 : 201).json({
            success: true,
            data: { ...data, usage: data.currentReading - data.previousReading },
            message: existing ? 'Đã cập nhật chỉ số.' : 'Đã ghi nhận chỉ số.'
        });
    } catch (error) {
        return sendError(res, error, 'Không thể lưu chỉ số điện nước.');
    }
};
