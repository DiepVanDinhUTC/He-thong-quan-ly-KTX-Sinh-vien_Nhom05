const { test } = require("node:test");
const assert = require("node:assert/strict");
const { phanPhongGDQP, createGdqpAllocationService } = require("../src/services/gdqpAllocationService");

const KHOA = "Công nghệ thông tin";
const sinhVien = (maSV, gioiTinh = true, extra = {}) => ({
    maSV, gioiTinh, hoTen: `Sinh viên ${maSV}`, ngaySinh: "2002-05-15T00:00:00Z",
    lop: "CNTT1-K61", khoa: KHOA, cccd: `CCCD-${maSV}`, phone: "0987654321",
    email: `${maSV}@example.test`, ...extra
});

// Repository in-memory có rollback để kiểm tra nghiệp vụ, không kết nối database thật.
function taoDatabase(sinhViens = [], allocations = []) {
    const state = { students: structuredClone(sinhViens), allocations: structuredClone(allocations) };
    const calls = { studentCreates: 0, transactions: [] };
    const repo = {
        sinhVien: {
            async findMany({ where }) {
                return state.students.filter(sv => where.maSV.in.includes(sv.maSV));
            },
            async createMany({ data }) {
                calls.studentCreates++;
                for (const sv of data) {
                    if (state.students.some(row => row.maSV === sv.maSV || row.cccd === sv.cccd)) {
                        throw Object.assign(new Error("Unique student"), { code: "P2002" });
                    }
                    state.students.push({ role: "STUDENT", trangThaiNoiTru: "Chưa đăng ký", ...sv });
                }
            }
        },
        phanPhongGDQP: {
            async findMany({ where, include }) {
                const rows = state.allocations.filter(row => row.maDot === where.maDot);
                return rows.map(row => include ? {
                    ...row, sinhVien: state.students.find(sv => sv.maSV === row.maSinhVien)
                } : { ...row });
            },
            async createMany({ data }) {
                for (const item of data) {
                    if (state.allocations.some(row => row.maDot === item.maDot && row.maSinhVien === item.maSinhVien)) {
                        throw Object.assign(new Error("Unique allocation"), { code: "P2002" });
                    }
                    state.allocations.push({ ...item });
                }
            }
        },
        async $transaction(run, options) {
            calls.transactions.push(options);
            const snapshot = structuredClone(state);
            try { return await run(repo); }
            catch (error) {
                state.students = snapshot.students;
                state.allocations = snapshot.allocations;
                throw error;
            }
        }
    };
    return { db: repo, state, calls };
}

function taoService(roster, students = [], allocations = []) {
    const fixture = taoDatabase(students, allocations);
    return {
        ...fixture,
        service: createGdqpAllocationService({ db: fixture.db, layDangKy: async () => roster })
    };
}

test("130 tổ hợp biên: tách giới tính, không quá 8 người/phòng và phát hiện thiếu phòng", () => {
    for (const nam of [0, 1, 7, 8, 9, 15, 16, 17, 120, 128, 248, 249, 256]) {
        for (const nu of [0, 1, 7, 8, 9, 15, 16, 17, 120, 128]) {
            const danhSach = [
                ...Array.from({ length: nam }, (_, i) => sinhVien(`M${i}`)),
                ...Array.from({ length: nu }, (_, i) => sinhVien(`F${i}`, false))
            ];
            if (Math.ceil(nam / 8) + Math.ceil(nu / 8) > 32) {
                assert.throws(() => phanPhongGDQP(danhSach), { statusCode: 422 });
                continue;
            }
            const result = phanPhongGDQP(danhSach);
            assert.equal(result.tongHocVien, nam + nu);
            assert.equal(result.soPhongNam, Math.ceil(nam / 8));
            assert.equal(result.soPhongNu, Math.ceil(nu / 8));
            const genders = new Map(danhSach.map(sv => [sv.maSV, sv.gioiTinh]));
            const rooms = new Map();
            for (const item of result.danhSachPhanPhong) {
                assert.equal(item.maSV, item.maHocVien);
                const occupants = rooms.get(item.maPhong) || [];
                occupants.push(genders.get(item.maSV));
                rooms.set(item.maPhong, occupants);
            }
            for (const occupants of rooms.values()) {
                assert.ok(occupants.length <= 8);
                assert.equal(new Set(occupants).size, 1);
            }
            assert.equal(result.soPhongConTrong, 32 - rooms.size);
        }
    }
});

test("Gộp đăng ký trùng maSV và cho kết quả ổn định khi SIS đổi thứ tự", () => {
    const a = sinhVien("01");
    const b = sinhVien("02");
    const result = phanPhongGDQP([b, a, a]);
    assert.equal(result.tongHocVien, 2);
    assert.deepEqual(result, phanPhongGDQP([a, b]));
});

test("Từ chối mã thiếu, mã không khớp, giới tính sai và đăng ký mâu thuẫn", () => {
    for (const invalid of [null, {}, { gioiTinh: true }, { maSV: "01", gioiTinh: "Nam" },
        { maSV: "01", maHocVien: "02", gioiTinh: true }]) {
        assert.throws(() => phanPhongGDQP([invalid]), { statusCode: 422 });
    }
    assert.throws(() => phanPhongGDQP([sinhVien("01"), sinhVien("01", false)]), { statusCode: 422 });
});

test("Preview chỉ lấy học viên của khoa chọn và không ghi database", async () => {
    const fixture = taoService([sinhVien("01"), sinhVien("02", false, { khoa: "Kinh tế" })]);
    const result = await fixture.service.previewPhanPhong("DOT-1", [KHOA]);
    assert.equal(result.tongHocVien, 1);
    assert.equal(fixture.calls.transactions.length, 0);
    assert.equal(fixture.state.students.length, 0);
});

test("Sinh viên đang nội trú vẫn ở A1, dùng hồ sơ cũ và không ghi đè quyền/trạng thái", async () => {
    const resident = sinhVien("01", true, { trangThaiNoiTru: "Đang lưu trú", role: "STUDENT", userId: "USER-1" });
    const incoming = { maSV: "01", gioiTinh: true, khoa: KHOA, trangThaiNoiTru: "Khác", role: "DIRECTOR" };
    const fixture = taoService([incoming, incoming], [resident]);
    const result = await fixture.service.executePhanPhong("DOT-1", [KHOA]);
    assert.equal(result.tongHocVien, 1);
    assert.equal(result.toaNha, "A1");
    assert.equal(result.danhSachPhanPhong[0].maPhong, "103");
    assert.equal(fixture.calls.studentCreates, 0);
    assert.deepEqual(fixture.state.students, [resident]);
    assert.deepEqual(fixture.state.allocations, [{ maDot: "DOT-1", maSinhVien: "01", maPhong: "103" }]);
    assert.equal(fixture.calls.transactions[0].isolationLevel, "Serializable");
});

test("Sinh viên mới được tạo một lần, các đợt khác dùng lại cùng maSV và phòng A1", async () => {
    const fixture = taoService([sinhVien("01"), sinhVien("01")]);
    await fixture.service.executePhanPhong("DOT-1", [KHOA]);
    await fixture.service.executePhanPhong("DOT-2", [KHOA]);
    assert.equal(fixture.state.students.length, 1);
    assert.equal(fixture.calls.studentCreates, 1);
    assert.equal(fixture.state.allocations.length, 2);
    assert.deepEqual(fixture.state.allocations.map(item => item.maPhong), ["103", "103"]);
});

test("Không sao chép quyền/tài khoản/nội trú SIS vào hồ sơ mới", async () => {
    const fixture = taoService([sinhVien("01", true, { role: "DIRECTOR", userId: "ADMIN", trangThaiNoiTru: "Đang lưu trú" })]);
    await fixture.service.executePhanPhong("DOT-1", [KHOA]);
    assert.equal(fixture.state.students[0].role, "STUDENT");
    assert.equal(fixture.state.students[0].trangThaiNoiTru, "Chưa đăng ký");
    assert.equal(fixture.state.students[0].userId, undefined);
});

test("Chặn phân lại cùng đợt bằng 409, giữ kết quả cũ", async () => {
    const fixture = taoService([sinhVien("01")]);
    await fixture.service.executePhanPhong("DOT-1", [KHOA]);
    const before = structuredClone(fixture.state);
    await assert.rejects(fixture.service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 409 });
    assert.deepEqual(fixture.state, before);
});

test("Đọc kết quả đã lưu và danh sách chưa phân chỉ trong đúng đợt", async () => {
    const a = sinhVien("01");
    const b = sinhVien("02", false);
    const fixture = taoService([a, b], [a, b], [
        { maDot: "DOT-1", maSinhVien: a.maSV, maPhong: "103" },
        { maDot: "DOT-2", maSinhVien: b.maSV, maPhong: "103" }
    ]);
    const result = await fixture.service.layKetQuaPhanPhong("DOT-1");
    assert.equal(result.tongHocVien, 1);
    assert.equal(result.soPhongNam, 1);
    assert.deepEqual((await fixture.service.layHocVienChuaPhan("DOT-1", [KHOA])).map(hv => hv.maSV), ["02"]);
    await assert.rejects(fixture.service.layKetQuaPhanPhong("DOT-3"), { statusCode: 404 });
});

test("Hồ sơ mới thiếu dữ liệu hoặc trùng CCCD phải rollback toàn bộ", async () => {
    const fixture = taoService([sinhVien("01"), sinhVien("02", true, { cccd: "CCCD-01" })]);
    await assert.rejects(fixture.service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 409 });
    assert.equal(fixture.state.students.length, 0);
    assert.equal(fixture.state.allocations.length, 0);
    const missing = taoService([{ maSV: "01", gioiTinh: true, khoa: KHOA }]);
    await assert.rejects(missing.service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 422 });
    assert.equal(missing.state.students.length, 0);
});

test("Giới tính SIS khác hồ sơ KTX bị từ chối trước khi ghi kết quả", async () => {
    const fixture = taoService([sinhVien("01", false)], [sinhVien("01")]);
    await assert.rejects(fixture.service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 422 });
    assert.equal(fixture.state.allocations.length, 0);
});

test("Thiếu đợt/khoa hoặc không có đăng ký thì không tạo kết quả giả", async () => {
    const fixture = taoService([]);
    await assert.rejects(fixture.service.previewPhanPhong({}, [KHOA]), { statusCode: 400 });
    await assert.rejects(fixture.service.previewPhanPhong("DOT-1", []), { statusCode: 400 });
    await assert.rejects(fixture.service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 422 });
    assert.equal(fixture.calls.transactions.length, 0);
});

test("Thử lại transaction khi PostgreSQL báo xung đột Serializable", async () => {
    const fixture = taoService([sinhVien("01")]);
    const run = fixture.db.$transaction;
    let attempts = 0;
    fixture.db.$transaction = (...args) => {
        if (++attempts === 1) throw Object.assign(new Error("Conflict"), { code: "P2034" });
        return run(...args);
    };
    await fixture.service.executePhanPhong("DOT-1", [KHOA]);
    assert.equal(attempts, 2);
    assert.equal(fixture.state.allocations.length, 1);
});

test("Xung đột kéo dài trả 409 sau tối đa 3 lần thử", async () => {
    let attempts = 0;
    const service = createGdqpAllocationService({
        db: { $transaction: async () => { attempts++; throw Object.assign(new Error("Conflict"), { code: "P2034" }); } },
        layDangKy: async () => [sinhVien("01")]
    });
    await assert.rejects(service.executePhanPhong("DOT-1", [KHOA]), { statusCode: 409 });
    assert.equal(attempts, 3);
});
