# Phân phòng GDQP tại A1

Mỗi đợt GDQP kéo dài 10 ngày. Toàn bộ phòng A1 được trả trước đợt tiếp theo.
Thuật toán giữ danh sách 32 phòng: 103–107, 201–209, 301–309, 401–409;
mỗi phòng 8 người, nam/nữ ở phòng riêng. Đợt mới dùng `maDot` mới và có thể
dùng lại toàn bộ phòng; kết quả đợt trước được giữ làm lịch sử, không tính vào đợt mới.
Điều kiện các đợt không chồng lấn và trả phòng do đơn vị tổ chức bảo đảm.

## Dữ liệu và sinh viên đang nội trú

- Nguồn đăng ký học phần là API SIS, không phải đơn đăng ký KTX hay danh sách
  toàn bộ sinh viên. Gửi tất cả các khoa cần phân của một đợt trong cùng yêu cầu.
- `SINH_VIEN.maSV` là định danh chung. Sinh viên đang nội trú vẫn được phân vào A1;
  không tạo lại hồ sơ, không đổi tài khoản, trạng thái nội trú hay hợp đồng KTX.
- Chỉ sinh viên chưa có `maSV` trong KTX mới được tạo hồ sơ từ SIS. SIS cần trả đủ
  `hoTen`, `ngaySinh`, `gioiTinh`, `lop`, `khoa`, `cccd`, `phone`, `email` cho sinh viên mới.
  Các trường về quyền và nội trú từ SIS không được sao chép vào hồ sơ mới.
- Bảng `PHAN_PHONG_GDQP` tham chiếu hồ sơ chung bằng `maSinhVien`, với khóa chính
  `(maDot, maSinhVien)`. Không dùng hợp đồng/phòng KTX thường để ghi lần ở GDQP.
- Bản ghi đăng ký trùng mã được gộp trước khi tính chỗ; giới tính/khoa mâu thuẫn
  bị từ chối. Thông tin giới tính trên SIS phải khớp hồ sơ KTX nếu hồ sơ đã có.
- Execute lưu hồ sơ mới và kết quả trong một transaction Serializable. Đợt đã
  phân sẽ trả 409 khi execute lại. Không tự xóa hoặc phân lại kết quả đã lưu.

## Chuẩn bị database

Từ thư mục gốc, với database KTX đã có bảng `SINH_VIEN`:

```powershell
npm.cmd --prefix backend run db:validate
npm.cmd --prefix backend run db:gdqp
npm.cmd --prefix backend run db:generate
```

Script `db:gdqp` chỉ thêm bảng kết quả và chỉ mục, không thay dữ liệu nội trú.
Với database mới, dùng quy trình `db:push` của dự án để tạo toàn bộ schema.

## API SIS giả lập

Khi chưa đặt `SIS_GDQP_API_URL` và không ở môi trường `production`, adapter tự gọi:

```text
GET http://127.0.0.1:5000/api/v1/mock/sis-utc/gdqp/registrations
    ?maDot=GDQP-2026-01&khoa=Công nghệ thông tin,Kinh tế
```

Cổng lấy từ `PORT` của backend (mặc định 5000). Hai đợt mẫu là `GDQP-2026-01`
và `GDQP-2026-02`, gồm hai sinh viên `20120001`, `20120002` của hai khoa trên.
Đợt không tồn tại trả 404. Có thể thử preview mà chưa cần tạo bảng kết quả.

Khi nối SIS thật, cấu hình `SIS_GDQP_API_URL`, tùy chọn `SIS_GDQP_API_TOKEN`.
Adapter gửi query `maDot` và `khoa` (các tên khoa cách nhau bằng dấu phẩy), với
timeout 10 giây. Production yêu cầu cấu hình URL rõ ràng.
Hợp đồng JSON giả lập dưới đây cần được ánh xạ lại khi có API SIS thật:

```json
{
  "success": true,
  "data": {
    "maDot": "GDQP-2026-01",
    "hocViens": [
      {
        "maSV": "20120001",
        "hoTen": "Nguyễn Văn A",
        "ngaySinh": "2002-05-15T00:00:00Z",
        "gioiTinh": true,
        "lop": "CNTT1-K61",
        "khoa": "Công nghệ thông tin",
        "cccd": "001202000123",
        "phone": "0987654321",
        "email": "nva.61@st.utc.edu.vn"
      }
    ]
  }
}
```

SIS phải trả các đăng ký còn hiệu lực, đã loại đơn hủy/rút học phần. Backend
kiểm tra mã đợt trong response và lọc lại khoa trước khi phân. Preview không ghi
database; execute lấy lại dữ liệu SIS tại thời điểm thực hiện nên có thể khác
preview nếu danh sách đăng ký đã thay đổi.

## Gọi API phân phòng

Các endpoint yêu cầu Bearer JWT có vai trò `MANAGER` hoặc `DIRECTOR`.

```http
POST /api/v1/gdqp/phan-phong/preview
Authorization: Bearer <token>
Content-Type: application/json

{
  "maDot": "GDQP-2026-01",
  "danhSachKhoa": ["Công nghệ thông tin", "Kinh tế"]
}
```

Execute dùng cùng body tại `POST /api/v1/gdqp/phan-phong/execute`.
Lấy kết quả đã lưu bằng `GET /api/v1/gdqp/phan-phong/GDQP-2026-01`.
Lấy học viên chưa phân bằng
`GET /api/v1/gdqp/phan-phong/GDQP-2026-01/chua-phan?khoa=Công nghệ thông tin,Kinh tế`.
Query thực tế cần URL-encode; có thể dùng query `khoa` lặp lại cho từng khoa.
Nếu không truyền danh sách khoa, backend dùng `SIS_GDQP_KHOA` (cách nhau bằng dấu
phẩy) trong môi trường; thiếu cả hai trả 400.

Kết quả có `toaNha: "A1"`, số phòng theo giới tính và danh sách `{maSV, maHocVien, maPhong}`.
`maHocVien` là alias tương thích của `maSV`, không phải một hồ sơ hoặc mã database mới.
`maPhong` là số phòng trong A1 (ví dụ `103`), độc lập với mã phòng KTX thường.
