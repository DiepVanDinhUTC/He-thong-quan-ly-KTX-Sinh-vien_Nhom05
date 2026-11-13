# Check-in và hủy hợp đồng trong 7 ngày

Sau khi hợp đồng được thanh toán và có hiệu lực, nhân viên quản lý tòa mở danh sách hợp đồng, xác nhận sinh viên đã trực tiếp nhận chìa khóa. Hệ thống lưu thời điểm máy chủ và tài khoản xác nhận; nhân viên chỉ thao tác trong tòa được phân công.

Sinh viên gửi yêu cầu trả phòng. Nếu thời điểm gửi nằm trong khoảng từ lúc check-in đến đúng 168 giờ sau đó, hệ thống tự động hủy hợp đồng, giải phóng chỗ và tạo khoản hoàn bằng số tiền hợp đồng đã thu còn chưa hoàn. Kế toán hoặc thủ quỹ thực hiện chuyển tiền và xác nhận khoản hoàn trong sổ giao dịch. Hệ thống không kết nối cổng chuyển tiền hoàn tự động. Các yêu cầu ngoài khoảng này hoặc hợp đồng cũ chưa có check-in vẫn theo quy trình duyệt trả phòng thông thường.

Trước khi sử dụng, áp dụng migration Prisma và tạo lại Prisma Client (`npx prisma migrate deploy` và `npm run db:generate` trong thư mục backend), rồi khởi động lại backend.
