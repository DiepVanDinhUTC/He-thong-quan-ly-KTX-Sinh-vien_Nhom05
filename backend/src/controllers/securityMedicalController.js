const prisma = require('../config/prisma');
const { VIOLATION_LIMIT } = require('../services/violationPolicy');
const { currentMilitaryStayWhere } = require('../services/militaryStay');
const VIOLATION_CATEGORIES = new Set(['NOISE', 'CURFEW', 'GUEST_POLICY', 'SMOKING', 'DAMAGE', 'OTHER']);
const MEDICAL_INCIDENT_TYPES = new Set(['ILLNESS', 'INJURY', 'EMERGENCY', 'MEDICATION', 'OTHER']);

const activePlacementWhere = (buildingScope) => ({
    trangThai: 'ACTIVE',
    ...(buildingScope === null ? {} : { phong: { is: { maToaNha: { in: buildingScope } } } })
});

const scopeWhere = (buildingScope) => buildingScope === null ? {} : { maToaNha: { in: buildingScope } };
const residentWhere = (buildingScope) => ({ OR: [
    { hopDongs: { some: activePlacementWhere(buildingScope) } },
    { militaryRoomAssignments: { some: militaryPlacementWhere(buildingScope) } }
] });
const text = (value, maxLength) => typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
const optionalText = (value, maxLength) => text(value, maxLength) || null;
const eventDate = (value) => {
    if (!value) return new Date();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const militaryPlacementWhere = (buildingScope, maToaNha) => ({
    ...currentMilitaryStayWhere(),
    ...(maToaNha ? { phong: { is: { maToaNha } } } : buildingScope === null ? {} : { phong: { is: { maToaNha: { in: buildingScope } } } })
});

const findPlacement = async (maSinhVien, buildingScope, maToaNha) => {
    const military = await prisma.militaryRoomAssignment.findFirst({
        where: { maSinhVien, ...militaryPlacementWhere(buildingScope, maToaNha) },
        orderBy: { startsAt: 'desc' },
        select: { maPhong: true, phong: { select: { maPhong: true, soPhong: true, maToaNha: true } } }
    });
    if (military) return military;
    return prisma.hopDong.findFirst({
    where: {
        maSinhVien,
        ...activePlacementWhere(buildingScope),
        ...(maToaNha ? { phong: { is: { maToaNha } } } : {})
    },
    orderBy: { ngayTao: 'desc' },
    select: {
        maHopDong: true,
        maPhong: true,
        phong: { select: { maPhong: true, soPhong: true, maToaNha: true } }
    }
    });
};

const residentSelect = {
    maSV: true,
    hoTen: true,
    ngaySinh: true,
    gioiTinh: true,
    lop: true,
    nienKhoa: true,
    khoa: true,
    cccd: true,
    phone: true,
    email: true,
    dienUuTien: true,
    hopDongs: {
        where: { trangThai: 'ACTIVE' },
        orderBy: { ngayTao: 'desc' },
        take: 1,
        select: {
            maHopDong: true,
            maPhong: true,
            phong: {
                select: {
                    maPhong: true,
                    soPhong: true,
                    maToaNha: true,
                    toaNha: { select: { tenToaNha: true, maKhu: true } }
                }
            }
        }
    }
};

const recordIncludes = {
    sinhVien: { select: { maSV: true, hoTen: true } },
    phong: { select: { soPhong: true } },
    toaNha: { select: { tenToaNha: true } },
    recordedBy: { select: { username: true, nhanVien: { select: { hoTen: true } } } }
};

exports.getResidents = async (req, res) => {
    try {
        const [buildings, students] = await Promise.all([
            prisma.toaNha.findMany({
                where: scopeWhere(req.buildingScope),
                orderBy: [{ maKhu: 'asc' }, { tenToaNha: 'asc' }],
                select: { maToaNha: true, tenToaNha: true, maKhu: true }
            }),
            prisma.sinhVien.findMany({
                where: residentWhere(req.buildingScope),
                orderBy: { hoTen: 'asc' },
                select: {
                    ...residentSelect,
                    hopDongs: { ...residentSelect.hopDongs, where: activePlacementWhere(req.buildingScope) },
                    militaryRoomAssignments: {
                        where: militaryPlacementWhere(req.buildingScope), orderBy: { startsAt: 'desc' }, take: 1,
                        select: { maPhong: true, phong: residentSelect.hopDongs.select.phong }
                    }
                }
            })
        ]);
        const residents = students.flatMap((student) => {
            const placement = student.militaryRoomAssignments[0] || student.hopDongs[0];
            if (!placement?.phong?.maToaNha) return [];
            return [{
                maSV: student.maSV,
                hoTen: student.hoTen,
                ngaySinh: student.ngaySinh,
                gioiTinh: student.gioiTinh,
                lop: student.lop,
                nienKhoa: student.nienKhoa,
                khoa: student.khoa,
                cccd: student.cccd,
                phone: student.phone,
                email: student.email,
                dienUuTien: student.dienUuTien,
                maHopDong: placement.maHopDong || null,
                maPhong: placement.phong.maPhong,
                soPhong: placement.phong.soPhong,
                maToaNha: placement.phong.maToaNha,
                tenToaNha: placement.phong.toaNha?.tenToaNha || '',
                maKhu: placement.phong.toaNha?.maKhu || ''
            }];
        });
        return res.status(200).json({ success: true, data: { buildings, residents } });
    } catch (error) {
        console.error(`[securityMedical.getResidents] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách cư dân trong phạm vi được phân công.' });
    }
};

exports.listAccessLogs = async (req, res) => {
    try {
        const records = await prisma.securityAccessLog.findMany({
            where: scopeWhere(req.buildingScope),
            include: recordIncludes,
            orderBy: { checkedInAt: 'desc' },
            take: 200
        });
        return res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error(`[securityMedical.listAccessLogs] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải sổ khách ra vào.' });
    }
};

exports.createAccessLog = async (req, res) => {
    const body = req.body || {};
    const visitorName = text(body.visitorName, 120);
    const purpose = text(body.purpose, 500);
    const maToaNha = text(body.maToaNha, 20);
    const visitorType = text(body.visitorType, 20) || 'GUEST';
    const checkedInAt = eventDate(body.checkedInAt);
    if (!visitorName || !purpose || !maToaNha || !checkedInAt) {
        return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khách, tòa nhà, mục đích và thời điểm vào hợp lệ.' });
    }
    if (!['GUEST', 'DELIVERY', 'SERVICE', 'OTHER'].includes(visitorType)) {
        return res.status(400).json({ success: false, message: 'Loại khách không hợp lệ.' });
    }

    try {
        let placement = null;
        const maSinhVien = optionalText(body.maSinhVien, 20);
        if (maSinhVien) {
            placement = await findPlacement(maSinhVien, req.buildingScope, maToaNha);
            if (!placement) return res.status(400).json({ success: false, message: 'Sinh viên không có hợp đồng lưu trú hiệu lực tại tòa nhà đã chọn.' });
        }
        const record = await prisma.securityAccessLog.create({
            data: {
                maToaNha,
                maSinhVien,
                maPhong: placement?.maPhong || null,
                visitorName,
                visitorPhone: optionalText(body.visitorPhone, 20),
                visitorType,
                vehiclePlate: optionalText(body.vehiclePlate, 20),
                purpose,
                note: optionalText(body.note, 500),
                checkedInAt,
                recordedById: req.user.id
            },
            include: recordIncludes
        });
        return res.status(201).json({ success: true, message: 'Đã ghi nhận khách vào KTX.', data: record });
    } catch (error) {
        console.error(`[securityMedical.createAccessLog] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lưu lượt khách ra vào.' });
    }
};

exports.checkoutAccessLog = async (req, res) => {
    const accessLogId = req.params.accessLogId;
    try {
        const result = await prisma.securityAccessLog.updateMany({
            where: { id: accessLogId, checkedOutAt: null, ...scopeWhere(req.buildingScope) },
            data: { checkedOutAt: new Date() }
        });
        if (!result.count) {
            const existing = await prisma.securityAccessLog.findFirst({ where: { id: accessLogId, ...scopeWhere(req.buildingScope) }, select: { id: true } });
            if (!existing) return res.status(404).json({ success: false, message: 'Không tìm thấy lượt khách trong tòa nhà được phân công.' });
            return res.status(409).json({ success: false, message: 'Lượt khách này đã được ghi nhận ra khỏi KTX.' });
        }
        const record = await prisma.securityAccessLog.findUnique({ where: { id: accessLogId }, include: recordIncludes });
        return res.status(200).json({ success: true, message: 'Đã ghi nhận khách ra khỏi KTX.', data: record });
    } catch (error) {
        console.error(`[securityMedical.checkoutAccessLog] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể cập nhật giờ khách ra.' });
    }
};

exports.listViolations = async (req, res) => {
    try {
        const records = await prisma.securityViolation.findMany({
            where: scopeWhere(req.buildingScope),
            include: recordIncludes,
            orderBy: { occurredAt: 'desc' },
            take: 200
        });
        return res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error(`[securityMedical.listViolations] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải biên bản vi phạm.' });
    }
};

exports.violationSummary = async (_req, res) => {
    try {
        const counts = await prisma.securityViolation.groupBy({ by: ['maSinhVien'], _count: { _all: true } });
        const students = await prisma.sinhVien.findMany({ where: { maSV: { in: counts.map((item) => item.maSinhVien) } }, select: { maSV: true, hoTen: true } });
        const names = new Map(students.map((student) => [student.maSV, student.hoTen]));
        const data = counts.map((item) => ({ maSinhVien: item.maSinhVien, hoTen: names.get(item.maSinhVien), count: item._count._all })).sort((a, b) => b.count - a.count);
        return res.status(200).json({ success: true, data, threshold: VIOLATION_LIMIT });
    } catch (error) {
        console.error(`[securityMedical.violationSummary] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải thống kê vi phạm.' });
    }
};

exports.createViolation = async (req, res) => {
    const body = req.body || {};
    const maSinhVien = text(body.maSinhVien, 20);
    const category = text(body.category, 40);
    const severity = text(body.severity, 12) || 'LOW';
    const description = text(body.description, 2000);
    const occurredAt = eventDate(body.occurredAt);
    if (!maSinhVien || !category || !description || !occurredAt) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn sinh viên, nhóm vi phạm, mô tả và thời điểm hợp lệ.' });
    }
    if (!VIOLATION_CATEGORIES.has(category)) return res.status(400).json({ success: false, message: 'Nhóm vi phạm không hợp lệ.' });
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(severity)) {
        return res.status(400).json({ success: false, message: 'Mức độ vi phạm không hợp lệ.' });
    }

    try {
        const placement = await findPlacement(maSinhVien, req.buildingScope);
        if (!placement) return res.status(400).json({ success: false, message: 'Sinh viên không có hợp đồng lưu trú hiệu lực trong phạm vi được phân công.' });
        const record = await prisma.securityViolation.create({
            data: {
                maToaNha: placement.phong.maToaNha,
                maSinhVien,
                maPhong: placement.maPhong,
                category,
                severity,
                description,
                actionTaken: optionalText(body.actionTaken, 1000),
                occurredAt,
                recordedById: req.user.id
            },
            include: recordIncludes
        });
        return res.status(201).json({ success: true, message: 'Đã ghi nhận biên bản vi phạm nội quy.', data: record });
    } catch (error) {
        console.error(`[securityMedical.createViolation] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lưu biên bản vi phạm.' });
    }
};

exports.listHealthRecords = async (req, res) => {
    try {
        const records = await prisma.medicalRecord.findMany({
            where: { sinhVien: { is: residentWhere(req.buildingScope) } },
            include: { sinhVien: { select: { maSV: true, hoTen: true } } },
            orderBy: { updatedAt: 'desc' }
        });
        return res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error(`[securityMedical.listHealthRecords] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải hồ sơ sức khỏe.' });
    }
};

exports.getHealthRecord = async (req, res) => {
    try {
        const record = await prisma.medicalRecord.findFirst({
            where: {
                maSinhVien: req.params.maSV,
                sinhVien: { is: residentWhere(req.buildingScope) }
            },
            include: { sinhVien: { select: { maSV: true, hoTen: true } } }
        });
        return res.status(200).json({ success: true, data: record });
    } catch (error) {
        console.error(`[securityMedical.getHealthRecord] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải hồ sơ sức khỏe.' });
    }
};

exports.saveHealthRecord = async (req, res) => {
    const maSinhVien = req.params.maSV;
    const body = req.body || {};
    try {
        const placement = await findPlacement(maSinhVien, req.buildingScope);
        if (!placement) return res.status(404).json({ success: false, message: 'Không tìm thấy sinh viên nội trú trong phạm vi được phân công.' });
        const data = {
            bloodType: optionalText(body.bloodType, 8),
            allergies: optionalText(body.allergies, 1000),
            medicalConditions: optionalText(body.medicalConditions, 2000),
            currentMedications: optionalText(body.currentMedications, 1000),
            emergencyContactName: optionalText(body.emergencyContactName, 120),
            emergencyContactPhone: optionalText(body.emergencyContactPhone, 20),
            notes: optionalText(body.notes, 2000),
            updatedById: req.user.id
        };
        const record = await prisma.medicalRecord.upsert({
            where: { maSinhVien },
            create: { maSinhVien, ...data },
            update: data,
            include: { sinhVien: { select: { maSV: true, hoTen: true } } }
        });
        return res.status(200).json({ success: true, message: 'Đã lưu hồ sơ sức khỏe.', data: record });
    } catch (error) {
        console.error(`[securityMedical.saveHealthRecord] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lưu hồ sơ sức khỏe.' });
    }
};

exports.listMedicalIncidents = async (req, res) => {
    try {
        const records = await prisma.medicalIncident.findMany({
            where: scopeWhere(req.buildingScope),
            include: recordIncludes,
            orderBy: { occurredAt: 'desc' },
            take: 200
        });
        return res.status(200).json({ success: true, data: records });
    } catch (error) {
        console.error(`[securityMedical.listMedicalIncidents] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể tải sổ sự cố y tế.' });
    }
};

exports.createMedicalIncident = async (req, res) => {
    const body = req.body || {};
    const maSinhVien = text(body.maSinhVien, 20);
    const incidentType = text(body.incidentType, 40);
    const symptoms = text(body.symptoms, 2000);
    const treatment = text(body.treatment, 2000);
    const occurredAt = eventDate(body.occurredAt);
    const medicationName = optionalText(body.medicationName, 160);
    const quantity = body.medicationQuantity === '' || body.medicationQuantity == null ? null : Number(body.medicationQuantity);
    if (!maSinhVien || !incidentType || !symptoms || !treatment || !occurredAt) {
        return res.status(400).json({ success: false, message: 'Vui lòng chọn sinh viên và nhập loại sự cố, biểu hiện, cách xử lý.' });
    }
    if (!MEDICAL_INCIDENT_TYPES.has(incidentType)) return res.status(400).json({ success: false, message: 'Loại sự cố y tế không hợp lệ.' });
    if (quantity !== null && (!Number.isInteger(quantity) || quantity < 1)) {
        return res.status(400).json({ success: false, message: 'Số lượng thuốc phải là số nguyên dương.' });
    }

    try {
        const placement = await findPlacement(maSinhVien, req.buildingScope);
        if (!placement) return res.status(400).json({ success: false, message: 'Sinh viên không có hợp đồng lưu trú hiệu lực trong phạm vi được phân công.' });
        const record = await prisma.medicalIncident.create({
            data: {
                maToaNha: placement.phong.maToaNha,
                maSinhVien,
                maPhong: placement.maPhong,
                incidentType,
                symptoms,
                treatment,
                medicationName,
                medicationDose: optionalText(body.medicationDose, 120),
                medicationQuantity: quantity,
                followUp: optionalText(body.followUp, 1000),
                occurredAt,
                recordedById: req.user.id
            },
            include: recordIncludes
        });
        return res.status(201).json({ success: true, message: 'Đã ghi nhận sự cố y tế.', data: record });
    } catch (error) {
        console.error(`[securityMedical.createMedicalIncident] ${error.code || 'ERROR'}: ${error.message}`);
        return res.status(500).json({ success: false, message: 'Không thể lưu sự cố y tế.' });
    }
};
