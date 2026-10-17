const BLOOD_GROUPS = new Set([
    "A", "B", "AB", "O", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"
]);

class InputError extends Error {}

const invalid = (message) => {
    throw new InputError(message);
};

const bodyObject = (body) => {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
        invalid("Nội dung yêu cầu phải là một đối tượng JSON");
    }
    return body;
};

const text = (value, name, maxLength, required = false) => {
    if (value === null && !required) return null;
    if (typeof value !== "string") invalid(`${name} phải là chuỗi`);

    const normalized = value.trim();
    if (required && !normalized) invalid(`${name} không được để trống`);
    if (normalized.length > maxLength) invalid(`${name} không được vượt quá ${maxLength} ký tự`);
    return normalized;
};

const studentId = (value) => text(value, "Mã sinh viên", 20, true);

const optionalTextFields = (body, fields) => {
    const data = {};
    for (const [field, maxLength] of Object.entries(fields)) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            data[field] = text(body[field], field, maxLength);
        }
    }
    return data;
};

const profileData = (body) => {
    const data = optionalTextFields(body, { nhomMau: 10, diUng: 500, benhNen: 500, ghiChu: 1000 });
    if (typeof data.nhomMau === "string") {
        data.nhomMau = data.nhomMau.toUpperCase();
        if (data.nhomMau && !BLOOD_GROUPS.has(data.nhomMau)) invalid("Nhóm máu không hợp lệ");
        if (!data.nhomMau) data.nhomMau = null;
    }
    return data;
};

const visitDate = (value) => {
    if (typeof value !== "string") invalid("Ngày khám phải là chuỗi ngày ISO 8601");
    // Chấp nhận YYYY-MM-DD hoặc thời điểm ISO có múi giờ để tránh ngày phụ thuộc máy chủ.
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/.exec(value);
    if (!match) invalid("Ngày khám không hợp lệ; dùng YYYY-MM-DD hoặc thời điểm ISO có múi giờ");

    const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]
        || Number(hourText || 0) > 23 || Number(minuteText || 0) > 59 || Number(secondText || 0) > 59) {
        invalid("Ngày khám không tồn tại hoặc thời gian không hợp lệ");
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime()) || parsed.getUTCFullYear() < 1 || parsed.getUTCFullYear() > 9999) {
        invalid("Ngày khám không hợp lệ");
    }
    return parsed;
};

const validateRequest = (validate) => (req, res, next) => {
    try {
        validate(req);
        return next();
    } catch (error) {
        if (!(error instanceof InputError)) return next(error);
        return res.status(400).json({ success: false, message: error.message });
    }
};

exports.validateMaSV = validateRequest((req) => {
    req.params.maSV = studentId(req.params.maSV);
});

exports.validateTaoHoSo = validateRequest((req) => {
    const body = bodyObject(req.body);
    req.body = { maSinhVien: studentId(body.maSinhVien), ...profileData(body) };
});

exports.validateCapNhatHoSo = validateRequest((req) => {
    const data = profileData(bodyObject(req.body));
    if (Object.keys(data).length === 0) invalid("Không có thông tin cần cập nhật");
    req.body = data;
});

exports.validateThemLichSuKham = validateRequest((req) => {
    const body = bodyObject(req.body);
    req.body = {
        maSinhVien: studentId(body.maSinhVien),
        trieuChung: text(body.trieuChung, "Triệu chứng", 1000, true),
        ...optionalTextFields(body, { ketLuan: 1000, huongXuLy: 1000, ghiChu: 1000 })
    };
    if (Object.prototype.hasOwnProperty.call(body, "ngayKham")) {
        req.body.ngayKham = visitDate(body.ngayKham);
    }
});
