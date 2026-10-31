const VIOLATION_LIMIT = 3;

const assertRenewalEligible = async (tx, maSinhVien) => {
    const count = await tx.securityViolation.count({ where: { maSinhVien } });
    if (count >= VIOLATION_LIMIT) {
        throw Object.assign(new Error(`Sinh viên có ${count} biên bản vi phạm (ngưỡng ${VIOLATION_LIMIT} lần), không đủ điều kiện đăng ký tiếp hợp đồng nội trú.`), { status: 409 });
    }
};

module.exports = { VIOLATION_LIMIT, assertRenewalEligible };
