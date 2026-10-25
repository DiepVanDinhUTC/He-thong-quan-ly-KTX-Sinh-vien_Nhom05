const express = require("express");

const gdqpController = require(
    "../../../controllers/gdqpAllocationController"
);

const { protect } = require("../../../middleware/authMiddleware");
const { restrictTo } = require("../../../middleware/rbacMiddleware");
const ROLES = require("../../../config/roles");

const createGdqpRouter = ({ authenticate = protect } = {}) => {
    const router = express.Router();
    router.use(authenticate, restrictTo(ROLES.MILITARY_OFFICER));

// Xem trước kết quả phân phòng
router.post(
    "/phan-phong/preview",
    gdqpController.preview
);

// Thực hiện phân phòng chính thức
router.post(
    "/phan-phong/execute",
    gdqpController.execute
);

// Danh sách học viên chưa phân phòng
router.get(
    "/phan-phong/:maDot/chua-phan",
    gdqpController.layChuaPhan
);

// Kết quả phân phòng theo đợt
router.get(
    "/phan-phong/:maDot",
    gdqpController.layKetQua
);

    return router;
};

module.exports = createGdqpRouter();
module.exports.createGdqpRouter = createGdqpRouter;
