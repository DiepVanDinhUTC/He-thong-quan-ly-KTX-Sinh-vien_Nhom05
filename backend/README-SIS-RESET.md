# Tích hợp SIS và quên mật khẩu sinh viên

## Đồng bộ dữ liệu SIS

- API mẫu `GET /api/v1/mock/sis-utc/students` trả về 50 hồ sơ hư cấu, dùng email `example.test`.
- Cán bộ quản lý đồng bộ từ màn hình Quản lý sinh viên. Mỗi hồ sơ được cập nhật theo mã SV và liên kết với tài khoản có username là mã SV.
- Tài khoản mới được bật đăng nhập với role `STUDENT`; trạng thái hồ sơ ban đầu là `Chưa đăng ký`.
- Mật khẩu khởi tạo lấy từ `SIS_STUDENT_DEFAULT_PASSWORD` (mặc định `Ktx@2026`). Đồng bộ lại không đổi mật khẩu tài khoản đã có.

## Đặt lại mật khẩu

- Endpoint yêu cầu mã: `POST /api/v1/auth/forgot-password`, JSON `{ "identifier": "mã SV hoặc email" }`.
- Endpoint xác nhận: `POST /api/v1/auth/reset-password`, JSON `{ "identifier": "...", "code": "123456", "newPassword": "..." }`.
- Mã chỉ dùng một lần, lưu dưới dạng SHA-256, hết hạn sau 10 phút và tối đa 5 lần nhập sai.
- Để gửi mã thật, cấu hình `RESEND_API_KEY` và `MAIL_FROM` trong `backend/.env`.
- Khi phát triển cục bộ chưa có email, đặt `ENABLE_DEBUG_RESET_CODES=true`. API sẽ trả `debugCode` để thử luồng; không bật tùy chọn này trong production.
- DB cần bảng `PASSWORD_RESET_TOKEN`; bảng đã được cập nhật bằng `npx prisma db push`.
