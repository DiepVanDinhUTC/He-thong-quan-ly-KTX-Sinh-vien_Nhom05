const jwt = require('jsonwebtoken');

exports.protect = (req, res, next) => {
    let token;
    
    // Bóc tách token từ header Authorization (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Không có quyền truy cập. Vui lòng đăng nhập!' 
        });
    }

    try {
        // Giải mã token bằng JWT_SECRET để lấy thông tin User
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Gắn thông tin (id, role) vào request để luồng sau sử dụng
        next();
    } catch (error) {
        return res.status(401).json({ 
            success: false, 
            message: 'Token không hợp lệ hoặc đã hết hạn.' 
        });
    }
};