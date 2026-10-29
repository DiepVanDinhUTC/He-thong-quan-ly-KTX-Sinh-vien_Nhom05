# Học viên GDQP trong cổng sinh viên nội trú

Học viên quân sự dùng chung `StudentLayout` và trang chủ `/student-portal` với sinh viên nội trú. Sinh viên đang có tài khoản `STUDENT` tham gia GDQP tiếp tục dùng tài khoản, vai trò và mật khẩu hiện có. `laHocVienQuanSu` là dấu hiệu nghiệp vụ, không thay thế vai trò đăng nhập. Tài khoản mới do SIS cấp dùng vai trò `MILITARY_STUDENT`.

## Chức năng của học viên

| Chức năng | Quy tắc |
| --- | --- |
| Đợt học GDQP (`/military-stay`) | Xem phòng quân sự, mã đợt, ngày bắt đầu/kết thúc, tình trạng sắp học/đang học/đã kết thúc; xem quân tư trang của chính mình đã nhận, đã trả và còn phải trả. |
| Phòng ở (`/my-room`) | Xem phòng đang sử dụng và bạn cùng phòng; trong đợt GDQP hiển thị thêm hợp đồng/phòng nội trú gốc được giữ chỗ. |
| Báo hỏng (`/ticket-report`) | Gửi sự cố, theo dõi, nghiệm thu hoặc yêu cầu sửa lại. Backend gắn yêu cầu vào phòng GDQP đang hiệu lực; sau đợt học dùng phòng nội trú gốc. Không nhận mã phòng tùy ý từ trình duyệt. |
| Hóa đơn (`/bill-payment`) | Xem và thanh toán các khoản thực tế của chính sinh viên. Phân phòng GDQP không tạo hợp đồng/hóa đơn nội trú thứ hai. |
| Dịch vụ (`/service-registration`) | Đăng ký khi có hợp đồng nội trú thường xuyên đang hiệu lực. Phân phòng quân sự không giả làm hợp đồng để mở dịch vụ. |
| Đăng ký, chuyển/trả phòng nội trú | Giữ phân quyền hiện có của tài khoản `STUDENT`. Đây là thay đổi hợp đồng nội trú gốc, không phải thủ tục đi học hoặc kết thúc GDQP. `MILITARY_STUDENT` không tự chọn/chuyển/trả phòng quân sự. |
| Hồ sơ cá nhân | Xem thông tin, cập nhật liên lạc và đổi mật khẩu trong cùng giao diện sinh viên. |

Học viên chỉ tra cứu quân tư trang của mình qua `/api/v1/self-service/military-stay/mine`. Cán bộ quân sự thực hiện phân phòng, cấp phát, thu hồi và xác nhận kết thúc sớm; học viên không có quyền ghi các nghiệp vụ quản lý này.

## Sinh viên đang nội trú đi GDQP 2 tuần

Ví dụ SV1 có hợp đồng HD1 tại B201 và được xếp QS101 từ 00:00 ngày 01/11/2026 đến 00:00 ngày 15/11/2026, giờ Việt Nam:

1. **Trước đợt:** B201 vẫn là phòng hiện tại; QS101 hiển thị là phân phòng sắp tới và giữ một chỗ quân sự.
2. **Trong đợt:** QS101 là chỗ ở hiện tại. HD1 vẫn giữ nguyên phòng, thời hạn, số tiền, hóa đơn và dịch vụ. Giường B201 được đánh dấu `TAM_VANG_GDQP`, vẫn tính vào số chỗ đã cấp nên không thể cấp lại cho sinh viên khác, nhưng không tính là người đang ở thực tế tại B201.
3. **Kết thúc:** Từ đúng thời điểm kết thúc (mốc cuối không bao gồm), QS101 không còn là chỗ ở hiệu lực. Hồ sơ tự hiển thị lại B201 nếu HD1 còn hiệu lực. Nếu không có hợp đồng nội trú, học viên không còn phòng; hệ thống không tự tạo hợp đồng mới.

Quy tắc giữ chỗ không kéo dài hợp đồng nội trú và không tự miễn/giảm tiền phòng. Nếu hợp đồng hết hạn hoặc được xử lý trả/chuyển phòng qua nghiệp vụ nội trú, kết quả theo hiệu lực hợp đồng thực tế; không khôi phục một hợp đồng đã đóng.

## Thời hạn và đồng bộ

- `MilitaryRoomAssignment.startsAt` và `endsAt` xác định đúng 14 ngày; `assignedAt` là thời điểm tạo bản ghi, `endedAt` là thời điểm kết thúc thực tế. Có thể đặt ngày bắt đầu tương lai. Ngày dạng `YYYY-MM-DD` được hiểu là 00:00 giờ Việt Nam.
- Khi đổi phòng quân sự trong cùng đợt, giữ nguyên ngày bắt đầu/kết thúc; không tính lại 14 ngày từ lúc đổi phòng.
- Cron thu hồi chỗ quân sự hết hạn chạy mỗi 5 phút, kể cả khi cron đồng bộ SIS tắt. Hồ sơ sinh viên và số chỗ hiển thị xét mốc thời gian trực tiếp nên không phụ thuộc việc cron đã chạy hay chưa.
- Đồng bộ SIS cập nhật hồ sơ/tài khoản, không tự bắt đầu thời hạn lưu trú vì SIS hiện chưa cung cấp lịch học chuẩn hóa. Cán bộ chọn ngày bắt đầu thực tế trong **Xếp phòng quân sự**; phân phòng đang hiệu lực được giữ nguyên. Chạy đồng bộ lại không mở lại đợt đã kết thúc.
- Danh sách chỉ được đánh dấu GDQP trước đây không đủ để cron tự mở một đợt mới. SIS hiện chưa cung cấp lịch học chuẩn hóa: cần cán bộ chọn ngày thực tế cho đợt tiếp theo.

## Cập nhật cơ sở dữ liệu

Migration cộng thêm cột, giữ nguyên dữ liệu hợp đồng và lịch sử:

```powershell
cd backend
npx prisma migrate deploy
npm run db:generate
```

Với database hiện hữu được quản lý bằng các script sửa cấu trúc (chưa có migration baseline), có thể áp dụng riêng script tương ứng:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261029000000_temporary_military_stays/migration.sql
npm run db:generate
```

Phân phòng cũ được điền ngày bắt đầu từ `assignedAt`, ngày kết thúc sau đó 14 ngày. Script có thể chạy lại mà không kéo dài các đợt đã có. Trên Windows, dừng tiến trình backend đang nạp Prisma trước khi generate rồi khởi động lại để dùng client mới.
