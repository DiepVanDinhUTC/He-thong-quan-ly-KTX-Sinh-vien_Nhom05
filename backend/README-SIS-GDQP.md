# Job cấp tài khoản học viên quân sự từ SIS

> Quy tắc hiện hành: job SIS chỉ cập nhật hồ sơ/tài khoản, không tự phân phòng theo thời điểm chạy job. Cán bộ chọn ngày bắt đầu để bố trí đợt 14 ngày tại **Xếp phòng quân sự**. Hợp đồng và chỗ nội trú gốc được giữ riêng. Xem [README-MILITARY-STUDENT.md](README-MILITARY-STUDENT.md) trước khi chạy demo phân phòng.

Job lấy danh sách đăng ký học phần GDQP từ SIS, giữ các bản ghi khớp mã học phần, đợt học và khoa đã cấu hình, rồi đánh dấu hồ sơ `laHocVienQuanSu=true` và cấp tài khoản nếu cần. Job có thể chạy theo lịch hoặc chạy một lượt bằng lệnh.

## Cấu hình SIS

Hai luồng sinh viên chính quy và học viên quân sự dùng chung `SIS_UTC_API_URL` và hàm gọi trong `sisStudentSource.js`. Khi chưa được cấp quyền SIS nhà trường, dùng endpoint mock nội bộ; endpoint này trả 50 hồ sơ giả lập, mỗi hồ sơ có một đăng ký GDQP hợp lệ:

```dotenv
SIS_UTC_API_URL=http://localhost:5000/api/v1/mock/sis-utc/students
SIS_API_TOKEN=
SIS_API_TIMEOUT_MS=15000
SIS_GDQP_ENABLED=false
SIS_GDQP_COURSE_CODE=GDQP101
SIS_GDQP_BATCHES=DOT-1,DOT-2
SIS_GDQP_FACULTY_CODES=KHOA-CNTT,KHOA-CT,KHOA-VTK,KHOA-DT,KHOA-CK
SIS_MILITARY_STUDENT_DEFAULT_PASSWORD=Demo@2026
SIS_GDQP_CRON=15 2 * * *
SIS_GDQP_TIMEZONE=Asia/Ho_Chi_Minh
```

Trên localhost chính, chạy backend ở cổng `5000`; endpoint mock tự gọi lại backend đó. Cả 50 hồ sơ đều có một đăng ký GDQP hợp lệ, chia đều giữa `DOT-1`, `DOT-2` và năm khoa mẫu. Có thể bấm **Đồng bộ SIS ngay** mà không cần quyền truy cập SIS nhà trường.

Lời gọi chung là `GET`, timeout lấy từ `SIS_API_TIMEOUT_MS` (mặc định 15 giây), có thể gửi Bearer token khi `SIS_API_TOKEN` được đặt, và đọc mảng `response.data.data`. `SIS_GDQP_ENABLED=true` bật lịch tự động; mặc định job chạy hằng ngày lúc 02:15 theo giờ Việt Nam. Khi chưa bật, backend vẫn chạy bình thường và lệnh chạy thủ công vẫn dùng được.

Mỗi hồ sơ SIS cần kèm danh sách đăng ký trong `courseRegistrations`, `courseEnrollments`, `enrollments`, `registrations`, `dangKyHocPhans` hoặc `hocPhanDangKys`. Mỗi đăng ký cung cấp mã học phần (`courseCode`/`maHocPhan`), mã khoa (`facultyCode`/`maKhoa`), mã đợt (`batchCode`/`maDot`) và trạng thái tùy chọn. Job cũng nhận bản ghi đăng ký đặt trực tiếp ở cấp hồ sơ. Hồ sơ sinh viên dùng chính các trường như luồng đồng bộ chính quy: mã SV, họ tên, ngày sinh, giới tính, lớp, khoa, CCCD, điện thoại và email. Các trạng thái đã xác nhận như `REGISTERED`, `ENROLLED`, `APPROVED`, `CONFIRMED`, `DA_DANG_KY`, `DANG_KY`, `DA_XAC_NHAN`, `DA_DUYET` được nhận; trạng thái khác bị bỏ qua. Nếu SIS hiện chỉ trả hồ sơ sinh viên mà chưa có thông tin đăng ký GDQP, cần bổ sung thông tin đăng ký vào phản hồi đó để job lọc được học viên.

## Cách cấp tài khoản

- Username là mã sinh viên; tài khoản mới có vai trò `MILITARY_STUDENT` và mật khẩu khởi tạo lấy từ `SIS_MILITARY_STUDENT_DEFAULT_PASSWORD` (hoặc biến mật khẩu SIS sinh viên hiện có nếu biến này để trống).
- Hồ sơ được đánh dấu `laHocVienQuanSu=true`; nếu đã có tài khoản `STUDENT` hoặc `MILITARY_STUDENT`, job giữ nguyên vai trò và mật khẩu. Tài khoản vai trò khác được bỏ qua để kiểm tra thủ công.
- Nếu chưa có tài khoản, job tạo tài khoản `MILITARY_STUDENT`. Hồ sơ được cập nhật theo mã sinh viên; job chạy lại không tạo tài khoản trùng. Lỗi từng học viên được đưa vào `skipped`, các học viên còn lại vẫn tiếp tục xử lý.
- Chạy thủ công: `cd backend` rồi `npm run job:sync-gdqp`.
- Log cron ghi tổng số đăng ký nhận được, được chọn, tài khoản tạo, hồ sơ gắn diện quân sự, hồ sơ liên kết và danh sách lý do bỏ qua.

> Nếu chạy nhiều instance backend, chỉ bật cron trên một instance. Cơ chế chống chạy chồng chỉ áp dụng trong cùng tiến trình.

## Demo trên localhost chính

Backend chính dùng endpoint SIS mock trên cùng cổng `5000`. Cấu hình hiện tại trong `.env` chọn học phần `GDQP101`, hai đợt `DOT-1,DOT-2`, năm khoa mẫu và bật job hằng ngày lúc 02:15 giờ Việt Nam. Sau khi đổi `.env`, khởi động lại backend. Trang quản lý quân sự có thể chạy đồng bộ ngay bằng nút **Đồng bộ SIS ngay**.

SIS mock trả 50 đăng ký hợp lệ. Đồng bộ chạy theo lô tối đa 5 hồ sơ để giới hạn kết nối database; hồ sơ đã xử lý được cập nhật theo mã sinh viên nên chạy lại không tạo tài khoản trùng. Các đăng ký lặp cho cùng mã sinh viên được gộp thành một hồ sơ.

Với bộ phòng mẫu có 48 chỗ quân sự và 50 học viên, đồng bộ tiếp nhận đủ hồ sơ. Sau đó cán bộ chọn ngày bắt đầu và bấm **Xếp phòng đợt 14 ngày**: tối đa 48 người được xếp theo giới tính, số còn lại chờ phòng. Muốn xếp đủ 50 cần tăng sức chứa hợp lệ hoặc cho phép thêm phòng A1.

## Demo tách biệt trên database Docker

Demo dùng một PostgreSQL riêng trong Docker và cùng endpoint SIS giả lập `/api/v1/mock/sis-utc/students` mà luồng đồng bộ sinh viên chính quy sử dụng. Một số hồ sơ mẫu có đăng ký GDQP gắn kèm. Không dùng DB trong `backend/.env` để chạy dữ liệu giả. Các lệnh dưới đây dành cho PowerShell.

### 1. Khởi động DB demo

Từ thư mục gốc dự án:

```powershell
docker compose -f backend/docker-compose.gdqp-demo.yml up -d
```

### 2. Tạo schema trên DB demo

Mở PowerShell mới:

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://postgres:ktx-demo-only@localhost:5433/ktx_gdqp_demo?schema=public'
$env:DIRECT_URL = $env:DATABASE_URL
npx prisma db push
```

### 3. Chạy backend và bật cron demo

Trong PowerShell thứ hai, từ thư mục `backend`, đặt cùng DB demo và cấu hình mock SIS:

```powershell
cd backend
$env:DATABASE_URL = 'postgresql://postgres:ktx-demo-only@localhost:5433/ktx_gdqp_demo?schema=public'
$env:DIRECT_URL = $env:DATABASE_URL
$env:PORT = '5001'
$env:JWT_SECRET = 'demo-only-secret-change-for-any-real-environment'
$env:SIS_GDQP_ENABLED = 'true'
$env:SIS_UTC_API_URL = 'http://localhost:5001/api/v1/mock/sis-utc/students'
$env:SIS_GDQP_COURSE_CODE = 'GDQP101'
$env:SIS_GDQP_BATCHES = 'DOT-1,DOT-2'
$env:SIS_GDQP_FACULTY_CODES = 'KHOA-CNTT,KHOA-CT,KHOA-VTK,KHOA-DT,KHOA-CK'
$env:SIS_MILITARY_STUDENT_DEFAULT_PASSWORD = 'Demo@2026'
$env:SIS_GDQP_CRON = '*/1 * * * *'
$env:SIS_GDQP_TIMEZONE = 'Asia/Ho_Chi_Minh'
npm run dev
```

Backend chạy ở `http://localhost:5001`. Gọi `http://localhost:5001/api/v1/mock/sis-utc/students` để xem nguồn SIS dùng chung. API trả 50 hồ sơ và 50 đăng ký GDQP hợp lệ; với database demo mới, job tiếp nhận đủ 50 hồ sơ. Chọn ngày bắt đầu trong giao diện cán bộ trước khi phân phòng. Nếu bộ phòng demo có 48 chỗ quân sự thì sau lượt phân phòng, hai học viên còn chờ chỗ phù hợp.

### 4. Xem job tự động chạy

Chờ tối đa một phút và xem terminal backend. Ở lượt đầu trên DB demo mới, log tổng kết dự kiến có `received: 50`, `selected: 50`, `createdAccounts: 50`, `linkedProfiles: 50`, `skipped: 0`. Các lượt sau cập nhật cùng 50 hồ sơ, không tạo tài khoản trùng và không mở lại hoặc kéo dài phân phòng. Cán bộ chủ động chọn ngày bắt đầu để phân phòng đợt 14 ngày.

Để chạy ngay một lượt khác thủ công, mở PowerShell thứ ba, đặt lại các biến DB và SIS như ở bước 3 rồi chạy:

```powershell
npm run job:sync-gdqp
```

### 5. Đăng nhập và xem hồ sơ

Từ thư mục gốc, mở PowerShell khác và chạy frontend với API trỏ về backend demo:

```powershell
cd frontend
$env:VITE_API_URL = 'http://localhost:5001/api/v1'
npm run dev -- --host 127.0.0.1 --port 5176
```

Mở `http://127.0.0.1:5176` và đăng nhập bằng một trong các tài khoản mẫu:

| Username | Mật khẩu demo | Khoa / đợt |
| --- | --- | --- |
| `SIS2400001` | `Demo@2026` | CNTT / DOT-1 |
| `SIS2400005` | `Demo@2026` | Cơ khí / DOT-2 |
| `SIS2400006` | `Demo@2026` | CNTT / DOT-2 |

Muốn kiểm tra trực tiếp dữ liệu đã tạo, mở PowerShell có đặt `DATABASE_URL` và `DIRECT_URL` như bước 2, chạy `npx prisma studio`, rồi xem các bảng `USER_ACCOUNT` và `SINH_VIEN`. Tài khoản có vai trò `MILITARY_STUDENT`, username là mã SV, hồ sơ sinh viên được liên kết qua `userId`.

### 6. Chuyển từ demo sang SIS thật

Chỉ cần thay `SIS_UTC_API_URL` bằng endpoint thật dùng cho đồng bộ sinh viên chính quy; đặt `SIS_API_TOKEN` nếu SIS yêu cầu Bearer token và cập nhật timeout nếu cần. Giữ nguyên luồng gọi, sau đó thay `SIS_GDQP_COURSE_CODE`, `SIS_GDQP_BATCHES`, `SIS_GDQP_FACULTY_CODES` theo mã do Phòng Đào tạo cung cấp. Phản hồi thật cần giữ cùng hợp đồng dữ liệu: mảng hồ sơ trong `data` và thông tin đăng ký GDQP trên mỗi hồ sơ. Khởi động lại backend sau khi đổi cấu hình, chạy thủ công trên staging, kiểm tra tổng kết và `skipped`, rồi bật `SIS_GDQP_ENABLED=true` để chạy cron. Nếu dừng demo, chạy `docker compose -f backend/docker-compose.gdqp-demo.yml down` để dừng PostgreSQL demo.
