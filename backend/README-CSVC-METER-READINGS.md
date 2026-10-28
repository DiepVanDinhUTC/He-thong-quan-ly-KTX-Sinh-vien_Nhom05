# Ghi chỉ số điện nước cho CSVC

API chỉ trả về các phòng thuộc tòa nhà được gán cho tài khoản trong `USER_BUILDING_ACCESS`. Bảng lưu chỉ số cần được tạo trước khi trang tải được sổ ghi.

Chỉ nhân viên CSVC (`FACILITIES_MANAGER`), quản lý tòa (`BUILDING_MANAGER`) và quản trị viên (`ADMIN`) được mở sổ và ghi chỉ số. Kế toán (`ACCOUNTANT`) và thủ quỹ (`TREASURER`) không có quyền truy cập sổ chỉ số hoặc gọi API ghi chỉ số; hai vai trò này sử dụng số liệu đã ghi để lập hóa đơn, thu phí và đối soát.

Chạy từ thư mục `backend` để áp dụng migration và cập nhật Prisma Client:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Sau đó khởi động lại backend. Nếu tài khoản vẫn không thấy phòng, kiểm tra tài khoản có bản ghi phân công tòa nhà trong `USER_BUILDING_ACCESS` và tòa nhà đó có phòng trong `Phong`.

## Lập hóa đơn và đối soát

Khu vực kế toán/thủ quỹ có sidebar nghiệp vụ riêng, cùng bố cục với trang cán bộ quản lý quân sự. Mục **Hóa đơn tháng** (`/financial-dashboard/invoices`) cho phép chọn kỳ, nhập đơn giá điện/nước đã được phê duyệt và lập hóa đơn từ chỉ số CSVC đã ghi. Phòng có nhiều hợp đồng đang hoạt động được chia đều tiền điện nước; khoản đền bù hư hỏng đã có trong kỳ được giữ lại trên hóa đơn. Hóa đơn đã thu sẽ không bị tính lại.

Tại mục này, nhân viên có thể ghi nhận thu tiền và hoàn tiền có lý do. Mục **Giao dịch** (`/financial-dashboard/transactions`) cho phép tra cứu và xác minh giao dịch thiếu mã tham chiếu hoặc trùng mã ngân hàng. Mục **Đối soát thu chi** (`/financial-dashboard/reconciliation`) tổng hợp các khoản thu, hoàn và chi, ghi chi phí cho phiếu sửa chữa đã hoàn tất và xuất CSV. Đường dẫn cũ `/financial-dashboard` chuyển đến mục hóa đơn.

Kế toán và thủ quỹ được xem và thao tác nghiệp vụ tài chính trên tất cả tòa nhà, không cần phân công từng tòa trong `USER_BUILDING_ACCESS`. Phạm vi này áp dụng cho hóa đơn, lập hóa đơn, thu phí, hoàn tiền, giao dịch, chi sửa chữa và đối soát; không cấp quyền truy cập sổ hoặc ghi chỉ số điện nước.

Trưởng ban và phó trưởng ban được xem các mục tài chính của tất cả tòa nhà, không được lập hóa đơn, thu phí, hoàn tiền, ghi chi phí hay xác minh giao dịch. Nhân viên CSVC và quản lý tòa vẫn chỉ được thao tác trong các tòa nhà được phân công.
