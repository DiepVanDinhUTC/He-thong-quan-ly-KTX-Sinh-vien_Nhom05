# Trật tự – Trị an và Y tế

## Chức năng

- `SECURITY`: sổ khách ra/vào (ghi khách vào, ghi nhận giờ ra) và biên bản vi phạm nội quy.
- `MEDICAL_OFFICER`: tra cứu hồ sơ sinh viên đang lưu trú tại mọi tòa nhà trong KTX, hồ sơ sức khỏe và nhật ký sự cố y tế, sơ cứu, cấp thuốc. Quyền hồ sơ sinh viên chỉ đọc.
- `ADMIN`: xem cả hai nhóm để kiểm thử thủ công.

Tài khoản `SECURITY` tra cứu cư dân đang lưu trú và ghi nhận vi phạm trên toàn KTX. Sổ khách vẫn giới hạn theo các tòa đã gán trong `USER_BUILDING_ACCESS`. Tài khoản `MEDICAL_OFFICER` xem cư dân và hồ sơ y tế toàn KTX; danh sách hồ sơ sinh viên chỉ bao gồm người đang hoặc chờ lưu trú. Hồ sơ sức khỏe chỉ dành cho cán bộ y tế và quản trị viên; biên bản và nhật ký sự cố không có thao tác xóa trên giao diện.

## Giao diện trật tự trị an

Tài khoản `SECURITY` đăng nhập vào trang chủ giới thiệu `/security`. Sidebar riêng gồm **Trang chủ**, **Quản lý khách** (`/security/visitors`) và **Ghi nhận vi phạm nội quy** (`/security/violations`). Trang vi phạm cho phép tìm cư dân toàn KTX theo tên, mã sinh viên, phòng hoặc tòa nhà.

Nhân viên hồ sơ xem biên bản và tổng số vi phạm theo sinh viên tại mục Thông tin & kỷ luật. Từ 3 biên bản trở lên, hệ thống từ chối gửi hoặc duyệt đơn đăng ký tiếp và xếp phòng thủ công. Tổng số tính trên toàn bộ biên bản, không phụ thuộc danh sách 200 biên bản mới nhất. Hợp đồng đang có hiệu lực không tự bị chấm dứt. Hệ thống hiện dùng đơn đăng ký nội trú tiếp theo thay cho quy trình gia hạn riêng.

Vai trò này không truy cập quản lý phòng/CSVC hoặc yêu cầu sửa chữa; quyền đọc các API phòng và sửa chữa cũng được loại bỏ. Đường dẫn cũ `/security-medical` chuyển nhân viên trật tự trị an về trang chủ mới. Nghiệp vụ y tế tiếp tục dùng giao diện và quyền riêng của cán bộ y tế.

## Giao diện cán bộ y tế

Các trang y tế dùng chung sidebar xanh, thanh tiêu đề, khung thống kê và biểu mẫu theo bố cục của trang cán bộ quân sự. Sidebar gồm **Hồ sơ sinh viên** (`/students`, chỉ xem), **Hồ sơ sức khỏe** (`/security-medical?section=health`) và **Sự cố y tế & thuốc** (`/security-medical?section=incidents`). Đường dẫn `/security-medical` mặc định mở hồ sơ sức khỏe cho cán bộ y tế. Mục đang chọn được giữ khi tải lại trang hoặc dùng nút quay lại của trình duyệt.

## Cập nhật cơ sở dữ liệu

Chạy từ thư mục `backend`:

```powershell
npx prisma db execute --file .\migrations\20261021_security_and_medical_services.sql --schema .\prisma\schema.prisma
npx prisma generate
```

Sau đó khởi động lại backend và frontend. Tài khoản Trật tự–Trị an cần được gán tòa nhà để quản lý sổ khách; nghiệp vụ vi phạm và tài khoản Y tế dùng phạm vi toàn KTX.

## API

- `GET /api/v1/security-medical/residents`
- `GET|POST /api/v1/security-medical/access-logs`
- `PATCH /api/v1/security-medical/access-logs/:accessLogId/checkout`
- `GET|POST /api/v1/security-medical/violations`
- `GET /api/v1/security-medical/violation-summary` (hồ sơ và quản trị viên)
- `GET /api/v1/security-medical/health-records`
- `GET|PUT /api/v1/security-medical/health-records/:maSV`
- `GET|POST /api/v1/security-medical/medical-incidents`
