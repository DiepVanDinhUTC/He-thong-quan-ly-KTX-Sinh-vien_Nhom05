exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user.role đã được gán từ middleware protect ở bước trên
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền hạn để thực hiện hành động này!'
            });
        }
        next();
    };
};