const prismaClient = require('../config/prisma');

const SCORE_FIELDS = ['generalScore', 'livingScore', 'securityScore', 'propertyScore', 'environmentScore'];
const ROOM_SUMMARY = {
    maPhong: true,
    soPhong: true,
    maToaNha: true,
    toaNha: { select: { maToaNha: true, tenToaNha: true } }
};
const EVALUATION_INCLUDE = {
    phong: { select: ROOM_SUMMARY },
    recordedBy: { select: { username: true, nhanVien: { select: { hoTen: true } } } }
};

const getMonthStart = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit'
    }).formatToParts(date);
    const year = Number(parts.find(({ type }) => type === 'year')?.value);
    const month = Number(parts.find(({ type }) => type === 'month')?.value);
    return new Date(Date.UTC(year, month - 1, 1));
};

const getEvaluationInput = (body = {}) => {
    const values = body && typeof body === 'object' ? body : {};
    const scores = Object.fromEntries(SCORE_FIELDS.map((field) => [field, values[field]]));
    const notes = typeof values.notes === 'string' ? values.notes.trim() : '';
    if (SCORE_FIELDS.some((field) => !Number.isInteger(scores[field]) || scores[field] < 1 || scores[field] > 5)) {
        return { error: 'Điểm từng điều phải là số nguyên từ 1 đến 5.' };
    }
    if (notes.length > 2000) return { error: 'Nhận xét không được vượt quá 2.000 ký tự.' };
    return { data: { ...scores, notes: notes || null } };
};

const createRoomHousekeepingController = ({ db = prismaClient, now = () => new Date() } = {}) => {
    const list = async (req, res) => {
        try {
            const evaluations = await db.roomHousekeepingEvaluation.findMany({
                where: {
                    phong: req.buildingScope === null ? undefined : { is: { maToaNha: { in: req.buildingScope || [] } } }
                },
                include: EVALUATION_INCLUDE,
                orderBy: { createdAt: 'desc' },
                take: 100
            });
            return res.json({ success: true, evaluations });
        } catch (error) {
            console.error(`[roomHousekeeping.list] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể tải lịch sử chấm điểm nội vụ.' });
        }
    };

    const create = async (req, res) => {
        const maPhong = typeof req.body?.maPhong === 'string' ? req.body.maPhong.trim() : '';
        const input = getEvaluationInput(req.body);
        if (!maPhong) return res.status(400).json({ success: false, message: 'Vui lòng chọn phòng cần chấm điểm.' });
        if (input.error) return res.status(400).json({ success: false, message: input.error });

        let periodMonth;
        try {
            const room = await db.phong.findUnique({
                where: { maPhong },
                select: { maPhong: true, maToaNha: true }
            });
            if (!room?.maToaNha) return res.status(404).json({ success: false, message: 'Không tìm thấy phòng thuộc tòa nhà.' });
            if (req.buildingScope !== null && req.buildingScope !== undefined && !req.buildingScope.includes(room.maToaNha)) {
                return res.status(403).json({ success: false, message: 'Bạn không được phân công chấm điểm phòng thuộc tòa nhà này.' });
            }
            const createdAt = now();
            periodMonth = getMonthStart(createdAt);
            const existing = await db.roomHousekeepingEvaluation.findFirst({
                where: { maPhong, periodMonth },
                include: EVALUATION_INCLUDE
            });
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Phòng đã được chấm điểm trong tháng này. Chọn lượt chấm trong lịch sử để sửa điểm.',
                    evaluation: existing
                });
            }
            const evaluation = await db.roomHousekeepingEvaluation.create({
                data: {
                    maPhong,
                    recordedById: req.user.id,
                    ...input.data,
                    periodMonth,
                    periodLockKey: JSON.stringify([maPhong, periodMonth.toISOString().slice(0, 10)]),
                    createdAt
                },
                include: EVALUATION_INCLUDE
            });
            return res.status(201).json({ success: true, evaluation });
        } catch (error) {
            if (error.code === 'P2002') {
                try {
                    const evaluation = await db.roomHousekeepingEvaluation.findFirst({
                        where: { maPhong, periodMonth },
                        include: EVALUATION_INCLUDE
                    });
                    return res.status(409).json({
                        success: false,
                        message: 'Phòng đã được chấm điểm trong tháng này. Chọn lượt chấm trong lịch sử để sửa điểm.',
                        ...(evaluation ? { evaluation } : {})
                    });
                } catch (lookupError) {
                    console.error(`[roomHousekeeping.create.conflictLookup] ${lookupError.code || 'ERROR'}: ${lookupError.message}`);
                    return res.status(500).json({ success: false, message: 'Không thể tải lượt chấm điểm hiện có.' });
                }
            }
            console.error(`[roomHousekeeping.create] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể lưu kết quả chấm điểm nội vụ.' });
        }
    };

    const update = async (req, res) => {
        const input = getEvaluationInput(req.body);
        if (input.error) return res.status(400).json({ success: false, message: input.error });

        try {
            const existing = await db.roomHousekeepingEvaluation.findUnique({
                where: { id: req.params.id },
                include: { phong: { select: { maPhong: true, maToaNha: true } } }
            });
            if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lượt chấm điểm.' });
            if (req.buildingScope !== null && req.buildingScope !== undefined && !req.buildingScope.includes(existing.phong.maToaNha)) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy lượt chấm trong tòa nhà được phân công.' });
            }
            const evaluation = await db.roomHousekeepingEvaluation.update({
                where: { id: existing.id },
                data: { ...input.data, updatedAt: now() },
                include: EVALUATION_INCLUDE
            });
            return res.json({ success: true, evaluation });
        } catch (error) {
            console.error(`[roomHousekeeping.update] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể cập nhật điểm nội vụ.' });
        }
    };

    return { list, create, update };
};

module.exports = { ...createRoomHousekeepingController(), createRoomHousekeepingController };
