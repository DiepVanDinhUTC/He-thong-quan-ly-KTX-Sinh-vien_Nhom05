# Hạn thanh toán hợp đồng nháp

- Đơn ưu tiên được tự động duyệt: 30 phút tính từ thời điểm duyệt.
- Đơn được nhân viên duyệt hoặc hợp đồng được xếp phòng thủ công: 3 ngày làm việc, bắt đầu từ ngày kế tiếp và giữ nguyên giờ duyệt theo múi giờ Việt Nam. Thứ Bảy và Chủ nhật không được tính.
- Khai báo thêm các ngày nghỉ lễ qua `CONTRACT_PAYMENT_HOLIDAYS=2026-04-30,2026-05-01` trong `.env`. Danh sách trống chỉ loại trừ cuối tuần; hệ thống không tự lấy lịch nghỉ lễ. Hạn được lưu tại thời điểm duyệt và không thay đổi khi cấu hình thay đổi.
- Các hợp đồng đã có trước khi nâng cấp không có `paymentDueAt` tiếp tục dùng hạn 48 giờ và lịch quét cũ. Hợp đồng mới quá hạn sẽ được quét mỗi phút, hủy nếu vẫn chờ thanh toán và giải phóng chỗ.
- Liên kết VNPAY không vượt quá hạn hợp đồng. Nếu VNPAY báo thanh toán thành công sau hạn hoặc sau khi hợp đồng bị hủy, giao dịch được ghi `NEEDS_REVIEW` để nhân viên thu phí đối soát và xử lý hoàn tiền; hợp đồng không tự kích hoạt lại.
- Webhook chuyển khoản ghi giao dịch có thể xác định duy nhất sau hạn vào sổ ở trạng thái `NEEDS_REVIEW`. Nguồn gửi nên cung cấp `transactionId` ổn định để các thông báo lặp không tạo bản ghi đối soát trùng; nếu không có mã này, từng thông báo sẽ tạo một bản ghi chờ kiểm tra. Thông báo không khớp duy nhất vẫn được trả về `matched: false` để đối soát ngoài hệ thống.

Nâng cấp cơ sở dữ liệu và Prisma Client trước khi khởi động lại backend:

```powershell
npx prisma db execute --file migrations/20261031_contract_payment_deadline.sql --schema prisma/schema.prisma
npx prisma generate
```
