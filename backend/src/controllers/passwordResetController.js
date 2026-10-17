const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const RESET_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const genericMessage = 'Nếu thông tin khớp với tài khoản sinh viên, hướng dẫn đặt lại mật khẩu sẽ được gửi.';

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');
const findStudentAccount = async (db, identifier) => {
    const rows = await db.$queryRaw`
        SELECT TOP (1) ua.id AS userId, ua.role, ua.isActive, sv.email, sv.hoTen
        FROM SINH_VIEN AS sv
        INNER JOIN USER_ACCOUNT AS ua ON ua.id = sv.userId
        WHERE sv.maSV = ${identifier} OR LOWER(sv.email) = LOWER(${identifier})
    `;
    return rows[0] || null;
};

const clearResetTokens = (db, userId) => db.$executeRaw`
    DELETE FROM PASSWORD_RESET_TOKEN WHERE userId = ${userId}
`;

const safeHashMatch = (code, storedHash) => crypto.timingSafeEqual(
    Buffer.from(hashCode(code), 'hex'),
    Buffer.from(storedHash, 'hex')
);

const sendCodeByEmail = async (email, fullName, code) => {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: process.env.MAIL_FROM,
            to: [email],
            subject: 'Mã đặt lại mật khẩu KTX',
            text: `Xin chào ${fullName}, mã xác minh đặt lại mật khẩu của bạn là ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`
        })
    });
    if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
};

exports.requestReset = async (req, res) => {
    const identifier = String(req.body?.identifier || '').trim();
    if (!identifier) return res.status(400).json({ success: false, message: 'Vui lòng nhập mã sinh viên hoặc email.' });

    const debugCodeEnabled = process.env.NODE_ENV !== 'production'
        && process.env.ENABLE_DEBUG_RESET_CODES === 'true';
    const emailConfigured = Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
    if (!debugCodeEnabled && !emailConfigured) {
        return res.status(503).json({
            success: false,
            message: 'Chức năng gửi mã chưa được cấu hình. Quản trị viên cần cấu hình email hoặc bật mã thử nghiệm trong môi trường phát triển.'
        });
    }

    try {
        const student = await findStudentAccount(prisma, identifier);

        if (!student || student.role !== 'STUDENT' || !student.isActive) {
            return res.status(200).json({ success: true, message: genericMessage });
        }

        const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
        await clearResetTokens(prisma, student.userId);
        await prisma.$executeRaw`
            INSERT INTO PASSWORD_RESET_TOKEN (id, userId, tokenHash, expiresAt, attempts, createdAt)
            VALUES (${crypto.randomUUID()}, ${student.userId}, ${hashCode(code)}, ${new Date(Date.now() + RESET_TTL_MS)}, 0, SYSUTCDATETIME())
        `;

        if (emailConfigured) {
            try {
                await sendCodeByEmail(student.email, student.hoTen, code);
            } catch (error) {
                await clearResetTokens(prisma, student.userId);
                console.error('[password-reset.email]', error.message);
                return res.status(502).json({ success: false, message: 'Không gửi được email xác minh. Vui lòng thử lại sau.' });
            }
        }

        const response = { success: true, message: genericMessage };
        if (debugCodeEnabled) response.debugCode = code;
        return res.status(200).json(response);
    } catch (error) {
        console.error('[password-reset.request]', error.message);
        return res.status(500).json({ success: false, message: 'Không thể tạo yêu cầu đặt lại mật khẩu lúc này.' });
    }
};

exports.confirmReset = async (req, res) => {
    const identifier = String(req.body?.identifier || '').trim();
    const code = String(req.body?.code || '').trim();
    const newPassword = String(req.body?.newPassword || '');
    if (!identifier || !/^\d{6}$/.test(code) || newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Nhập mã gồm 6 chữ số và mật khẩu mới có ít nhất 8 ký tự.'
        });
    }

    try {
        const student = await findStudentAccount(prisma, identifier);
        if (!student || student.role !== 'STUDENT' || !student.isActive) {
            return res.status(400).json({ success: false, message: 'Mã xác minh không hợp lệ hoặc đã hết hạn.' });
        }

        const resetRows = await prisma.$queryRaw`
            SELECT TOP (1) id, tokenHash, expiresAt, attempts
            FROM PASSWORD_RESET_TOKEN
            WHERE userId = ${student.userId}
            ORDER BY createdAt DESC
        `;
        const reset = resetRows[0];
        if (!reset || reset.expiresAt <= new Date() || reset.attempts >= MAX_ATTEMPTS) {
            if (reset) await clearResetTokens(prisma, student.userId);
            return res.status(400).json({ success: false, message: 'Mã xác minh không hợp lệ hoặc đã hết hạn.' });
        }

        if (!safeHashMatch(code, reset.tokenHash)) {
            await prisma.$executeRaw`
                UPDATE PASSWORD_RESET_TOKEN SET attempts = attempts + 1 WHERE id = ${reset.id}
            `;
            if (reset.attempts + 1 >= MAX_ATTEMPTS) {
                await clearResetTokens(prisma, student.userId);
            }
            return res.status(400).json({ success: false, message: 'Mã xác minh không hợp lệ hoặc đã hết hạn.' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 12);
        await prisma.$transaction(async (tx) => {
            await tx.$executeRaw`UPDATE USER_ACCOUNT SET password = ${passwordHash} WHERE id = ${student.userId}`;
            await clearResetTokens(tx, student.userId);
        });
        return res.status(200).json({ success: true, message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.' });
    } catch (error) {
        console.error('[password-reset.confirm]', error.message);
        return res.status(500).json({ success: false, message: 'Không thể đặt lại mật khẩu lúc này.' });
    }
};
