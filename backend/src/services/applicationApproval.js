const { calculateContractRent } = require('./contractPricing');
const { assertRenewalEligible } = require('./violationPolicy');
const { calculateContractDueAt, configuredHolidays } = require('./invoiceDueDates');
const PAYMENT_PERIOD_MONTHS = 5;

const reject = (status, message) => Object.assign(new Error(message), { status });

const defaultContractTerms = (room, now = new Date()) => {
    const vietnamDate = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const ngayBatDau = new Date(vietnamDate);
    const ngayKetThuc = new Date(ngayBatDau);
    // Use the last day of the target month when the original day does not exist there.
    ngayKetThuc.setUTCDate(1);
    ngayKetThuc.setUTCMonth(ngayKetThuc.getUTCMonth() + PAYMENT_PERIOD_MONTHS);
    const lastDay = new Date(Date.UTC(ngayKetThuc.getUTCFullYear(), ngayKetThuc.getUTCMonth() + 1, 0)).getUTCDate();
    ngayKetThuc.setUTCDate(Math.min(ngayBatDau.getUTCDate(), lastDay));
    return { ngayBatDau, ngayKetThuc, tongTien: calculateContractRent({ ngayBatDau, ngayKetThuc }, room) };
};

// Call inside a serializable transaction for both staff approval and automatic approval.
const approveApplication = async (tx, { maDangKy, maPhong, ngayBatDau, ngayKetThuc, tongTien, autoApproved = false }) => {
    const application = await tx.dangKyKTX.findUnique({
        where: { maDangKy },
        include: { sinhVien: { select: { militaryRoomAssignments: { where: { status: 'ACTIVE', endsAt: { gt: new Date() } }, select: { id: true }, take: 1 } } } }
    });
    if (!application) throw reject(404, 'Không tìm thấy đơn đăng ký KTX.');
    if (application.trangThai !== 'PENDING') throw reject(409, 'Đơn đăng ký không còn ở trạng thái chờ duyệt.');
    await assertRenewalEligible(tx, application.maSinhVien);
    if (application.sinhVien?.militaryRoomAssignments?.length) throw reject(409, 'Sinh viên đã được phân phòng quân sự và không thể giữ thêm chỗ nội trú.');

    const room = await tx.phong.findUnique({ where: { maPhong } });
    if (!room) throw reject(404, 'Không tìm thấy phòng được chọn.');
    if (room.loaiPhong !== application.loaiPhongYeuCau) {
        throw reject(400, 'Loại phòng được chọn không khớp với nguyện vọng đăng ký.');
    }
    const existingContract = await tx.hopDong.findFirst({
        where: { maSinhVien: application.maSinhVien, trangThai: { in: ['PENDING_PAYMENT', 'ACTIVE'] } },
        select: { maHopDong: true }
    });
    if (existingContract) throw reject(409, 'Sinh viên đã có hợp đồng đang chờ thanh toán hoặc còn hiệu lực.');

    const claimed = await tx.dangKyKTX.updateMany({
        where: { maDangKy, trangThai: 'PENDING' }, data: { trangThai: 'APPROVED' }
    });
    if (claimed.count !== 1) throw reject(409, 'Đơn đăng ký vừa được xử lý bởi một yêu cầu khác.');
    const reserved = await tx.phong.updateMany({
        where: { maPhong, soSinhVienHienTai: { lt: room.soSinhVienToiDa } },
        data: { soSinhVienHienTai: { increment: 1 } }
    });
    if (reserved.count !== 1) throw reject(409, 'Phòng đã hết chỗ; đơn đăng ký chưa được duyệt.');

    const approvedAt = new Date();
    return tx.hopDong.create({
        data: { maSinhVien: application.maSinhVien, maPhong, ngayBatDau, ngayKetThuc, tongTien, ngayTao: approvedAt, paymentDueAt: calculateContractDueAt(approvedAt, autoApproved, configuredHolidays()), paymentPolicy: autoApproved ? 'AUTO_PRIORITY' : 'STANDARD', trangThai: 'PENDING_PAYMENT' }
    });
};

module.exports = { approveApplication, defaultContractTerms };
