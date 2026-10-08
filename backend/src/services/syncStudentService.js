const axios = require('axios');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const getCohort = (student) => {
    const supported = ['K62', 'K63', 'K64', 'K65', 'K66', 'K67'];
    if (supported.includes(student.nienKhoa)) return student.nienKhoa;
    const fromClass = String(student.lop || '').match(/K6[2-7]/i)?.[0]?.toUpperCase();
    if (fromClass) return fromClass;
    const studentCode = String(student.maSV || '');
    const year = Number(studentCode.slice(0, 2)) || Number(studentCode.slice(3, 5));
    if (year >= 21 && year <= 26) return `K${year + 41}`;
    const checksum = [...studentCode].reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return `K${62 + (checksum % 6)}`;
};

exports.syncStudentsFromSis = async () => {
    try {
        const response = await axios.get(process.env.SIS_UTC_API_URL, { timeout: 15000 });
        const studentsData = response.data?.data;
        if (!Array.isArray(studentsData)) throw new Error('API SIS không trả về danh sách hồ sơ hợp lệ.');

        const defaultPassword = process.env.SIS_STUDENT_DEFAULT_PASSWORD || 'Ktx@2026';
        const defaultPasswordHash = await bcrypt.hash(defaultPassword, 12);
        let createdAccounts = 0;

        for (const student of studentsData) {
            await prisma.$transaction(async (tx) => {
                const profile = await tx.sinhVien.upsert({
                    where: { maSV: student.maSV },
                    update: {
                        hoTen: student.hoTen,
                        ngaySinh: new Date(student.ngaySinh),
                        gioiTinh: student.gioiTinh,
                        lop: student.lop,
                        nienKhoa: getCohort(student),
                        khoa: student.khoa,
                        cccd: student.cccd,
                        phone: student.phone,
                        email: student.email,
                        dienUuTien: student.dienUuTien,
                        trangThaiNoiTru: student.trangThaiNoiTru
                    },
                    create: {
                        maSV: student.maSV,
                        hoTen: student.hoTen,
                        ngaySinh: new Date(student.ngaySinh),
                        gioiTinh: student.gioiTinh,
                        lop: student.lop,
                        nienKhoa: getCohort(student),
                        khoa: student.khoa,
                        cccd: student.cccd,
                        phone: student.phone,
                        email: student.email,
                        dienUuTien: student.dienUuTien,
                        trangThaiNoiTru: student.trangThaiNoiTru
                    }
                });

                if (profile.userId) return;

                let account = await tx.user.findUnique({ where: { username: student.maSV } });
                if (!account) {
                    account = await tx.user.create({
                        data: {
                            username: student.maSV,
                            password: defaultPasswordHash,
                            role: 'STUDENT',
                            isActive: true
                        }
                    });
                    createdAccounts++;
                }

                if (account.role !== 'STUDENT') {
                    throw new Error(`Tài khoản ${student.maSV} đã tồn tại nhưng không phải tài khoản sinh viên.`);
                }

                await tx.sinhVien.update({
                    where: { maSV: student.maSV },
                    data: { userId: account.id }
                });
            });
        }

        return { success: true, count: studentsData.length, createdAccounts };
    } catch (error) {
        console.error('[sis.sync]', error.message);
        throw new Error(error.message.includes('API SIS') || error.message.includes('Tài khoản')
            ? error.message
            : 'Không thể đồng bộ dữ liệu từ hệ thống Phòng Đào tạo.');
    }
};
