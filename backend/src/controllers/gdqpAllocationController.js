const gdqpService = require("../services/gdqpAllocationService");

// POST /api/v1/gdqp/phan-phong/preview
exports.preview = async (req, res) => {
    try {
        const { maDot, danhSachKhoa } = req.body || {};

        if (!maDot) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp mã đợt GDQP"
            });
        }

        const ketQua = await gdqpService.previewPhanPhong(maDot, danhSachKhoa);

        return res.status(200).json({
            success: true,
            message: "Tạo phương án phân phòng thành công",
            data: ketQua
        });
    } catch (error) {
        console.error("Lỗi preview phân phòng:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Không thể tạo phương án phân phòng"
        });
    }
};

// POST /api/v1/gdqp/phan-phong/execute
exports.execute = async (req, res) => {
    try {
        const { maDot, danhSachKhoa } = req.body || {};

        if (!maDot) {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp mã đợt GDQP"
            });
        }

        const ketQua = await gdqpService.executePhanPhong(maDot, danhSachKhoa);

        return res.status(201).json({
            success: true,
            message: "Phân phòng học viên GDQP thành công",
            data: ketQua
        });
    } catch (error) {
        console.error("Lỗi thực hiện phân phòng:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Không thể thực hiện phân phòng"
        });
    }
};

// GET /api/v1/gdqp/phan-phong/:maDot
exports.layKetQua = async (req, res) => {
    try {
        const { maDot } = req.params;

        const ketQua = await gdqpService.layKetQuaPhanPhong(maDot);

        return res.status(200).json({
            success: true,
            data: ketQua
        });
    } catch (error) {
        console.error("Lỗi lấy kết quả phân phòng:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Không thể lấy kết quả phân phòng"
        });
    }
};

// GET /api/v1/gdqp/phan-phong/:maDot/chua-phan
exports.layChuaPhan = async (req, res) => {
    try {
        const { maDot } = req.params;

        const khoa = req.query?.khoa;
        const danhSachKhoa = typeof khoa === "string" ? khoa.split(",") : khoa;
        const danhSach = await gdqpService.layHocVienChuaPhan(maDot, danhSachKhoa);

        return res.status(200).json({
            success: true,
            data: danhSach
        });
    } catch (error) {
        console.error("Lỗi lấy học viên chưa phân:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode
                ? error.message
                : "Không thể lấy danh sách học viên"
        });
    }
};
