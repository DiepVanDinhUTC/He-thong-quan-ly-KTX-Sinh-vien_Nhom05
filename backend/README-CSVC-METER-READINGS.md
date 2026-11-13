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

Biểu mẫu mặc định điện 3.000 đ/kWh và nước 12.000 đ/m³; kế toán, thủ quỹ hoặc quản trị viên có thể sửa đơn giá trước mỗi lần lập hóa đơn. Đơn giá được ghi trong chi tiết hóa đơn, không tự lưu thành cấu hình cho lần lập tiếp theo.

Để thử trên cơ sở dữ liệu kiểm thử, tạo chỉ số giả cho các phòng có hợp đồng `ACTIVE` hoặc phân phòng quân sự `ACTIVE` giao với kỳ. Chạy từ thư mục gốc dự án:

```powershell
npm --prefix backend run seed:utility-readings -- --period=2026-10
npm --prefix backend run seed:utility-readings -- --period=2026-10 --apply
```

Bỏ `--period` để dùng tháng hiện tại theo giờ Việt Nam. Lệnh đầu chỉ xem số lượng, lệnh thứ hai mới ghi. Các chỉ số được đánh dấu là dữ liệu kiểm thử, dùng chỉ số cuối gần nhất làm đầu kỳ, không ghi đè chỉ số có sẵn và bỏ qua loại công tơ đã có kỳ sau. Script dùng tài khoản ADMIN đang hoạt động đầu tiên theo tên để lưu dấu người tạo; có thể chỉ định `--user=ten_admin`. Sau đó vào **Hóa đơn tháng**, chọn cùng kỳ và bấm lập hóa đơn; script không tạo hóa đơn hay ghi nhận thanh toán.

## Điện nước đợt GDQP

Trong **Ghi chỉ số điện nước**, chọn tháng bắt đầu đợt, nhập chỉ số điện và nước đầu/cuối cho từng phòng sau khi kết thúc đợt 10 ngày. Kế toán hoặc thủ quỹ mở **Hóa đơn tháng**, chọn cùng tháng, kiểm tra đơn giá rồi chọn **Lập hóa đơn GDQP 10 ngày**. Mỗi học viên được lập hóa đơn riêng, kể cả khi không có hợp đồng nội trú; tổng tiền phòng được chia đều, phần dư đồng được phân bổ theo thứ tự mã sinh viên. Hóa đơn hiện trong cổng sinh viên và dùng cùng luồng thu phí, VNPAY và hoàn tiền.

Đợt có chuyển phòng, kết thúc sớm hoặc lịch phòng chồng lấn được đánh dấu để xử lý riêng, không tự chia từ một cặp chỉ số cho cả đợt. Sau khi đã lập hóa đơn, hệ thống không sửa chỉ số hay lập lại đợt đó; kiểm tra kỹ chỉ số và đơn giá trước khi lập. Hạn thanh toán là đầu tháng sau tháng phát hành hóa đơn. Kỳ được chọn là tháng bắt đầu đợt, kể cả khi đợt kết thúc ở tháng sau.

Chỉ số GDQP là dữ liệu riêng với chỉ số tháng. Các chỉ số mẫu theo tháng do script ở trên tạo không được tự coi là chỉ số 10 ngày. Phòng nội trú gốc và hóa đơn tháng của hợp đồng vẫn được xử lý theo luồng hiện tại.

Tại mục này, nhân viên có thể ghi nhận thu tiền và hoàn tiền có lý do. Mục **Giao dịch** (`/financial-dashboard/transactions`) cho phép tra cứu và xác minh giao dịch thiếu mã tham chiếu hoặc trùng mã ngân hàng. Mục **Đối soát thu chi** (`/financial-dashboard/reconciliation`) tổng hợp các khoản thu, hoàn và chi, ghi chi phí cho phiếu sửa chữa đã hoàn tất và xuất CSV. Đường dẫn cũ `/financial-dashboard` chuyển đến mục hóa đơn.

Kế toán và thủ quỹ được xem và thao tác nghiệp vụ tài chính trên tất cả tòa nhà, không cần phân công từng tòa trong `USER_BUILDING_ACCESS`. Phạm vi này áp dụng cho hóa đơn, lập hóa đơn, thu phí, hoàn tiền, giao dịch, chi sửa chữa và đối soát; không cấp quyền truy cập sổ hoặc ghi chỉ số điện nước.

Trưởng phòng và phó phòng được xem các mục tài chính của tất cả tòa nhà, không được lập hóa đơn, thu phí, hoàn tiền, ghi chi phí hay xác minh giao dịch. Nhân viên CSVC và quản lý tòa vẫn chỉ được thao tác trong các tòa nhà được phân công.
