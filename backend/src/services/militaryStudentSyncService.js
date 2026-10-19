const axios = require('axios');
const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { fetchStudentsFromSis, requestSis } = require('./sisStudentSource');
const ACCEPTED_REGISTRATION_STATUSES = new Set([
    'REGISTERED', 'ENROLLED', 'APPROVED', 'CONFIRMED',
    'DA_DANG_KY', 'DANG_KY', 'DA_XAC_NHAN', 'DA_DUYET'
]);

const text = (value) => value === undefined || value === null ? '' : String(value).trim();
const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && text(value) !== '');
const normalizeCode = (value) => text(value).toUpperCase();
const csvSet = (value) => new Set(String(value || '').split(',').map(normalizeCode).filter(Boolean));
const normalizeStatus = (value) => text(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
const field = (source, ...paths) => {
    for (const path of paths) {
        const value = path.split('.').reduce((current, key) => current?.[key], source);
        if (value !== undefined && value !== null && text(value) !== '') return value;
    }
    return undefined;
};
const getCohort = (student) => {
    const cohort = text(student.nienKhoa);
    if (/^K6[2-7]$/i.test(cohort)) return cohort.toUpperCase();
    const fromClass = text(student.lop).match(/K6[2-7]/i)?.[0]?.toUpperCase();
    return fromClass || undefined;
};
const parseGender = (value) => {
    if (typeof value === 'boolean') return value;
    const normalized = text(value).toLowerCase();
    if (['true', '1', 'nam', 'male', 'm'].includes(normalized)) return true;
    if (['false', '0', 'nữ', 'nu', 'female', 'f'].includes(normalized)) return false;
    return undefined;
};

const getRegistrations = (payload) => {
    const candidates = [payload, payload?.data, payload?.registrations, payload?.items, payload?.data?.registrations, payload?.data?.items];
    return candidates.find(Array.isArray);
};

const hasRegistrationMetadata = (student) => Boolean(field(
    student,
    'maHocPhan', 'courseCode', 'hocPhan.maHocPhan', 'course.code',
    'maDot', 'batchCode', 'dotHoc.maDot', 'batch.code', 'termCode',
    'maKhoa', 'facultyCode', 'khoa.maKhoa', 'faculty.code'
));

const getStudentRegistrations = (students) => students.flatMap((source) => {
    const student = source && typeof source === 'object' ? source : {};
    const registrationList = [
        student.courseRegistrations,
        student.courseEnrollments,
        student.enrollments,
        student.registrations,
        student.dangKyHocPhans,
        student.hocPhanDangKys
    ].find(Array.isArray);

    if (registrationList) {
        return registrationList.map((registration) => {
            const record = registration && typeof registration === 'object' ? registration : {};
            return {
                ...record,
                student: record.student || record.sinhVien || record.studentInfo || student
            };
        });
    }

    return hasRegistrationMetadata(student) ? [student] : [];
});

const getRegistrationMetadata = (registration) => {
    const record = registration && typeof registration === 'object' ? registration : {};
    const candidate = record.sinhVien || record.student || record.studentInfo || record;
    const student = candidate && typeof candidate === 'object' ? candidate : record;
    return {
        student,
        courseCode: text(firstValue(
            field(record, 'maHocPhan', 'courseCode', 'hocPhan.maHocPhan', 'course.code'),
            field(student, 'maHocPhan', 'courseCode', 'hocPhan.maHocPhan', 'course.code')
        )),
        facultyCode: text(firstValue(
            field(record, 'maKhoa', 'facultyCode', 'khoa.maKhoa', 'faculty.code'),
            field(student, 'maKhoa', 'facultyCode', 'khoa.maKhoa', 'faculty.code')
        )),
        batchCode: text(firstValue(
            field(record, 'maDot', 'batchCode', 'dotHoc.maDot', 'batch.code', 'termCode'),
            field(student, 'maDot', 'batchCode', 'dotHoc.maDot', 'batch.code', 'termCode')
        )),
        status: normalizeStatus(field(record, 'trangThaiDangKy', 'registrationStatus', 'trangThai', 'status'))
    };
};

const normalizeStudent = (source) => {
    const maSV = text(firstValue(source.maSV, source.studentCode, source.studentId, source.code));
    const ngaySinhRaw = firstValue(source.ngaySinh, source.dateOfBirth, source.birthDate);
    const ngaySinh = ngaySinhRaw ? new Date(ngaySinhRaw) : null;
    const normalized = {
        maSV,
        hoTen: text(firstValue(source.hoTen, source.fullName, source.name)),
        ngaySinh,
        gioiTinh: parseGender(firstValue(source.gioiTinh, source.gender, source.sex)),
        lop: text(firstValue(source.lop, source.className, source.classCode)),
        nienKhoa: getCohort({ nienKhoa: firstValue(source.nienKhoa, source.cohort), lop: firstValue(source.lop, source.className, source.classCode) }),
        khoa: text(firstValue(source.tenKhoa, source.facultyName, source.khoa?.tenKhoa, source.faculty?.name, source.khoa, source.facultyCode, source.maKhoa)),
        cccd: text(firstValue(source.cccd, source.cmnd, source.nationalId, source.identityNumber)),
        phone: text(firstValue(source.phone, source.soDienThoai, source.mobile)),
        email: text(firstValue(source.email, source.emailAddress)),
        dienUuTien: firstValue(source.dienUuTien, source.priority) ? text(firstValue(source.dienUuTien, source.priority)) : null
    };
    if (!normalized.ngaySinh || Number.isNaN(normalized.ngaySinh.getTime())) normalized.ngaySinh = null;
    return normalized;
};

const configurationError = (message) => Object.assign(new Error(message), { status: 400, code: 'SIS_CONFIGURATION' });

const validateConfiguration = (env) => {
    const sharedStudentEndpoint = Boolean(text(env.SIS_UTC_API_URL));
    const url = text(env.SIS_UTC_API_URL || env.SIS_GDQP_REGISTRATIONS_API_URL);
    const missing = [];
    if (!url) missing.push('SIS_UTC_API_URL (hoặc SIS_GDQP_REGISTRATIONS_API_URL cho cấu hình cũ)');
    for (const key of ['SIS_GDQP_COURSE_CODE', 'SIS_GDQP_BATCHES', 'SIS_GDQP_FACULTY_CODES']) {
        if (!text(env[key])) missing.push(key);
    }
    if (missing.length) throw configurationError(`Thiếu cấu hình đồng bộ học viên GDQP: ${missing.join(', ')}.`);
    const batches = csvSet(env.SIS_GDQP_BATCHES);
    const facultyCodes = csvSet(env.SIS_GDQP_FACULTY_CODES);
    if (!batches.size) throw configurationError('SIS_GDQP_BATCHES phải chứa ít nhất một mã đợt.');
    if (!facultyCodes.size) throw configurationError('SIS_GDQP_FACULTY_CODES phải chứa ít nhất một mã khoa.');
    return {
        url,
        sharedStudentEndpoint,
        courseCode: normalizeCode(env.SIS_GDQP_COURSE_CODE),
        batches,
        facultyCodes,
        timeoutMs: Number(env.SIS_GDQP_API_TIMEOUT_MS) || 20000,
        defaultPassword: env.SIS_MILITARY_STUDENT_DEFAULT_PASSWORD || env.SIS_STUDENT_DEFAULT_PASSWORD || 'Ktx@2026'
    };
};

const selectRegistrations = (registrations, config) => {
    const rejected = [];
    const byStudent = new Map();
    for (const registration of registrations) {
        const metadata = getRegistrationMetadata(registration);
        const maSV = text(firstValue(metadata.student.maSV, metadata.student.studentCode, metadata.student.studentId, metadata.student.code));
        let reason = '';
        if (!metadata.courseCode || normalizeCode(metadata.courseCode) !== config.courseCode) reason = 'Không thuộc học phần GDQP đã cấu hình hoặc thiếu mã học phần.';
        else if (!metadata.facultyCode || !config.facultyCodes.has(normalizeCode(metadata.facultyCode))) reason = 'Không thuộc khoa được cấu hình hoặc thiếu mã khoa.';
        else if (!metadata.batchCode || !config.batches.has(normalizeCode(metadata.batchCode))) reason = 'Không thuộc đợt học được cấu hình hoặc thiếu mã đợt.';
        else if (metadata.status && !ACCEPTED_REGISTRATION_STATUSES.has(metadata.status)) reason = 'Đăng ký học phần chưa được xác nhận.';
        else if (!maSV) reason = 'Thiếu mã sinh viên.';

        if (!maSV) {
            rejected.push({ maSV: null, reason: reason || 'Thiếu mã sinh viên.' });
            continue;
        }
        const group = byStudent.get(maSV) || { selected: null, reasons: [] };
        if (reason) group.reasons.push(reason);
        else if (!group.selected) group.selected = { registration, student: normalizeStudent(metadata.student), metadata };
        byStudent.set(maSV, group);
    }

    const selected = [];
    for (const [maSV, group] of byStudent) {
        if (group.selected) selected.push(group.selected);
        else rejected.push({ maSV, reason: [...new Set(group.reasons)].join(' ') || 'Không có đăng ký GDQP hợp lệ.' });
    }
    return { selected, rejected };
};

const createMilitaryStudentSyncService = ({ db = prisma, httpClient = axios, hashPassword = bcrypt.hash, env = process.env } = {}) => async () => {
    const config = validateConfiguration(env);
    let registrations;
    if (config.sharedStudentEndpoint) {
        const students = await fetchStudentsFromSis({ httpClient, env });
        registrations = getStudentRegistrations(students);
    } else {
        const response = await requestSis({ httpClient, url: config.url, options: {
            timeout: config.timeoutMs,
            headers: env.SIS_API_TOKEN ? { Authorization: `Bearer ${env.SIS_API_TOKEN}` } : undefined,
            params: {
                courseCode: config.courseCode,
                batches: [...config.batches].join(','),
                facultyCodes: [...config.facultyCodes].join(',')
            }
        } });
        registrations = getRegistrations(response.data);
    }
    if (!registrations) throw Object.assign(new Error('API SIS kết nối được nhưng không trả về danh sách đăng ký học phần hợp lệ.'), { status: 502, code: 'SIS_INVALID_RESPONSE' });

    const { selected, rejected } = selectRegistrations(registrations, config);
    const passwordHash = selected.length ? await hashPassword(config.defaultPassword, 12) : null;
    const result = { received: registrations.length, selected: selected.length, createdAccounts: 0, militaryStudentsMarked: 0, linkedProfiles: 0, skipped: rejected };

    const syncOneStudent = async (item) => {
        const student = item.student;
        try {
            const outcome = await db.$transaction(async (tx) => {
                const existingProfile = await tx.sinhVien.findUnique({ where: { maSV: student.maSV } });
                const usernameAccount = await tx.user.findUnique({ where: { username: student.maSV } });
                const profileFields = Object.fromEntries(
                    Object.entries(student).filter(([key, value]) => key !== 'maSV' && value !== null && value !== '')
                );
                const militaryProfileFields = { ...profileFields, laHocVienQuanSu: true };
                if (!existingProfile) {
                    const missing = ['hoTen', 'ngaySinh', 'gioiTinh', 'lop', 'khoa', 'cccd', 'phone', 'email']
                        .filter((key) => profileFields[key] === undefined);
                    if (missing.length) throw new Error(`Thiếu dữ liệu hồ sơ bắt buộc: ${missing.join(', ')}.`);
                }

                let account = existingProfile?.userId
                    ? await tx.user.findUnique({ where: { id: existingProfile.userId } })
                    : usernameAccount;
                let createdAccount = false;
                let linkedProfile = false;

                if (account && !['STUDENT', 'MILITARY_STUDENT'].includes(account.role)) {
                    throw new Error('Tài khoản cùng mã đã tồn tại với vai trò khác; cần kiểm tra thủ công.');
                }
                if (!account) {
                    account = await tx.user.create({
                        data: { username: student.maSV, password: passwordHash, role: 'MILITARY_STUDENT', isActive: true }
                    });
                    createdAccount = true;
                }

                if (existingProfile) {
                    if (!existingProfile.userId) {
                        await tx.sinhVien.update({ where: { maSV: student.maSV }, data: { ...militaryProfileFields, userId: account.id } });
                        linkedProfile = true;
                    } else {
                        await tx.sinhVien.update({ where: { maSV: student.maSV }, data: militaryProfileFields });
                    }
                } else {
                    await tx.sinhVien.create({ data: { maSV: student.maSV, ...militaryProfileFields, userId: account.id } });
                    linkedProfile = true;
                }
                return { createdAccount, linkedProfile };
            });
            return { student, outcome };
        } catch (error) {
            return { student, error };
        }
    };

    const batchSize = 5;
    for (let index = 0; index < selected.length; index += batchSize) {
        const outcomes = await Promise.all(selected.slice(index, index + batchSize).map(syncOneStudent));
        for (const { student, outcome, error } of outcomes) {
            if (error) {
                result.skipped.push({ maSV: student.maSV, reason: error.message });
                continue;
            }
            if (outcome.createdAccount) result.createdAccounts += 1;
            result.militaryStudentsMarked += 1;
            if (outcome.linkedProfile) result.linkedProfiles += 1;
        }
    }
    return result;
};

module.exports = {
    createMilitaryStudentSyncService,
    selectRegistrations,
    validateConfiguration
};
