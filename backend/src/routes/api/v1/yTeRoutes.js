const express = require("express");
const router = express.Router();

const yTeController = require("../../../controllers/yTeController");
const { protect } = require("../../../middleware/authMiddleware");
const { requireMedical, allowMedicalRead } = require("../../../middleware/medicalMiddleware");
const {
    validateMaSV,
    validateTaoHoSo,
    validateCapNhatHoSo,
    validateThemLichSuKham
} = require("../../../middleware/yTeValidation");

router.use(protect);

router.post("/ho-so", requireMedical, validateTaoHoSo, yTeController.taoHoSo);
router.get("/ho-so/:maSV", allowMedicalRead, validateMaSV, yTeController.layHoSo);
router.put("/ho-so/:maSV", requireMedical, validateMaSV, validateCapNhatHoSo, yTeController.capNhatHoSo);

router.post("/lich-su-kham", requireMedical, validateThemLichSuKham, yTeController.themLichSuKham);
router.get("/lich-su-kham/:maSV", allowMedicalRead, validateMaSV, yTeController.layLichSuKham);

module.exports = router;
