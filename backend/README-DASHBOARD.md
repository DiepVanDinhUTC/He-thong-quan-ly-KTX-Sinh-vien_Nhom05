# Thống kê hoạt động KTX

Trang `/` dùng Recharts và dữ liệu tổng hợp từ `GET /api/v1/dashboard`. Các sidebar của nhân viên nội bộ đều có mục **Thống kê BQL**. Trang chủ nghiệp vụ của từng vai trò vẫn là điểm đến sau đăng nhập.

## Quyền và phạm vi

- Trưởng/phó ban, hồ sơ, kế toán, thủ quỹ, quân sự, y tế và ADMIN xem thống kê toàn KTX hoặc lọc một tòa.
- Nhân viên CSVC, quản lý tòa và trật tự trị an chỉ xem các tòa được phân công trong `UserBuildingAccess`. Chưa phân công thì nhận thống kê rỗng, không tự mở phạm vi toàn KTX.
- Sinh viên, học viên quân sự và nhà cung cấp dịch vụ không có quyền xem dashboard BQL.
- Quyền mới `dashboard:read` chỉ cấp số liệu tổng hợp. Các quyền xem/sửa chi tiết phòng, hóa đơn, sửa chữa và hồ sơ y tế tiếp tục được kiểm tra riêng.
- Đổi tài khoản kiểm thử sẽ tạo lại trang thống kê, xóa bộ lọc và dữ liệu của tài khoản trước.

## API

`GET /api/v1/dashboard?months=6&maToaNha=A1`, yêu cầu JWT. `months` nhận `3`, `6`, `12`, mặc định `6`; `maToaNha` không bắt buộc và phải thuộc phạm vi tài khoản.

Thời gian gồm tháng hiện tại, chia tháng theo múi giờ Việt Nam. Kết quả chỉ có danh sách tòa, tổng số, các chuỗi biểu đồ và thời điểm tổng hợp; không trả hồ sơ cá nhân, danh sách giao dịch hoặc danh sách phiếu sự cố. Không giới hạn ngầm ở 200/500 bản ghi như các màn hình danh sách nghiệp vụ.

## Cách tính 5 biểu đồ

1. **Lấp đầy phòng:** tổng số người đã xếp / sức chứa, theo tòa và toàn phạm vi. Tính từ hợp đồng `ACTIVE`, hợp đồng giữ chỗ `PENDING_PAYMENT` và phân phòng quân sự `ACTIVE`; mỗi mã sinh viên chỉ tính một lần trong một phòng. Dùng cùng nguồn với danh sách thành viên và chỗ trống, không lấy riêng bộ đếm lưu trên phòng. Tỷ lệ toàn phạm vi tính từ tổng chỗ, không lấy trung bình tỷ lệ các tòa.
2. **Doanh thu hóa đơn:** khoản thu `COLLECTION` đã `CONFIRMED` cho `CONTRACT`/`MONTHLY`; trừ `REFUND` đã xác nhận để ra doanh thu ròng. Không cộng chi sửa chữa hoặc giao dịch chờ xác minh. Biên lai `HoaDon` cũ chưa có khoản thu trong sổ vẫn được cộng; khi sổ đã ghi nhận hợp đồng đó, không cộng biên lai lần nữa. Tra cứu cả bút toán ngoài kỳ của các biên lai trong kỳ để tránh đếm lại. Sổ giao dịch dùng tòa tại lúc ghi nhận; biên lai cũ dùng phòng hiện gắn với hợp đồng vì không lưu lịch sử tòa riêng.
3. **Công nợ:** toàn bộ phí hợp đồng `PENDING_PAYMENT` và hóa đơn tháng `UNPAID` còn lớn hơn 0, không giới hạn theo bộ lọc tháng. Phần quá hạn dùng cùng hạn thanh toán với màn hình hóa đơn. Công nợ và lấp đầy luôn phản ánh hiện trạng tại lúc tải.
4. **Thời gian xử lý:** trung bình số giờ từ tạo phiếu đến `resolvedAt` cho phiếu `WAITING_ACCEPTANCE`/`COMPLETED`, theo tháng kỹ thuật hoàn tất. Dữ liệu cũ thiếu `resolvedAt` dùng `completedAt`. Trung bình toàn kỳ có trọng số theo số phiếu; tháng không có phiếu hoàn tất trả `null`, không giả thành 0 giờ. Loại mốc thời gian âm hoặc trong tương lai.
5. **Tần suất báo hỏng:** số phiếu theo tháng tạo và nhóm điện, nước, điều hòa, nội thất, khác; loại phiếu `REJECTED`. Giá trị đơn/tháng bằng tổng số phiếu trong kỳ chia số tháng đã chọn, bao gồm tháng hiện tại chưa kết thúc.

Mỗi biểu đồ có tooltip và bảng số liệu có thể mở để tra cứu. Chưa có dữ liệu sẽ hiển thị trạng thái rỗng rõ ràng. Recharts được tải riêng khi cần để không đưa thư viện biểu đồ vào toàn bộ trang nghiệp vụ.
