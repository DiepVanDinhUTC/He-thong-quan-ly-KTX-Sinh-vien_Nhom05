const prismaClient = require('../config/prisma');
const { currentMilitaryStayWhere } = require('../services/militaryStay');

const createStudentFeedbackController = ({ db = prismaClient, now = () => new Date() } = {}) => {
    const create = async (req, res) => {
        const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
        const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
        if (title.length < 3 || title.length > 160) {
            return res.status(400).json({ success: false, message: 'Tiêu đề phải có từ 3 đến 160 ký tự.' });
        }
        if (description.length < 5 || description.length > 2000) {
            return res.status(400).json({ success: false, message: 'Mô tả phải có từ 5 đến 2.000 ký tự.' });
        }

        try {
            const student = await db.sinhVien.findFirst({
                where: { userId: req.user.id },
                select: { maSV: true }
            });
            if (!student) {
                return res.status(403).json({ success: false, message: 'Tài khoản chưa được liên kết với hồ sơ sinh viên.' });
            }
            const createdAt = now();
            const militaryStay = await db.militaryRoomAssignment.findFirst({
                where: { maSinhVien: student.maSV, ...currentMilitaryStayWhere(createdAt) },
                orderBy: { startsAt: 'desc' },
                select: { phong: { select: { maToaNha: true } } }
            });
            const contract = militaryStay ? null : await db.hopDong.findFirst({
                where: { maSinhVien: student.maSV, trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
                orderBy: { ngayTao: 'desc' },
                select: { phong: { select: { maToaNha: true } } }
            });
            const maToaNha = militaryStay?.phong?.maToaNha || contract?.phong?.maToaNha;
            if (!maToaNha) {
                return res.status(409).json({ success: false, message: 'Bạn chưa được bố trí phòng thuộc tòa nhà để gửi góp ý.' });
            }
            const feedback = await db.studentFeedback.create({
                data: { maSinhVien: student.maSV, maToaNha, title, description, createdAt },
                select: { id: true, title: true, description: true, maToaNha: true, createdAt: true }
            });
            return res.status(201).json({ success: true, feedback });
        } catch (error) {
            console.error(`[studentFeedback.create] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể gửi góp ý lúc này.' });
        }
    };

    const list = async (req, res) => {
        try {
            const feedbacks = await db.studentFeedback.findMany({
                where: {
                    maToaNha: req.buildingScope === null ? undefined : { in: req.buildingScope || [] }
                },
                include: {
                    sinhVien: { select: { maSV: true, hoTen: true, lop: true, khoa: true } },
                    toaNha: { select: { maToaNha: true, tenToaNha: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ success: true, feedbacks });
        } catch (error) {
            console.error(`[studentFeedback.list] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể tải góp ý của sinh viên.' });
        }
    };

    return { create, list };
};

module.exports = { ...createStudentFeedbackController(), createStudentFeedbackController };
