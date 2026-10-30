# Phòng tòa A1

Chạy từ thư mục gốc để bổ sung riêng A1, không cần chạy lại các seed khác:

```bash
npm --prefix backend run seed:a1-rooms
```

A1 thuộc `KHU_NCT`, gồm 68 phòng: 101–117, 201–217, 301–317, 401–417.
32 phòng nội trú quân sự là **103–107, 201–209, 301–309, 401–409**, loại `PHO_THONG_KHONG_DIEU_HOA`.
Các phòng còn lại dùng `CO_BAN` hoặc `CO_BAN_NHO`.
Cả xếp phòng quân sự tự động và thủ công đều dùng danh sách cố định này.

Với phòng mới, mặc định ba phòng cuối mỗi tầng (115–117, 215–217, 315–317, 415–417) là Cơ bản nhỏ, 6 chỗ; các phòng khác có 8 chỗ. Phí và tiện nghi lấy từ cấu hình loại phòng. Đây là phân bố mặc định khi chưa có thông tin diện tích từng phòng.

Script kiểm tra cả số phòng trong A1 và mã phòng, nên phòng đã có với mã khác cũng được bỏ qua. Phòng cũ chỉ được chỉnh loại nếu chưa phù hợp với khu vực quân sự/thông thường; biến thể Cơ bản/Cơ bản nhỏ đã có ở khu thông thường được giữ lại. Sức chứa, mức phí, người ở, hợp đồng và thiết bị của phòng cũ được giữ nguyên. Thiết bị chỉ được tạo cho phòng mới.

Toàn bộ thao tác nằm trong một transaction. Chạy lại không tạo thêm phòng hoặc thiết bị trùng. `seed:nct-rooms` cũng dùng cùng cấu hình A1 và cách bổ sung này.
