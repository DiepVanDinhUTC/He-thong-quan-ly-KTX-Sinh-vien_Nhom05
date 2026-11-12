# Đồng bộ học viên quân sự QLĐT

Nút **Đồng bộ QLĐT ngay** tạo 50 hồ sơ giả lập mới mỗi lần, cấp tài khoản học viên và tự xếp những hồ sơ vừa tạo vào phòng quân sự A1 trong 10 ngày kể từ thời điểm đồng bộ. Đây là nguồn giả lập nội bộ, chưa kết nối hệ thống QLĐT thật. Luồng đồng bộ sinh viên chính quy từ SIS vẫn độc lập.

Hệ thống chỉ xếp phòng phù hợp theo giới tính và sức chứa. Nếu không đủ chỗ hoặc không thể xếp phòng, kết quả đồng bộ cho biết số học viên chờ hoặc lý do; hồ sơ đã tạo vẫn được giữ lại. Có thể xử lý tiếp trong **Xếp phòng quân sự**. Tài khoản dùng mã sinh viên được tạo làm tên đăng nhập, mật khẩu mặc định là `Ktx@2026`, có thể đổi bằng `QLDT_MILITARY_STUDENT_DEFAULT_PASSWORD`.

Đồng bộ theo lịch mặc định tắt. Để bật, đặt `QLDT_GDQP_ENABLED=true`, `QLDT_GDQP_ASSIGNED_BY_ID` bằng ID tài khoản cán bộ hợp lệ, và tùy chọn `QLDT_GDQP_CRON`, `QLDT_GDQP_TIMEZONE`. Mỗi lượt theo lịch cũng tạo thêm 50 hồ sơ. Lệnh `npm run job:sync-gdqp` trong thư mục backend cũng cần `QLDT_GDQP_ASSIGNED_BY_ID`. Các biến `SIS_GDQP_ENABLED` và lịch SIS cũ không bật job QLĐT.
