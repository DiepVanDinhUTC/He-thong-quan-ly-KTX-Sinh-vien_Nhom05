exports.deriveStudentHousingStatus = (contracts = [], hasPendingApplication = false) => {
    if (contracts.some((contract) => contract.trangThai === 'ACTIVE')) {
        return 'DANG_O';
    }
    if (contracts.some((contract) => contract.trangThai === 'PENDING_PAYMENT')) return 'CHO_THANH_TOAN';
    if (hasPendingApplication) return 'CHO_DUYET';
    return 'CHUA_DANG_KY';
};

