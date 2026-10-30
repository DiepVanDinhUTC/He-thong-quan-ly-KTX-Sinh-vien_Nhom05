const prisma = require("../config/prisma");
const { layDangKyGDQP } = require("./sisGdqpService");
const { A1_MILITARY_ROOM_NUMBERS } = require('../config/a1Rooms');

// Tòa A1 được trả trống sau mỗi đợt GDQP; mỗi phòng có 8 chỗ.
const DANH_SACH_PHONG = A1_MILITARY_ROOM_NUMBERS;
const SUC_CHUA = 8;

function loi(message, statusCode) {
    return Object.assign(new Error(message), { statusCode });
}

function kiemTraMaDot(maDot) {
    if (typeof maDot !== "string" || !maDot.trim() || maDot.trim().length > 50) {
        throw loi("Vui lòng cung cấp mã đợt GDQP hợp lệ, tối đa 50 ký tự", 400);
    }
    return maDot.trim();
}

function kiemTraKhoa(danhSachKhoa) {
    const khoa = danhSachKhoa ?? process.env.SIS_GDQP_KHOA?.split(",");
    if (!Array.isArray(khoa) || !khoa.length || khoa.some(item =>
        typeof item !== "string" || !item.trim() || item.trim().length > 100
    )) {
        throw loi("Vui lòng cung cấp danhSachKhoa là mảng tên khoa cần phân phòng", 400);
    }
    return [...new Set(khoa.map(item => item.trim()))].sort();
}

function chuanHoaHocVien(hocViens) {
    if (!Array.isArray(hocViens)) throw loi("Danh sách học viên không hợp lệ", 422);
    const theoMaSV = new Map();
    for (const hocVien of hocViens) {
        const maSV = hocVien?.maSV ?? hocVien?.maHocVien;
        if (typeof maSV !== "string" || !maSV.trim() || maSV.trim().length > 20) {
            throw loi("Có học viên thiếu mã sinh viên hợp lệ", 422);
        }
        if (hocVien.maSV !== undefined && hocVien.maHocVien !== undefined &&
            hocVien.maSV !== hocVien.maHocVien) {
            throw loi("Mã sinh viên và mã học viên không khớp", 422);
        }
        if (typeof hocVien.gioiTinh !== "boolean") {
            throw loi("Có học viên thiếu thông tin giới tính hợp lệ", 422);
        }
        const banGhi = { ...hocVien, maSV: maSV.trim() };
        const daCo = theoMaSV.get(banGhi.maSV);
        if (daCo && (daCo.gioiTinh !== banGhi.gioiTinh || daCo.khoa !== banGhi.khoa)) {
            throw loi(`Thông tin đăng ký của sinh viên ${banGhi.maSV} không nhất quán`, 422);
        }
        // Nhiều bản ghi học phần của cùng sinh viên chỉ chiếm một chỗ.
        if (!daCo) theoMaSV.set(banGhi.maSV, banGhi);
    }
    return [...theoMaSV.values()].sort((a, b) => a.maSV.localeCompare(b.maSV));
}

function taoKetQua(hocViens, danhSachPhanPhong) {
    const gioiTinh = new Map(hocViens.map(hv => [hv.maSV, hv.gioiTinh]));
    const phongNam = new Set();
    const phongNu = new Set();
    for (const item of danhSachPhanPhong) {
        (gioiTinh.get(item.maSV) ? phongNam : phongNu).add(item.maPhong);
    }
    const soPhongDaDung = new Set(danhSachPhanPhong.map(item => item.maPhong)).size;
    return {
        toaNha: "A1",
        sucChuaMoiPhong: SUC_CHUA,
        tongHocVien: danhSachPhanPhong.length,
        soPhongNam: phongNam.size,
        soPhongNu: phongNu.size,
        soPhongDaDung,
        soPhongConTrong: DANH_SACH_PHONG.length - soPhongDaDung,
        danhSachPhanPhong
    };
}

function phanPhongGDQP(danhSach) {
    const hocViens = chuanHoaHocVien(danhSach);
    const nam = hocViens.filter(hv => hv.gioiTinh);
    const nu = hocViens.filter(hv => !hv.gioiTinh);
    const soPhongNam = Math.ceil(nam.length / SUC_CHUA);
    const soPhongNu = Math.ceil(nu.length / SUC_CHUA);
    if (soPhongNam + soPhongNu > DANH_SACH_PHONG.length) {
        throw loi("Không đủ phòng để phân bổ học viên GDQP", 422);
    }
    const danhSachPhanPhong = [];
    for (const [nhom, batDau] of [[nam, 0], [nu, soPhongNam]]) {
        nhom.forEach((hv, index) => danhSachPhanPhong.push({
            maSV: hv.maSV,
            maHocVien: hv.maSV, // Giữ tương thích với kết quả thuật toán cũ.
            maPhong: DANH_SACH_PHONG[batDau + Math.floor(index / SUC_CHUA)]
        }));
    }
    return taoKetQua(hocViens, danhSachPhanPhong);
}

function taoHoSoSinhVien(hocVien) {
    const data = { maSV: hocVien.maSV, gioiTinh: hocVien.gioiTinh };
    const gioiHan = { hoTen: 100, lop: 50, khoa: 100, cccd: 20, phone: 15, email: 100 };
    for (const [truong, toiDa] of Object.entries(gioiHan)) {
        const giaTri = hocVien[truong];
        if (typeof giaTri !== "string" || !giaTri.trim() || giaTri.trim().length > toiDa) {
            throw loi(`SIS thiếu hoặc sai ${truong} của sinh viên mới ${hocVien.maSV}`, 422);
        }
        data[truong] = giaTri.trim();
    }
    if (typeof hocVien.ngaySinh !== "string" || !hocVien.ngaySinh.trim()) {
        throw loi(`SIS thiếu ngày sinh của sinh viên mới ${hocVien.maSV}`, 422);
    }
    data.ngaySinh = new Date(hocVien.ngaySinh);
    if (Number.isNaN(data.ngaySinh.getTime())) {
        throw loi(`Ngày sinh không hợp lệ của sinh viên ${hocVien.maSV}`, 422);
    }
    // Vai trò, tài khoản và trạng thái nội trú dùng giá trị mặc định của database.
    return data;
}

function createGdqpAllocationService({ db = prisma, layDangKy = layDangKyGDQP } = {}) {
    async function layNguon(maDot, danhSachKhoa) {
        const dot = kiemTraMaDot(maDot);
        const khoa = kiemTraKhoa(danhSachKhoa);
        const nguon = await layDangKy(dot, khoa);
        if (!Array.isArray(nguon)) throw loi("Danh sách đăng ký từ SIS không hợp lệ", 502);
        // Kiểm tra lại khoa ngay cả khi SIS không áp dụng tham số lọc.
        const hocViens = chuanHoaHocVien(nguon.filter(hv => khoa.includes(hv?.khoa)));
        return { maDot: dot, danhSachKhoa: khoa, hocViens };
    }

    async function previewPhanPhong(maDot, danhSachKhoa) {
        const nguon = await layNguon(maDot, danhSachKhoa);
        return { maDot: nguon.maDot, danhSachKhoa: nguon.danhSachKhoa, ...phanPhongGDQP(nguon.hocViens) };
    }

    async function executePhanPhong(maDot, danhSachKhoa) {
        const nguon = await layNguon(maDot, danhSachKhoa);
        if (!nguon.hocViens.length) {
            throw loi("Không có học viên đăng ký GDQP thuộc các khoa đã chọn trong đợt này", 422);
        }
        const ketQua = phanPhongGDQP(nguon.hocViens);
        for (let lan = 0; lan < 3; lan++) {
            try {
                return await db.$transaction(async tx => {
                    const daPhan = await tx.phanPhongGDQP.findMany({ where: { maDot: nguon.maDot } });
                    if (daPhan.length) throw loi("Đợt GDQP này đã được phân phòng", 409);
                    const daCo = await tx.sinhVien.findMany({
                        where: { maSV: { in: nguon.hocViens.map(hv => hv.maSV) } },
                        select: { maSV: true, gioiTinh: true }
                    });
                    const theoMaSV = new Map(daCo.map(hv => [hv.maSV, hv]));
                    for (const hv of nguon.hocViens) {
                        if (theoMaSV.has(hv.maSV) && theoMaSV.get(hv.maSV).gioiTinh !== hv.gioiTinh) {
                            throw loi(`Giới tính của sinh viên ${hv.maSV} không khớp hồ sơ KTX`, 422);
                        }
                    }
                    const sinhVienMoi = nguon.hocViens.filter(hv => !theoMaSV.has(hv.maSV)).map(taoHoSoSinhVien);
                    if (sinhVienMoi.length) await tx.sinhVien.createMany({ data: sinhVienMoi });
                    await tx.phanPhongGDQP.createMany({
                        data: ketQua.danhSachPhanPhong.map(item => ({
                            maDot: nguon.maDot, maSinhVien: item.maSV, maPhong: item.maPhong
                        }))
                    });
                    return { maDot: nguon.maDot, danhSachKhoa: nguon.danhSachKhoa, ...ketQua };
                }, { isolationLevel: "Serializable", timeout: 15000 });
            } catch (error) {
                // Hai yêu cầu đồng thời không được cùng chiếm các phòng của một đợt.
                if (error.code === "P2034" && lan < 2) continue;
                if (error.code === "P2034") throw loi("Đang có yêu cầu phân phòng đồng thời, vui lòng thử lại", 409);
                if (error.code === "P2002") throw loi("Mã sinh viên, CCCD hoặc kết quả phân phòng đã tồn tại", 409);
                throw error;
            }
        }
    }

    async function layKetQuaPhanPhong(maDot) {
        const dot = kiemTraMaDot(maDot);
        const ketQua = await db.phanPhongGDQP.findMany({
            where: { maDot: dot },
            include: { sinhVien: { select: { maSV: true, hoTen: true, gioiTinh: true, khoa: true } } },
            orderBy: [{ maPhong: "asc" }, { maSinhVien: "asc" }]
        });
        if (!ketQua.length) throw loi("Đợt GDQP chưa có kết quả phân phòng", 404);
        return {
            maDot: dot,
            ...taoKetQua(ketQua.map(item => item.sinhVien), ketQua.map(item => ({
                maSV: item.maSinhVien, maHocVien: item.maSinhVien, maPhong: item.maPhong
            })))
        };
    }

    async function layHocVienChuaPhan(maDot, danhSachKhoa) {
        const nguon = await layNguon(maDot, danhSachKhoa);
        const ketQua = await db.phanPhongGDQP.findMany({
            where: { maDot: nguon.maDot }, select: { maSinhVien: true }
        });
        const daPhan = new Set(ketQua.map(item => item.maSinhVien));
        // Không loại sinh viên đang nội trú: các em vẫn phải ở A1 trong đợt GDQP.
        return nguon.hocViens.filter(hv => !daPhan.has(hv.maSV));
    }

    return { previewPhanPhong, executePhanPhong, layKetQuaPhanPhong, layHocVienChuaPhan };
}

module.exports = { phanPhongGDQP, createGdqpAllocationService, ...createGdqpAllocationService() };
