# Demo chức năng cán bộ quản lý quân sự

> Cập nhật thời hạn GDQP: học viên dùng chung cổng sinh viên; phòng quân sự tách biệt với hợp đồng nội trú gốc và có thời hạn 14 ngày. Đồng bộ SIS chỉ tiếp nhận hồ sơ. Sau đó cán bộ chọn ngày bắt đầu thực tế trong **Xếp phòng quân sự**. Xem quy tắc hiện hành và cách cập nhật database tại [README-MILITARY-STUDENT.md](README-MILITARY-STUDENT.md).

Tài liệu này hướng dẫn chạy demo bốn nghiệp vụ: tiếp nhận học viên GDQP, tự động xếp phòng A1 theo giới tính, quản lý cấp/hoàn trả quân tư trang và quản lý phòng giao ban. Bộ tài khoản học viên demo không cần kết nối SIS.

## 1. Khởi động database demo

Mở PowerShell ở thư mục gốc dự án:

```powershell
docker compose -f backend/docker-compose.gdqp-demo.yml up -d
```

## 2. Tạo schema và dữ liệu nền

Mở PowerShell mới:

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://postgres:ktx-demo-only@localhost:5433/ktx_gdqp_demo?schema=public'
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma db push
npm run seed:locations
npm run seed:nct-rooms
npm run seed:demo-accounts
npm run seed:military-demo
```

`db push` áp dụng schema hiện tại lên database demo tạm. Dữ liệu phòng mẫu gồm các tầng của tòa A1; tài khoản cán bộ mẫu là `actor.military_officer`. Lệnh `seed:military-demo` tạo sáu tài khoản `MILITARY_STUDENT` (ba nam, ba nữ), đánh dấu hồ sơ `laHocVienQuanSu=true` và tự xếp phòng trong danh sách quân sự A1: 103–107, 201–209, 301–309, 401–409. Seeder từ chối database không chạy trên máy local.

## 3. Chạy backend và job SIS

Trong một PowerShell khác:

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://postgres:ktx-demo-only@localhost:5433/ktx_gdqp_demo?schema=public'
$env:DIRECT_URL = $env:DATABASE_URL
$env:PORT = '5001'
$env:SIS_UTC_API_URL = 'http://localhost:5001/api/v1/mock/sis-utc/students'
$env:SIS_GDQP_COURSE_CODE = 'GDQP101'
$env:SIS_GDQP_BATCHES = 'DOT-1,DOT-2'
$env:SIS_GDQP_FACULTY_CODES = 'KHOA-CNTT,KHOA-CK'
$env:SIS_GDQP_ENABLED = 'true'
$env:SIS_GDQP_CRON = '*/1 * * * *'
$env:SIS_GDQP_TIMEZONE = 'Asia/Ho_Chi_Minh'
$env:JWT_SECRET = 'demo-only-secret-change-for-any-real-environment'
$env:SIS_MILITARY_STUDENT_DEFAULT_PASSWORD = 'Demo@2026'
npm run dev
```

Backend demo chạy ở `http://localhost:5001`. Job tự động chạy mỗi phút trong lúc demo. Giao diện cũng có nút **Đồng bộ SIS ngay** để chạy tức thì.

## 4. Mở giao diện cán bộ quân sự

Trong PowerShell khác:

```powershell
cd frontend
$env:VITE_API_URL = 'http://localhost:5001/api/v1'
npm run dev -- --host 127.0.0.1 --port 5176
```

Mở `http://127.0.0.1:5176`, chọn tab **Cán bộ quản lý**, rồi đăng nhập:

| Trường | Giá trị |
| --- | --- |
| Tài khoản cán bộ | `actor.military_officer` |
| Mật khẩu demo | `Test@123456` |

Đây là tài khoản kiểm thử do `seed:demo-accounts` tạo cho môi trường demo. Không dùng tài khoản/mật khẩu này ở môi trường thật.

Học viên demo có tài khoản `QSDEMO001` đến `QSDEMO006`; mật khẩu mặc định là `Test@123456` (có thể đổi bằng biến môi trường `MILITARY_DEMO_PASSWORD` trước khi seed). Cả sáu tài khoản đã được cấp vai trò `MILITARY_STUDENT` và xếp phòng tự động.

## 5. Trình diễn lần lượt bốn nghiệp vụ

### Học viên và SIS

1. Mở **Học viên từ SIS**. Bộ dữ liệu tài khoản seed vẫn có sáu học viên demo; SIS mock trên localhost chính cung cấp 50 hồ sơ đăng ký GDQP để đồng bộ.
2. Khi endpoint SIS hoạt động và đã cấu hình mã học phần, đợt học, khoa, bấm **Đồng bộ SIS ngay**. Hệ thống tạo tài khoản học viên nếu chưa có hoặc chuyển tài khoản sinh viên hiện có sang học viên quân sự, giữ mật khẩu và hợp đồng nội trú. Mở **Xếp phòng quân sự**, chọn ngày bắt đầu thực tế để bố trí phòng 14 ngày; vai trò sinh viên được khôi phục khi đợt kết thúc.
3. Cấu hình mock trả 50 đăng ký hợp lệ thuộc hai đợt và năm khoa mẫu. Chạy lại cập nhật cùng mã sinh viên, không tạo tài khoản trùng.

Nếu cần khôi phục cấu hình mock trong PowerShell chạy backend, đặt các biến sau trước `npm run dev`:

```powershell
$env:SIS_UTC_API_URL = 'http://localhost:5001/api/v1/mock/sis-utc/students'
$env:SIS_GDQP_COURSE_CODE = 'GDQP101'
$env:SIS_GDQP_BATCHES = 'DOT-1,DOT-2'
$env:SIS_GDQP_FACULTY_CODES = 'KHOA-CNTT,KHOA-CT,KHOA-VTK,KHOA-DT,KHOA-CK'
$env:SIS_GDQP_ENABLED = 'true'
```

Thông báo thiếu `SIS_GDQP_COURSE_CODE`, `SIS_GDQP_BATCHES`, `SIS_GDQP_FACULTY_CODES` có nghĩa backend chưa được cấu hình bộ lọc nên từ chối đồng bộ trước khi gọi SIS. Backend chính cổng `5000` dùng SIS mock 50 hồ sơ và database trong `backend/.env`; đồng bộ sẽ ghi hồ sơ vào database đó. Để chạy demo trên database local riêng, dùng hướng dẫn trong [README-SIS-GDQP.md](README-SIS-GDQP.md): database cổng `5433`, backend cổng `5001`, giao diện cổng `5176`. Khi triển khai SIS thật, thay URL và mã lọc bằng cấu hình do Phòng Đào tạo cung cấp.

### Tự động xếp phòng

1. Mở **Xếp phòng quân sự**. A1 có 68 phòng (101–117, 201–217, 301–317, 401–417); chỉ 32 phòng 103–107, 201–209, 301–309, 401–409 dành cho học viên quân sự. Bổ sung riêng các phòng A1 còn thiếu bằng `npm run seed:a1-rooms`; xem [cấu hình phòng A1](README-A1-ROOMS.md).
2. Chọn ngày bắt đầu và mã đợt (nếu có), sau đó bấm **Xếp phòng đợt 14 ngày**. Đồng bộ SIS không tự bắt đầu đợt ở phòng quân sự. Chạy xếp lại giữ nguyên thời hạn của các phân phòng đang hiệu lực.
3. Học viên nam và nữ được bố trí vào các phòng riêng. Phòng có người ngoài danh sách học viên quân sự sẽ không được chọn. Các phân phòng hợp lệ được giữ lại; phân phòng sai khu vực hoặc lẫn giới tính sẽ được kết thúc và phân lại. Nếu sức chứa các phòng quân sự không đủ, số còn lại được báo chờ phòng thay vì làm rollback toàn bộ lượt xếp.
4. Lịch sử phân phòng cũ được giữ lại; phân phòng quân sự không phát sinh hợp đồng hoặc hóa đơn.

### Quản lý kho quân tư trang

1. Mở **Kho quân tư trang**.
2. Thêm mặt hàng thử, ví dụ mã `QS-MUN-01`, tên `Quân phục`, loại `Quân phục`, cỡ `M`, tồn kho `10`, đơn vị `bộ`.
3. Trong dòng mặt hàng, chọn `QSDEMO001`, nhập `1`, rồi bấm **Cấp**. Tồn kho giảm còn 9 và xuất hiện phiếu cấp phát.
4. Bấm **Ghi nhận trả** trên phiếu, nhập `1`; tồn kho tăng lại 10. Có thể thử trả lớn hơn số chưa trả để xem hệ thống chặn.

### Quản lý phòng giao ban

1. Mở **Phòng giao ban**.
2. Tạo phòng, ví dụ mã `PGB-QS-01`, tên `Phòng giao ban quân sự`, vị trí `Tòa A1`, sức chứa `20`.
3. Chọn phòng, đặt tên/nội dung cuộc họp và một khoảng thời gian trong tương lai, rồi bấm **Đặt lịch**.
4. Đặt một lịch khác chồng thời gian cùng phòng để xem hệ thống báo trùng; sau đó bấm **Hủy lịch** trên lịch đã tạo để kết thúc demo.

## 6. Kết thúc demo

Từ thư mục gốc, dừng và xóa database tạm cùng dữ liệu của nó:

```powershell
docker compose -f backend/docker-compose.gdqp-demo.yml down -v
```

Lệnh này chỉ dành cho database demo trong Docker ở cổng `5433`. Với môi trường triển khai dùng database thật, áp dụng migration đã tạo bằng `cd backend; npx prisma migrate deploy` sau khi đã cấu hình đúng database.
