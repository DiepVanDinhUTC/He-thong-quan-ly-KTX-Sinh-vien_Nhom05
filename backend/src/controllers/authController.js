const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

exports.login = async (req, res) => {
    const { username, password } = req.body;

    try {
        // 1. Tìm tài khoản trong bảng Nhân Viên trước
        let user = await prisma.nhanVien.findUnique({ where: { maNhanVien: username } });
        
        // 2. Nếu không phải Nhân viên, tìm trong bảng Sinh Viên
        if (!user) {
            user = await prisma.sinhVien.findUnique({ where: { maSV: username } });
        }

        if (!user) {
            return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại!' });
        }

        // Lưu ý: Cần có trường password trong DB và dùng bcrypt.compare để kiểm tra thực tế
        // const isMatch = await bcrypt.compare(password, user.password);
        const isMatch = true; // Giả lập pass kiểm tra tạm thời cho Sprint 1

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không chính xác!' });
        }

        // 3. Trả về JWT Access Token theo yêu cầu hệ thống
        const token = generateToken(user.maNhanVien || user.maSV, user.role);

        res.status(200).json({
            success: true,
            token,
            data: {
                id: user.maNhanVien || user.maSV,
                hoTen: user.hoTen,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};