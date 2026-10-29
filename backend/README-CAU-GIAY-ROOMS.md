# Khu 2 – Khu nội trú số 3 Cầu Giấy

Chạy từ thư mục gốc để bổ sung 18 phòng vào khu `KHU_03CG`:

```bash
npm --prefix backend run seed:cau-giay-rooms
```

Script tự tạo khu và hai tòa nhà nếu chưa có. Toàn bộ dữ liệu được thêm trong một transaction; chạy lại sẽ bỏ qua phòng đã có, giữ nguyên giá, người ở và tình trạng thiết bị đã chỉnh sửa. Không cần chạy lại các seed tài khoản hoặc seed phòng Nguyễn Chí Thanh.

| Tòa nhà | Loại phòng | Số phòng | Sinh viên/phòng | Phí dự kiến (đ/SV/tháng) |
| --- | --- | ---: | ---: | ---: |
| 3 tầng (`CG_3T`) | A1 (`CG_A1`) | 3 | 4 | 1.300.000 |
| 3 tầng (`CG_3T`) | A2 (`CG_A2`) | 3 | 4 | 1.625.000 |
| 4 tầng (`CG_4T`) | B1 (`CG_B1`) | 4 | 1 | 3.600.000 |
| 4 tầng (`CG_4T`) | B2 (`CG_B2`) | 4 | 2 | 2.100.000 |
| 4 tầng (`CG_4T`) | B3 (`CG_B3`) | 4 | 2 | 2.400.000 |

Tòa 3 tầng có phòng 101–102, 201–202, 301–302; tòa 4 tầng có phòng 101–103, 201–203, 301–303, 401–403. Mã phòng có tiền tố `CG-3T-` hoặc `CG-4T-` để phân biệt các tòa. Tổng sức chứa: **44 sinh viên**. Số phòng và cách phân bổ trên từng tầng là dữ liệu mẫu; loại phòng, sức chứa, phí và tiện nghi lấy theo bảng người dùng cung cấp.

Mọi phòng có hạ tầng nâng cấp, vệ sinh khép kín, bình nước nóng, điều hòa và internet. A1/A2 có hai giường tầng (4 chỗ); A2 thêm tủ quần áo, tủ giày. B1 có một giường đơn; B2/B3 có hai giường đơn. Thiết bị mới được khởi tạo ở trạng thái `TOT`.

Các mã `CG_A1`…`CG_B3` được dùng trong quản lý phòng, đăng ký nội trú và tính phí hợp đồng. Chữ A1/A2 trong bảng là **loại phòng**, khác với các mã tòa A1/A2 đang có trong hệ thống.

## Tài khoản quản lý cơ sở vật chất

Sau khi có dữ liệu hai tòa, chạy từ thư mục gốc:

```bash
npm --prefix backend run seed:cau-giay-managers
```

| Tài khoản | Mã nhân viên | Tòa phụ trách | Vai trò |
| --- | --- | --- | --- |
| `csvc.cg3t` | `NV-QLTN-CG3T` | Tòa nhà 3 tầng (`CG_3T`) | `FACILITIES_MANAGER` |
| `csvc.cg4t` | `NV-QLTN-CG4T` | Tòa nhà 4 tầng (`CG_4T`) | `FACILITIES_MANAGER` |

Các tài khoản dùng cùng vai trò **Cơ sở vật chất**, trang chủ `/facilities`, giao diện và chức năng như `csvc.a1`–`csvc.a6`: quản lý phòng & CSVC, danh mục tòa nhà, kho tài sản/thiết bị, ghi chỉ số điện nước và yêu cầu sửa chữa. Mỗi tài khoản chỉ có quyền tại tòa được phân công qua `USER_BUILDING_ACCESS`.

Nếu đã tạo tài khoản cũ `qltn.cg3t`/`qltn.cg4t`, script đổi tên thành `csvc.cg3t`/`csvc.cg4t`, chuyển vai trò tài khoản và hồ sơ sang `FACILITIES_MANAGER`, cập nhật chức vụ và tên hiển thị mẫu thành quản lý CSVC. Mật khẩu, ID tài khoản, mã nhân viên, trạng thái hoạt động và lịch sử được giữ nguyên. Tên cá nhân và thông tin liên hệ đã cập nhật được giữ lại. Sau khi đồng bộ, dùng tên đăng nhập mới với mật khẩu đã cấp; nếu đang thử tài khoản cũ bằng ADMIN, bấm **Quay lại ADMIN**, sau đó **Tải lại tài khoản** rồi chọn tài khoản CSVC mới.

Mật khẩu ngẫu nhiên được băm bằng bcrypt và chỉ in ra khi tạo mới. Chạy lại không tạo thêm tài khoản hoặc đổi mật khẩu. Nếu cả tên đăng nhập cũ và mới cùng tồn tại, hoặc hồ sơ/phạm vi tòa không khớp, script dừng để tránh gán nhầm quyền.

Hồ sơ nhân viên dùng tên theo tòa và thông tin mẫu: ngày sinh 01/01/1990, giới tính nam, điện thoại `0000000000`, CCCD `<mã tòa>-CHUA-CAP-NHAT`, email `@example.test`. Cập nhật thông tin nhân viên thực trong trang quản lý tài khoản.
