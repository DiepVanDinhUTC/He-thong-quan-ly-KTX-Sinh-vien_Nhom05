# Ghi chỉ số điện nước cho CSVC

API chỉ trả về các phòng thuộc tòa nhà được gán cho tài khoản trong `USER_BUILDING_ACCESS`. Bảng lưu chỉ số cần được tạo trước khi trang tải được sổ ghi.

Chạy từ thư mục `backend` để áp dụng migration và cập nhật Prisma Client:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Sau đó khởi động lại backend. Nếu tài khoản vẫn không thấy phòng, kiểm tra tài khoản có bản ghi phân công tòa nhà trong `USER_BUILDING_ACCESS` và tòa nhà đó có phòng trong `Phong`.

## Lập hóa đơn và đối soát

Kế toán hoặc thủ quỹ mở **Thu phí & Đối soát** để chọn kỳ, nhập đơn giá điện/nước đã được phê duyệt và lập hóa đơn từ chỉ số của kỳ đó. Phòng có nhiều hợp đồng đang hoạt động được chia đều tiền điện nước; khoản đền bù hư hỏng đã có trong kỳ được giữ lại trên hóa đơn. Hóa đơn đã thu sẽ không bị tính lại.

Tại cùng trang, nhân viên có thể ghi nhận thu tiền, hoàn tiền có lý do, ghi chi phí cho phiếu sửa chữa đã hoàn tất và xác minh giao dịch thiếu mã tham chiếu hoặc trùng mã ngân hàng. Các khoản thu, hoàn và chi được tổng hợp trong **Đối soát thu chi**.
