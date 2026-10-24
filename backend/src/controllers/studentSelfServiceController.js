const ROLES = require('../config/roles');

const prisma = require('../config/prisma');
const { calculateContractRent } = require('../services/contractPricing');
const SERVICE_CATALOG = Object.freeze({
    WIFI: 'Đăng ký Wi-Fi',
    LAUNDRY: 'Dịch vụ giặt sấy',
    PARKING: 'Đăng ký gửi xe'
});
const LIVE_CONTRACT_STATUSES = ['ACTIVE', 'PENDING_PAYMENT'];
const SERVICE_STATUS_TRANSITIONS = Object.freeze({
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['IN_PROGRESS', 'COMPLETED'],
    IN_PROGRESS: ['COMPLETED']
});

const fail = (status, message) => Object.assign(new Error(message), { status });
const sendError = (res, error, fallback) => {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    console.error(`[studentSelfService] ${error.code || 'ERROR'}: ${error.message}`);
    return res.status(500).json({ success: false, message: fallback });
};

const getStudentContract = async (userId, { activeOnly = false } = {}) => {
    const student = await prisma.sinhVien.findFirst({ where: { userId }, select: { maSV: true } });
    if (!student) throw fail(404, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
    const contract = await prisma.hopDong.findFirst({
        where: {
            maSinhVien: student.maSV,
            trangThai: { in: activeOnly ? ['ACTIVE'] : LIVE_CONTRACT_STATUSES }
        },
        include: { phong: true },
        orderBy: { ngayTao: 'desc' }
    });
    return { student, contract };
};

const getBuildingScope = async (req, db = prisma) => {
    if (ROLES.GLOBAL_BUILDING_ROLES.has(req.user.role)) return null;
    const access = await db.userBuildingAccess.findMany({
        where: { userId: req.user.id }, select: { maToaNha: true }
    });
    return access.map(({ maToaNha }) => maToaNha);
};

const hasBuildingAccess = async (req, maToaNha) => {
    const scope = await getBuildingScope(req);
    return scope === null || scope.includes(maToaNha);
};

exports.serviceCatalog = SERVICE_CATALOG;

exports.myHousingRequests = async (req, res) => {
    try {
        const { student } = await getStudentContract(req.user.id);
        const requests = await prisma.studentHousingRequest.findMany({
            where: { maSinhVien: student.maSV },
            include: { hopDong: { include: { phong: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, requests });
    } catch (error) { return sendError(res, error, 'Không thể tải yêu cầu lưu trú.'); }
};

exports.createHousingRequest = async (req, res) => {
    const requestType = String(req.body.requestType || '').trim().toUpperCase();
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const maPhongMoi = typeof req.body.maPhongMoi === 'string' ? req.body.maPhongMoi.trim() : '';
    if (!['TRANSFER', 'RETURN'].includes(requestType)) {
        return res.status(400).json({ success: false, message: 'Loại yêu cầu không hợp lệ.' });
    }
    if (reason.length > 1000) return res.status(400).json({ success: false, message: 'Lý do không được vượt quá 1.000 ký tự.' });
    if (requestType === 'TRANSFER' && !maPhongMoi) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn phòng muốn chuyển đến.' });
    }

    try {
        const student = await prisma.sinhVien.findFirst({ where: { userId: req.user.id }, select: { maSV: true } });
        if (!student) throw fail(404, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
        const request = await prisma.$transaction(async (tx) => {
            const contract = await tx.hopDong.findFirst({
                where: { maSinhVien: student.maSV, trangThai: 'ACTIVE' }, orderBy: { ngayTao: 'desc' }
            });
            if (!contract) throw fail(409, 'Chỉ có thể gửi yêu cầu khi hợp đồng lưu trú đang có hiệu lực.');
            const existing = await tx.studentHousingRequest.findFirst({
                where: { maHopDong: contract.maHopDong, status: 'PENDING' }, select: { id: true }
            });
            if (existing) throw fail(409, 'Bạn đã có yêu cầu lưu trú đang chờ xử lý.');

            if (requestType === 'TRANSFER') {
                if (maPhongMoi === contract.maPhong) throw fail(400, 'Phòng mới phải khác phòng hiện tại.');
                const target = await tx.phong.findUnique({ where: { maPhong: maPhongMoi } });
                if (!target) throw fail(404, 'Không tìm thấy phòng muốn chuyển đến.');
                if (target.soSinhVienHienTai >= target.soSinhVienToiDa) throw fail(409, 'Phòng đã hết chỗ.');
            }

            return tx.studentHousingRequest.create({
                data: {
                    maSinhVien: student.maSV,
                    maHopDong: contract.maHopDong,
                    requestType,
                    maPhongMoi: requestType === 'TRANSFER' ? maPhongMoi : null,
                    reason: reason || null
                },
                include: { hopDong: { include: { phong: true } } }
            });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, request, message: requestType === 'TRANSFER' ? 'Đã gửi yêu cầu chuyển phòng để nhân viên quản lý hồ sơ xem xét.' : 'Đã gửi yêu cầu để Ban quản lý xem xét.' });
    } catch (error) { return sendError(res, error, 'Không thể gửi yêu cầu lưu trú.'); }
};

const createHousingRequestController = ({ db = prisma } = {}) => {
    // Records staff handle transfers across the KTX, as with archive room assignments.
    const getHousingScope = (req) => req.user.role === ROLES.ARCHIVIST ? null : getBuildingScope(req, db);

    const listHousingRequests = async (req, res) => {
        try {
            const scope = await getHousingScope(req);
            const requests = await db.studentHousingRequest.findMany({
                where: {
                    ...(req.user.role === ROLES.ARCHIVIST ? { requestType: 'TRANSFER' } : {}),
                    ...(scope === null ? {} : { hopDong: { phong: { maToaNha: { in: scope } } } })
                },
                include: {
                    sinhVien: { select: { maSV: true, hoTen: true, phone: true, lop: true, khoa: true } },
                    hopDong: { include: { phong: true } }
                },
                orderBy: { createdAt: 'desc' }
            });
            return res.json({ success: true, requests });
        } catch (error) { return sendError(res, error, 'Không thể tải danh sách yêu cầu.'); }
    };

    const decideHousingRequest = async (req, res) => {
        const status = String(req.body.status || '').trim().toUpperCase();
        const staffNote = typeof req.body.staffNote === 'string' ? req.body.staffNote.trim() : '';
        if (!['APPROVED', 'REJECTED'].includes(status)) {
            return res.status(400).json({ success: false, message: 'Trạng thái xử lý không hợp lệ.' });
        }
        if (staffNote.length > 500) return res.status(400).json({ success: false, message: 'Ghi chú không được vượt quá 500 ký tự.' });

        try {
            const currentRequest = await db.studentHousingRequest.findUnique({
                where: { id: req.params.id }, include: { hopDong: { include: { phong: true } } }
            });
            if (!currentRequest) throw fail(404, 'Không tìm thấy yêu cầu lưu trú.');
            if (!ROLES.HOUSING_REQUEST_DECISION_ROLES[currentRequest.requestType]?.includes(req.user.role)) {
                throw fail(403, currentRequest.requestType === 'TRANSFER'
                    ? 'Chỉ nhân viên quản lý hồ sơ được xử lý đơn chuyển phòng.'
                    : 'Tài khoản không có quyền xử lý đơn trả phòng.');
            }
            if (currentRequest.status !== 'PENDING') throw fail(409, 'Yêu cầu đã được xử lý.');
            const scope = await getHousingScope(req);
            if (scope !== null && !scope.includes(currentRequest.hopDong.phong.maToaNha)) {
                throw fail(404, 'Không tìm thấy yêu cầu trong tòa nhà được phân công.');
            }

            const updated = await db.$transaction(async (tx) => {
                const contract = await tx.hopDong.findUnique({ where: { maHopDong: currentRequest.maHopDong }, include: { phong: true } });
                if (!contract || contract.trangThai !== 'ACTIVE') throw fail(409, 'Hợp đồng không còn hiệu lực để xử lý yêu cầu.');
                if (scope !== null && !scope.includes(contract.phong.maToaNha)) {
                    throw fail(404, 'Không tìm thấy yêu cầu trong tòa nhà được phân công.');
                }
                const changed = await tx.studentHousingRequest.updateMany({
                    where: { id: currentRequest.id, status: 'PENDING' },
                    data: { status, staffNote: staffNote || null, decidedAt: new Date() }
                });
                if (changed.count !== 1) throw fail(409, 'Yêu cầu vừa được xử lý bởi tài khoản khác.');

                if (status === 'APPROVED' && currentRequest.requestType === 'TRANSFER') {
                    if (currentRequest.maPhongMoi === contract.maPhong) throw fail(409, 'Sinh viên đã ở phòng được yêu cầu chuyển đến.');
                    const target = await tx.phong.findUnique({ where: { maPhong: currentRequest.maPhongMoi } });
                    if (!target) throw fail(404, 'Không tìm thấy phòng muốn chuyển đến.');
                    if (scope !== null && !scope.includes(target.maToaNha)) throw fail(403, 'Tài khoản chưa được phân công tòa nhà của phòng mới.');
                    const tongTien = calculateContractRent(contract, target);
                    const reserved = await tx.phong.updateMany({
                        where: { maPhong: target.maPhong, soSinhVienHienTai: { lt: target.soSinhVienToiDa } },
                        data: { soSinhVienHienTai: { increment: 1 } }
                    });
                    if (reserved.count !== 1) throw fail(409, 'Phòng mới vừa hết chỗ.');
                    await tx.phong.updateMany({
                        where: { maPhong: contract.maPhong, soSinhVienHienTai: { gt: 0 } },
                        data: { soSinhVienHienTai: { decrement: 1 } }
                    });
                    await tx.hopDong.update({
                        where: { maHopDong: contract.maHopDong },
                        data: { maPhong: target.maPhong, tongTien }
                    });
                }
                if (status === 'APPROVED' && currentRequest.requestType === 'RETURN') {
                    await tx.phong.updateMany({
                        where: { maPhong: contract.maPhong, soSinhVienHienTai: { gt: 0 } },
                        data: { soSinhVienHienTai: { decrement: 1 } }
                    });
                    const returnedAt = new Date();
                    await tx.hopDong.update({
                        where: { maHopDong: contract.maHopDong },
                        data: {
                            trangThai: 'RETURNED',
                            ...(contract.ngayBatDau < returnedAt ? { ngayKetThuc: returnedAt } : {})
                        }
                    });
                    await tx.studentServiceRegistration.updateMany({
                        where: { maHopDong: contract.maHopDong, status: 'PENDING' },
                        data: { status: 'CANCELLED', cancelledAt: new Date() }
                    });
                }
                return tx.studentHousingRequest.findUnique({
                    where: { id: currentRequest.id },
                    include: { sinhVien: { select: { maSV: true, hoTen: true } }, hopDong: { include: { phong: true } } }
                });
            }, { isolationLevel: 'Serializable' });
            return res.json({ success: true, request: updated, message: status === 'APPROVED' ? 'Đã duyệt yêu cầu.' : 'Đã từ chối yêu cầu.' });
        } catch (error) { return sendError(res, error, 'Không thể xử lý yêu cầu lưu trú.'); }
    };

    return { listHousingRequests, decideHousingRequest };
};

Object.assign(exports, createHousingRequestController(), { createHousingRequestController });

exports.myServiceRegistrations = async (req, res) => {
    try {
        const { student } = await getStudentContract(req.user.id);
        const registrations = await prisma.studentServiceRegistration.findMany({
            where: { maSinhVien: student.maSV }, orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, catalog: SERVICE_CATALOG, registrations });
    } catch (error) { return sendError(res, error, 'Không thể tải đăng ký dịch vụ.'); }
};

exports.createServiceRegistration = async (req, res) => {
    const serviceCode = String(req.body.serviceCode || '').trim().toUpperCase();
    const note = typeof req.body.note === 'string' ? req.body.note.trim() : '';
    if (!SERVICE_CATALOG[serviceCode]) return res.status(400).json({ success: false, message: 'Dịch vụ không hợp lệ.' });
    if (note.length > 500) return res.status(400).json({ success: false, message: 'Ghi chú không được vượt quá 500 ký tự.' });
    try {
        const student = await prisma.sinhVien.findFirst({ where: { userId: req.user.id }, select: { maSV: true } });
        if (!student) throw fail(404, 'Tài khoản chưa liên kết hồ sơ sinh viên.');
        const registration = await prisma.$transaction(async (tx) => {
            const contract = await tx.hopDong.findFirst({
                where: { maSinhVien: student.maSV, trangThai: 'ACTIVE' }, orderBy: { ngayTao: 'desc' }
            });
            if (!contract) throw fail(409, 'Cần có hợp đồng đang hiệu lực để đăng ký dịch vụ.');
            const exists = await tx.studentServiceRegistration.findFirst({
                where: { maHopDong: contract.maHopDong, serviceCode, status: { in: ['PENDING', 'APPROVED'] } },
                select: { id: true }
            });
            if (exists) throw fail(409, 'Dịch vụ này đã được đăng ký hoặc đang chờ duyệt.');
            return tx.studentServiceRegistration.create({
                data: { maSinhVien: student.maSV, maHopDong: contract.maHopDong, serviceCode, serviceName: SERVICE_CATALOG[serviceCode], note: note || null }
            });
        }, { isolationLevel: 'Serializable' });
        return res.status(201).json({ success: true, registration, message: 'Đã gửi đăng ký dịch vụ.' });
    } catch (error) { return sendError(res, error, 'Không thể đăng ký dịch vụ.'); }
};

exports.cancelServiceRegistration = async (req, res) => {
    try {
        const { student } = await getStudentContract(req.user.id);
        const updated = await prisma.studentServiceRegistration.updateMany({
            where: { id: req.params.id, maSinhVien: student.maSV, status: 'PENDING' },
            data: { status: 'CANCELLED', cancelledAt: new Date() }
        });
        if (updated.count !== 1) throw fail(404, 'Chỉ có thể hủy đăng ký đang chờ xử lý của bạn.');
        return res.json({ success: true, message: 'Đã hủy đăng ký dịch vụ.' });
    } catch (error) { return sendError(res, error, 'Không thể hủy đăng ký dịch vụ.'); }
};

exports.listServiceRegistrations = async (req, res) => {
    try {
        const scope = await getBuildingScope(req);
        const registrations = await prisma.studentServiceRegistration.findMany({
            where: scope === null ? undefined : { hopDong: { phong: { maToaNha: { in: scope } } } },
            include: { sinhVien: { select: { maSV: true, hoTen: true, phone: true } }, hopDong: { include: { phong: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return res.json({ success: true, catalog: SERVICE_CATALOG, registrations });
    } catch (error) { return sendError(res, error, 'Không thể tải yêu cầu dịch vụ.'); }
};

exports.decideServiceRegistration = async (req, res) => {
    const status = String(req.body.status || '').trim().toUpperCase();
    const staffNote = typeof req.body.staffNote === 'string' ? req.body.staffNote.trim() : '';
    if (staffNote.length > 500) return res.status(400).json({ success: false, message: 'Ghi chú phản hồi không được vượt quá 500 ký tự.' });
    if (!Object.values(SERVICE_STATUS_TRANSITIONS).some((statuses) => statuses.includes(status))) {
        return res.status(400).json({ success: false, message: 'Trạng thái xử lý không hợp lệ.' });
    }
    try {
        const registration = await prisma.studentServiceRegistration.findUnique({
            where: { id: req.params.id }, include: { hopDong: { include: { phong: true } } }
        });
        if (!registration) throw fail(404, 'Không tìm thấy đăng ký dịch vụ.');
        if (!SERVICE_STATUS_TRANSITIONS[registration.status]?.includes(status)) {
            throw fail(409, 'Trạng thái hiện tại không thể chuyển sang trạng thái đã chọn. Hãy tải lại danh sách dịch vụ.');
        }
        if (!await hasBuildingAccess(req, registration.hopDong.phong.maToaNha)) {
            throw fail(404, 'Không tìm thấy đăng ký trong tòa nhà được phân công.');
        }
        const updated = await prisma.studentServiceRegistration.updateMany({
            where: { id: req.params.id, status: registration.status },
            data: { status, staffNote: staffNote || null, updatedById: req.user.id, updatedAt: new Date() }
        });
        if (updated.count !== 1) throw fail(409, 'Đăng ký không tồn tại hoặc đã được xử lý.');
        return res.json({ success: true, message: 'Đã cập nhật trạng thái dịch vụ.' });
    } catch (error) { return sendError(res, error, 'Không thể xử lý đăng ký dịch vụ.'); }
};
