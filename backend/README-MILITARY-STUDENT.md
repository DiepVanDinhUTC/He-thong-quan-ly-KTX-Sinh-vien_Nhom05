# Học viên GDQP trong cổng sinh viên nội trú

Học viên quân sự dùng chung `StudentLayout` và trang chủ `/student-portal` với sinh viên nội trú. Đồng bộ QLĐT giả lập tạo 50 học viên mới mỗi lượt và tự xếp phòng quân sự trong 10 ngày khi có chỗ. `laHocVienQuanSu` là dấu hiệu nghiệp vụ; vai trò đăng nhập lấy từ `USER_ACCOUNT`. Tài khoản mới có vai trò `MILITARY_STUDENT`.

## Chức năng của học viên

| Chức năng | Quy tắc |
| --- | --- |
| Đợt học GDQP (`/military-stay`) | Xem phòng quân sự, mã đợt, ngày bắt đầu/kết thúc, tình trạng sắp học/đang học/đã kết thúc; xem quân tư trang của chính mình đã nhận, đã trả và còn phải trả. |
| Phòng ở (`/my-room`) | Xem phòng đang sử dụng và bạn cùng phòng; trong đợt GDQP hiển thị thêm hợp đồng/phòng nội trú gốc được giữ chỗ. |
| Báo hỏng (`/ticket-report`) | Gửi sự cố, theo dõi, nghiệm thu hoặc yêu cầu sửa lại. Backend gắn yêu cầu vào phòng GDQP đang hiệu lực; sau đợt học dùng phòng nội trú gốc. Không nhận mã phòng tùy ý từ trình duyệt. |
| Hóa đơn (`/bill-payment`) | Xem và thanh toán các khoản thực tế của chính sinh viên. Phân phòng GDQP không tạo hợp đồng/hóa đơn nội trú thứ hai. |
| Dịch vụ (`/service-registration`) | Đăng ký khi có hợp đồng nội trú thường xuyên đang hiệu lực. Phân phòng quân sự không giả làm hợp đồng để mở dịch vụ. |
| Đăng ký, chuyển/trả phòng nội trú | Tài khoản chuyển sang `MILITARY_STUDENT` vẫn có thể xem và gửi yêu cầu đối với hợp đồng nội trú gốc còn hiệu lực. Học viên không tự chọn/chuyển/trả phòng quân sự. Đăng ký mới tiếp tục dành cho vai trò `STUDENT`. |
| Hồ sơ cá nhân | Xem thông tin, cập nhật liên lạc và đổi mật khẩu trong cùng giao diện sinh viên. |

Học viên chỉ tra cứu quân tư trang của mình qua `/api/v1/self-service/military-stay/mine`. Cán bộ quân sự thực hiện phân phòng, cấp phát, thu hồi và xác nhận kết thúc sớm; học viên không có quyền ghi các nghiệp vụ quản lý này.

## Sinh viên đang nội trú đi GDQP 10 ngày

Ví dụ SV1 có hợp đồng HD1 tại B201 và được xếp QS101 từ 00:00 ngày 01/11/2026 đến 00:00 ngày 11/11/2026, giờ Việt Nam:

1. **Trước đợt:** B201 vẫn là phòng hiện tại; QS101 hiển thị là phân phòng sắp tới và giữ một chỗ quân sự.
2. **Trong đợt:** QS101 là chỗ ở hiện tại. HD1 vẫn giữ nguyên phòng, thời hạn, số tiền, hóa đơn và dịch vụ. Giường B201 được đánh dấu `TAM_VANG_GDQP`, vẫn tính vào số chỗ đã cấp nên không thể cấp lại cho sinh viên khác, nhưng không tính là người đang ở thực tế tại B201.
3. **Kết thúc:** Từ đúng thời điểm kết thúc (mốc cuối không bao gồm), QS101 không còn là chỗ ở hiệu lực. Hồ sơ tự hiển thị lại B201 nếu HD1 còn hiệu lực. Nếu không có hợp đồng nội trú, học viên không còn phòng; hệ thống không tự tạo hợp đồng mới.

Khi phân phòng GDQP hết hạn hoặc được cán bộ kết thúc sớm, tài khoản từng chuyển từ `STUDENT` tự trở về `STUDENT` nếu không còn phân phòng quân sự hiện tại hoặc sắp tới. Tác vụ chạy mỗi 5 phút khi backend hoạt động. Tài khoản tạo mới với vai trò học viên quân sự giữ nguyên vai trò. Lần đồng bộ tiếp theo không chuyển lại tài khoản đã hoàn thành cùng mã học phần và mã đợt; đợt mới cần dùng mã đợt riêng. Nếu chưa có phân phòng, tài khoản chờ cán bộ chọn ngày bắt đầu nên chưa có thời điểm tự khôi phục.

Quy tắc giữ chỗ không kéo dài hợp đồng nội trú và không tự miễn/giảm tiền phòng. Nếu hợp đồng hết hạn hoặc được xử lý trả/chuyển phòng qua nghiệp vụ nội trú, kết quả theo hiệu lực hợp đồng thực tế; không khôi phục một hợp đồng đã đóng.

## Thời hạn và đồng bộ

- Phân phòng mới có `MilitaryRoomAssignment.startsAt` và `endsAt` cách nhau đúng 10 ngày; các đợt 14 ngày đã xếp giữ nguyên thời hạn. `assignedAt` là thời điểm tạo bản ghi, `endedAt` là thời điểm kết thúc thực tế. Có thể đặt ngày bắt đầu tương lai. Ngày dạng `YYYY-MM-DD` được hiểu là 00:00 giờ Việt Nam.
- Khi đổi phòng quân sự trong cùng đợt, giữ nguyên ngày bắt đầu/kết thúc; không tính lại thời hạn từ lúc đổi phòng.
- Cron thu hồi chỗ quân sự hết hạn chạy mỗi 5 phút, kể cả khi cron đồng bộ QLĐT tắt. Hồ sơ sinh viên và số chỗ hiển thị xét mốc thời gian trực tiếp nên không phụ thuộc việc cron đã chạy hay chưa.
- Đồng bộ QLĐT bắt đầu phân phòng 10 ngày từ thời điểm chạy; nếu không đủ phòng phù hợp, học viên còn lại chờ xếp phòng.
- Cán bộ có thể chọn ngày bắt đầu cho các đợt khác trong **Xếp phòng quân sự**.

## Cập nhật cơ sở dữ liệu

Migration cộng thêm cột, giữ nguyên dữ liệu hợp đồng và lịch sử:

```powershell
cd backend
npx prisma migrate deploy
npm run db:generate
```

Với database hiện hữu được quản lý bằng các script sửa cấu trúc (chưa có migration baseline), chỉ áp dụng riêng các script tương ứng nếu chúng chưa được chạy:

```powershell
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261029000000_temporary_military_stays/migration.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261029010000_gdqp_account_roles/migration.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261031010000_military_ten_day_stays/migration.sql
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261031020000_military_utility_billing/migration.sql
npm run db:generate
```

Migration cũ điền các phân phòng thiếu ngày kết thúc theo thời hạn 14 ngày. Migration mới giữ nguyên các phân phòng đó và cho phép đợt mới 10 ngày. Trên Windows, dừng tiến trình backend đang nạp Prisma trước khi generate rồi khởi động lại để dùng client mới.
