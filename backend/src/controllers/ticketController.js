const prismaClient = require('../config/prisma');
const getPrisma = () => prismaClient;
const { SLA_HOURS_BY_PRIORITY, getSlaHours, getSlaDeadline, getTicketSla } = require('../services/ticketSla');

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const CATEGORIES = new Set(['dien', 'nuoc', 'dieu-hoa', 'noi-that', 'khac']);
const TICKET_SUMMARY = {
    phong: { select: { maPhong: true, soPhong: true, maToaNha: true, toaNha: { select: { tenToaNha: true } } } },
    sinhVien: { select: { maSV: true, hoTen: true, phone: true } },
    photos: { select: { id: true, kind: true, fileName: true, mimeType: true, createdAt: true } },
    compensationItem: {
        select: {
            id: true, type: true, description: true, amount: true, assessedAt: true,
            invoice: { select: { id: true, periodStart: true, status: true, totalAmount: true } }
        }
    }
};

class TicketError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

const validateText = (value, label, maxLength, minLength = 1) => {
    if (typeof value !== 'string' || value.trim().length < minLength || value.trim().length > maxLength) {
        throw new TicketError(400, `${label} không hợp lệ.`);
    }
    return value.trim();
};

const getVietnamBillingPeriod = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit'
    }).formatToParts(date);
    const year = Number(parts.find(({ type }) => type === 'year')?.value);
    const month = Number(parts.find(({ type }) => type === 'month')?.value);
    return new Date(Date.UTC(year, month - 1, 1));
};

const parsePhotos = (photos, kind) => {
    if (!Array.isArray(photos) || photos.length < 1 || photos.length > 3) {
        throw new TicketError(400, 'Cần tải lên từ 1 đến 3 ảnh.');
    }
    return photos.map((photo) => {
        if (!photo || !PHOTO_MIMES.has(photo.mimeType) || typeof photo.data !== 'string') {
            throw new TicketError(400, 'Ảnh phải có định dạng JPG, PNG hoặc WEBP.');
        }
        const base64 = photo.data.replace(/^data:image\/(?:jpeg|png|webp);base64,/i, '');
        if (!base64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 === 1) {
            throw new TicketError(400, 'Dữ liệu ảnh không hợp lệ.');
        }
        const bytes = Buffer.from(base64, 'base64');
        if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) {
            throw new TicketError(400, 'Mỗi ảnh không được vượt quá 2 MB.');
        }
        const isJpeg = photo.mimeType === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
        const isPng = photo.mimeType === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const isWebp = photo.mimeType === 'image/webp' && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
        if (!isJpeg && !isPng && !isWebp) throw new TicketError(400, 'Nội dung tệp không khớp với định dạng ảnh.');
        return {
            kind,
            fileName: (typeof photo.fileName === 'string' ? photo.fileName : 'anh-su-co').replace(/[\\/\0]/g, '_').slice(0, 255),
            mimeType: photo.mimeType,
            data: base64
        };
    });
};

const ticketFilter = (req, extraWhere = {}) => {
    const where = { ...extraWhere };
    if (req.buildingScope !== null && req.buildingScope !== undefined) {
        where.phong = { maToaNha: { in: req.buildingScope } };
    }
    if (req.user.role === 'SERVICE_PROVIDER') where.assignedProviderId = req.user.id;
    return where;
};

const { currentMilitaryStayWhere } = require('../services/militaryStay');

const createTicketController = ({ db = getPrisma, now = () => new Date() } = {}) => {
    const database = () => typeof db === 'function' ? db() : db;
    const serializeTicket = (ticket) => ({ ...ticket, sla: getTicketSla(ticket, now()) });
    const getPriority = (value, fallback = 'MEDIUM') => {
        const priority = value == null ? fallback : value;
        if (typeof priority !== 'string' || !Object.hasOwn(SLA_HOURS_BY_PRIORITY, priority)) {
            throw new TicketError(400, 'Mức độ sự cố không hợp lệ.');
        }
        return priority;
    };

    const loadTicket = async (req, includePhotoData = false) => {
        const ticket = await database().maintenanceTicket.findUnique({
            where: { id: req.params.id },
            include: {
                ...TICKET_SUMMARY,
                ...(includePhotoData ? { photos: true } : {})
            }
        });
        if (!ticket) throw new TicketError(404, 'Không tìm thấy yêu cầu sửa chữa.');
        if (req.buildingScope !== null && req.buildingScope !== undefined && !req.buildingScope.includes(ticket.phong.maToaNha)) {
            throw new TicketError(404, 'Không tìm thấy yêu cầu sửa chữa trong tòa nhà được phân công.');
        }
        if (req.user.role === 'SERVICE_PROVIDER' && ticket.assignedProviderId !== req.user.id) {
            throw new TicketError(404, 'Yêu cầu chưa được phân công cho tài khoản này.');
        }
        return ticket;
    };

    const handle = (action) => async (req, res) => {
        try {
            await action(req, res, database());
        } catch (error) {
            if (error instanceof TicketError) return res.status(error.status).json({ success: false, message: error.message });
            console.error(`[tickets] ${error.code || 'ERROR'}: ${error.message}`);
            return res.status(500).json({ success: false, message: 'Không thể xử lý yêu cầu sửa chữa lúc này.' });
        }
    };

    return {
        list: handle(async (req, res, dbClient) => {
            const tickets = await dbClient.maintenanceTicket.findMany({
                where: ticketFilter(req), include: TICKET_SUMMARY, orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, tickets: tickets.map(serializeTicket) });
        }),
        mine: handle(async (req, res, dbClient) => {
            if (!req.user.maSV) throw new TicketError(403, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
            const tickets = await dbClient.maintenanceTicket.findMany({
                where: { maSinhVien: req.user.maSV }, include: TICKET_SUMMARY, orderBy: { createdAt: 'desc' }
            });
            res.json({ success: true, tickets: tickets.map(serializeTicket) });
        }),
        mineDetail: handle(async (req, res) => {
            if (!req.user.maSV) throw new TicketError(403, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
            const ticket = await loadTicket(req, true);
            if (ticket.maSinhVien !== req.user.maSV) throw new TicketError(404, 'Không tìm thấy yêu cầu sửa chữa.');
            res.json({ success: true, ticket: serializeTicket(ticket) });
        }),
        studentAcceptCompletion: handle(async (req, res, dbClient) => {
            if (!req.user.maSV) throw new TicketError(403, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
            const ticket = await loadTicket(req, true);
            if (ticket.maSinhVien !== req.user.maSV) throw new TicketError(404, 'Không tìm thấy yêu cầu sửa chữa.');
            if (ticket.status !== 'WAITING_ACCEPTANCE' || !ticket.photos.some((photo) => photo.kind === 'COMPLETION')) {
                throw new TicketError(409, 'Yêu cầu chưa có ảnh hoàn thành để kiểm tra và nghiệm thu.');
            }
            if (req.body.inspected !== true) throw new TicketError(400, 'Hãy xác nhận bạn đã kiểm tra thực tế kết quả sửa chữa.');
            const rating = req.body.rating;
            if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new TicketError(400, 'Đánh giá phải từ 1 đến 5 sao.');
            let ratingNote = null;
            if (req.body.ratingNote != null && req.body.ratingNote !== '') {
                ratingNote = validateText(req.body.ratingNote, 'Nhận xét đánh giá', 1000);
            }
            const acceptedAt = now();
            const result = await dbClient.maintenanceTicket.updateMany({
                where: { id: ticket.id, maSinhVien: req.user.maSV, status: 'WAITING_ACCEPTANCE' },
                data: { status: 'COMPLETED', rating, ratingNote, studentAcceptedAt: acceptedAt, completedAt: acceptedAt }
            });
            if (!result.count) throw new TicketError(409, 'Yêu cầu vừa được cập nhật. Hãy tải lại trạng thái mới nhất.');
            const updated = await loadTicket(req, true);
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        studentRequestRework: handle(async (req, res, dbClient) => {
            if (!req.user.maSV) throw new TicketError(403, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
            const ticket = await loadTicket(req, true);
            if (ticket.maSinhVien !== req.user.maSV) throw new TicketError(404, 'Không tìm thấy yêu cầu sửa chữa.');
            if (ticket.status !== 'WAITING_ACCEPTANCE' || !ticket.photos.some((photo) => photo.kind === 'COMPLETION')) {
                throw new TicketError(409, 'Yêu cầu chưa có ảnh hoàn thành để kiểm tra.');
            }
            if (req.body.inspected !== true) throw new TicketError(400, 'Hãy xác nhận bạn đã kiểm tra thực tế kết quả sửa chữa.');
            const reason = validateText(req.body.reason, 'Lý do yêu cầu sửa lại', 1000, 3);
            const result = await dbClient.maintenanceTicket.updateMany({
                where: { id: ticket.id, maSinhVien: req.user.maSV, status: 'WAITING_ACCEPTANCE' },
                data: { status: 'IN_PROGRESS', studentReworkNote: reason, studentReworkAt: now(), resolvedAt: null }
            });
            if (!result.count) throw new TicketError(409, 'Yêu cầu vừa được cập nhật. Hãy tải lại trạng thái mới nhất.');
            const updated = await loadTicket(req, true);
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        detail: handle(async (req, res) => {
            const ticket = await loadTicket(req, true);
            res.json({ success: true, ticket: serializeTicket(ticket) });
        }),
        create: handle(async (req, res, dbClient) => {
            if (!req.user.maSV) throw new TicketError(403, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
            const category = validateText(req.body.category, 'Nhóm sự cố', 50);
            if (!CATEGORIES.has(category)) throw new TicketError(400, 'Nhóm sự cố không hợp lệ.');
            const priority = getPriority(req.body.priority, 'LOW');
            const slaHours = getSlaHours(priority);
            const createdAt = now();
            const title = validateText(req.body.title, 'Tên sự cố', 160, 3);
            const description = validateText(req.body.description, 'Mô tả', 2000, 5);
            const photos = parsePhotos(req.body.photos, 'INITIAL');
            const militaryStay = await dbClient.militaryRoomAssignment.findFirst({
                where: { maSinhVien: req.user.maSV, ...currentMilitaryStayWhere(createdAt) },
                orderBy: { startsAt: 'desc' }, include: { phong: true }
            });
            const contract = militaryStay || await dbClient.hopDong.findFirst({
                where: { maSinhVien: req.user.maSV, trangThai: { in: ['ACTIVE', 'PENDING_PAYMENT'] } },
                orderBy: { ngayTao: 'desc' }, include: { phong: true }
            });
            if (!contract?.phong?.maPhong) throw new TicketError(403, 'Bạn chưa có phòng nội trú hoặc phòng GDQP đang hiệu lực.');
            const ticket = await dbClient.maintenanceTicket.create({
                data: {
                    maSinhVien: req.user.maSV,
                    maPhong: contract.phong.maPhong,
                    category, title, description,
                    priority,
                    slaHours,
                    createdAt,
                    slaDeadlineAt: getSlaDeadline(createdAt, priority),
                    photos: { create: photos }
                },
                include: TICKET_SUMMARY
            });
            res.status(201).json({ success: true, ticket: serializeTicket(ticket) });
        }),
        approve: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (ticket.status !== 'PENDING') throw new TicketError(409, 'Chỉ có thể duyệt yêu cầu đang chờ tiếp nhận.');
            const priority = getPriority(req.body.priority, ticket.priority || 'MEDIUM');
            const slaHours = getSlaHours(priority);
            const createdAt = ticket.createdAt || now();
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id },
                data: {
                    status: 'APPROVED',
                    approvedById: req.user.id,
                    priority,
                    slaHours,
                    slaDeadlineAt: getSlaDeadline(createdAt, priority),
                    slaBreachedAt: null
                },
                include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        reject: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (ticket.status !== 'PENDING') throw new TicketError(409, 'Chỉ có thể từ chối yêu cầu đang chờ tiếp nhận.');
            const rejectionReason = validateText(req.body.reason, 'Lý do từ chối', 500, 3);
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id }, data: { status: 'REJECTED', rejectionReason, approvedById: req.user.id }, include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        assign: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (!['APPROVED', 'SCHEDULED'].includes(ticket.status)) throw new TicketError(409, 'Chỉ phân công yêu cầu đã được duyệt.');
            const providerId = validateText(req.body.providerId, 'Tài khoản nhà cung cấp', 36);
            const provider = await dbClient.user.findUnique({ where: { id: providerId }, select: { id: true, role: true, isActive: true } });
            if (!provider || provider.role !== 'SERVICE_PROVIDER' || !provider.isActive) throw new TicketError(400, 'Tài khoản nhà cung cấp không hợp lệ.');
            const access = await dbClient.userBuildingAccess.findFirst({ where: { userId: providerId, maToaNha: ticket.phong.maToaNha } });
            if (!access) throw new TicketError(400, 'Nhà cung cấp chưa được phân công vào tòa nhà của yêu cầu.');
            const updated = await dbClient.maintenanceTicket.update({ where: { id: ticket.id }, data: { assignedProviderId: providerId }, include: TICKET_SUMMARY });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        schedule: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (!['APPROVED', 'SCHEDULED'].includes(ticket.status)) throw new TicketError(409, 'Cần duyệt yêu cầu trước khi đặt lịch sửa chữa.');
            const appointmentAt = new Date(req.body.appointmentAt);
            if (Number.isNaN(appointmentAt.getTime()) || appointmentAt <= now()) throw new TicketError(400, 'Lịch hẹn phải là thời điểm hợp lệ trong tương lai.');
            const appointmentNote = req.body.note == null ? null : validateText(req.body.note, 'Ghi chú lịch hẹn', 500);
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id }, data: { status: 'SCHEDULED', appointmentAt, appointmentNote }, include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        progress: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (!['SCHEDULED', 'IN_PROGRESS'].includes(ticket.status)) throw new TicketError(409, 'Yêu cầu phải được lên lịch trước khi cập nhật tiến độ.');
            const progressNote = validateText(req.body.note, 'Nội dung cập nhật tiến độ', 2000, 3);
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id }, data: { status: 'IN_PROGRESS', progressNote }, include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        submitCompletion: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (!['SCHEDULED', 'IN_PROGRESS'].includes(ticket.status)) throw new TicketError(409, 'Yêu cầu chưa ở trạng thái có thể nghiệm thu.');
            const progressNote = validateText(req.body.note, 'Ghi chú nghiệm thu', 2000, 3);
            const photos = parsePhotos(req.body.photos, 'COMPLETION');
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id },
                data: { status: 'WAITING_ACCEPTANCE', progressNote, resolvedAt: now(), photos: { create: photos } }, include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        assessCompensation: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req);
            if (!['WAITING_ACCEPTANCE', 'COMPLETED'].includes(ticket.status)) {
                throw new TicketError(409, 'Chỉ ghi nhận đền bù sau khi ticket đã có kết quả sửa chữa để kiểm tra.');
            }
            if (ticket.compensationItem) throw new TicketError(409, 'Ticket này đã được ghi nhận chi phí đền bù.');
            if (req.body.studentAtFault !== true) throw new TicketError(400, 'Cần xác nhận đã xác minh lỗi thuộc trách nhiệm sinh viên.');
            const amount = req.body.amount;
            if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 1_000_000_000) {
                throw new TicketError(400, 'Chi phí đền bù phải là số nguyên dương không vượt quá 1.000.000.000 đồng.');
            }
            const description = validateText(req.body.reason, 'Căn cứ đền bù', 1000, 5);
            const assessedAt = now();
            let periodStart = getVietnamBillingPeriod(assessedAt);

            try {
                await dbClient.$transaction(async (tx) => {
                    const current = await tx.maintenanceTicket.findUnique({
                        where: { id: ticket.id }, select: { id: true, status: true, compensationItem: { select: { id: true } } }
                    });
                    if (!current || !['WAITING_ACCEPTANCE', 'COMPLETED'].includes(current.status)) {
                        throw new TicketError(409, 'Ticket vừa thay đổi trạng thái; hãy tải lại trước khi ghi nhận đền bù.');
                    }
                    if (current.compensationItem) throw new TicketError(409, 'Ticket này đã được ghi nhận chi phí đền bù.');

                    const contract = await tx.hopDong.findFirst({
                        where: { maSinhVien: ticket.maSinhVien, trangThai: 'ACTIVE' },
                        orderBy: [{ ngayBatDau: 'desc' }, { ngayTao: 'desc' }],
                        select: { maHopDong: true }
                    });
                    if (!contract) throw new TicketError(409, 'Sinh viên chưa có hợp đồng nội trú đang hiệu lực để lập hóa đơn tháng.');

                    let invoice = null;
                    for (let monthOffset = 0; monthOffset < 24; monthOffset += 1) {
                        invoice = await tx.monthlyInvoice.upsert({
                            where: { maHopDong_periodStart: { maHopDong: contract.maHopDong, periodStart } },
                            create: { maSinhVien: ticket.maSinhVien, maHopDong: contract.maHopDong, periodStart },
                            update: {}
                        });
                        if (invoice.status === 'UNPAID') break;
                        periodStart = new Date(Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 1));
                        invoice = null;
                    }
                    if (!invoice) throw new TicketError(409, 'Không tìm được kỳ hóa đơn đang mở để thêm khoản đền bù.');

                    await tx.monthlyInvoiceItem.create({
                        data: {
                            invoiceId: invoice.id,
                            type: 'DAMAGE_COMPENSATION',
                            description,
                            amount,
                            ticketId: ticket.id,
                            assessedById: req.user.id,
                            assessedAt
                        }
                    });
                    await tx.monthlyInvoice.update({
                        where: { id: invoice.id }, data: { totalAmount: { increment: amount } }
                    });
                }, { isolationLevel: 'Serializable' });
            } catch (error) {
                if (error instanceof TicketError) throw error;
                if (error.code === 'P2002') throw new TicketError(409, 'Ticket này đã được ghi nhận chi phí đền bù.');
                if (error.code === 'P2034') throw new TicketError(409, 'Hóa đơn tháng vừa được cập nhật đồng thời. Hãy tải lại ticket rồi thử lại.');
                throw error;
            }

            const updated = await dbClient.maintenanceTicket.findUnique({ where: { id: ticket.id }, include: TICKET_SUMMARY });
            res.json({ success: true, ticket: serializeTicket(updated) });
        }),
        acceptCompletion: handle(async (req, res, dbClient) => {
            const ticket = await loadTicket(req, true);
            if (ticket.status !== 'WAITING_ACCEPTANCE' || !ticket.photos.some((photo) => photo.kind === 'COMPLETION')) {
                throw new TicketError(409, 'Cần có ảnh nghiệm thu trước khi xác nhận hoàn thành.');
            }
            const updated = await dbClient.maintenanceTicket.update({
                where: { id: ticket.id },
                data: { status: 'COMPLETED', completedAt: now(), resolvedAt: ticket.resolvedAt || now() },
                include: TICKET_SUMMARY
            });
            res.json({ success: true, ticket: serializeTicket(updated) });
        })
    };
};

module.exports = { ...createTicketController(), createTicketController, parsePhotos, TicketError };
