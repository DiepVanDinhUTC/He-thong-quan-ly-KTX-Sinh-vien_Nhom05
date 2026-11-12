const { randomBytes, randomInt } = require('crypto');
const { createMilitaryStudentSyncService } = require('./militaryStudentSyncService');
const { assignMilitaryStudentsToA1 } = require('./militaryRoomAssignmentService');

const surnames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Vũ', 'Đặng', 'Bùi'];
const maleNames = ['An', 'Bảo', 'Dũng', 'Hải', 'Hưng', 'Minh', 'Nam', 'Quân'];
const femaleNames = ['Anh', 'Chi', 'Hà', 'Hạnh', 'Lan', 'Linh', 'Ngọc', 'Trang'];
const majors = [
    ['CNTT', 'Công nghệ thông tin'], ['KTXD', 'Công trình'],
    ['KTVT', 'Vận tải - Kinh tế'], ['KTDK', 'Điện - Điện tử'], ['KCK', 'Cơ khí']
];
const pick = (items) => items[randomInt(items.length)];

// QLĐT is currently a local simulated source, independent of the SIS integration.
const generateQldtRegistrations = () => Array.from({ length: 50 }, (_, index) => {
    const male = index % 2 === 0;
    const [major, faculty] = pick(majors);
    const code = `QLDT${randomBytes(7).toString('hex').toUpperCase()}`;
    return {
        courseCode: 'GDQP101', facultyCode: 'QLDT', batchCode: 'QLDT', registrationStatus: 'REGISTERED',
        student: {
            maSV: code, hoTen: `${pick(surnames)} ${male ? 'Văn' : 'Thị'} ${pick(male ? maleNames : femaleNames)}`,
            ngaySinh: new Date(Date.UTC(2003 + randomInt(4), randomInt(12), 1 + randomInt(28))).toISOString(),
            gioiTinh: male, lop: `${major}${1 + randomInt(4)}-K${64 + randomInt(3)}`,
            khoa: faculty, cccd: String(randomInt(100000000000, 1000000000000)),
            phone: `09${String(randomInt(100000000)).padStart(8, '0')}`,
            email: `${code.toLowerCase()}@example.test`
        }
    };
});

const createQldtMilitarySync = ({ db, hashPassword, generate = generateQldtRegistrations, assign = assignMilitaryStudentsToA1, env = process.env } = {}) => async ({ assignedById }) => {
    if (!assignedById) throw Object.assign(new Error('Thiếu tài khoản thực hiện đồng bộ.'), { status: 400 });
    const registrations = generate();
    const sync = createMilitaryStudentSyncService({
        db, hashPassword,
        httpClient: { get: async () => ({ data: { data: registrations } }) },
        env: {
            SIS_GDQP_REGISTRATIONS_API_URL: 'qldt-mock', SIS_GDQP_COURSE_CODE: 'GDQP101',
            SIS_GDQP_BATCHES: 'QLDT', SIS_GDQP_FACULTY_CODES: 'QLDT',
            SIS_MILITARY_STUDENT_DEFAULT_PASSWORD: env.QLDT_MILITARY_STUDENT_DEFAULT_PASSWORD || 'Ktx@2026'
        }
    });
    const result = await sync();
    if (result.studentIds.length) {
        try {
            result.roomAssignment = await assign({ db, assignedById, studentIds: result.studentIds });
        } catch (error) {
            console.error('[qldt.gdqp] Không thể tự xếp phòng:', error.message);
            result.roomAssignmentError = error.status && error.status < 500 ? error.message : 'Không thể xếp phòng tự động. Hãy thử lại tại Xếp phòng quân sự.';
        }
    }
    return result;
};

module.exports = { generateQldtRegistrations, createQldtMilitarySync };
