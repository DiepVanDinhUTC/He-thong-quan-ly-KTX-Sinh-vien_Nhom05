# Chạy frontend cùng backend

## 1. Cấu hình backend

Tại thư mục `backend`, sao chép `.env.example` thành `.env` và điền thông tin SQL Server vào `DATABASE_URL`. Đặt `JWT_SECRET` thành chuỗi bí mật riêng của máy.

```powershell
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Backend chạy ở `http://localhost:5000`; kiểm tra kết nối tại `http://localhost:5000/api/health`.

Nếu cần dữ liệu mẫu, chạy `node seed.js` trong thư mục `backend`. Lệnh này xóa dữ liệu nghiệp vụ hiện tại trước khi tạo dữ liệu demo. Tài khoản mẫu có mật khẩu `123456`: sinh viên `231230743`, quản lý `admin.manager`.

Để tạo dữ liệu kiểm thử mà không xóa dữ liệu đang có, chạy `npm run seed:test-data`. Lệnh này upsert 10 bản ghi có tiền tố `T10` vào các bảng Sinh viên, Nhân viên, Phòng, Đăng ký KTX, Hợp đồng và Hóa đơn; tạo 20 tài khoản riêng để liên kết 10 hồ sơ sinh viên và 10 hồ sơ nhân viên. Tài khoản Ban quản lý: `test10_nv01`, mật khẩu `Test@12345`. Tài khoản sinh viên: `test10_sv01`, mật khẩu `Test@12345`.

## 2. Cấu hình frontend

Mở terminal khác tại thư mục `frontend`, sao chép `.env.example` thành `.env`, giữ `VITE_API_URL=http://localhost:5000/api/v1`, sau đó:

```powershell
cd frontend
npm install
npm run dev
```

Mở URL Vite hiển thị trong terminal (mặc định `http://localhost:5173`). Axios tự gửi JWT trong `Authorization: Bearer ...` sau khi đăng nhập.

API sinh viên yêu cầu tài khoản MANAGER hoặc DIRECTOR. Các trang chưa có API tương ứng vẫn đang hiển thị dữ liệu mẫu.

## 3. Đăng ký nội trú và hợp đồng

Sinh viên đăng nhập có thể gửi nguyện vọng phòng `QUAT` hoặc `DIEU_HOA` từ trang Đăng ký nội trú. Đơn được lưu ở trạng thái `PENDING`; Ban quản lý xác nhận bằng cách chọn phòng còn chỗ, thời hạn và tổng tiền. Backend kiểm tra loại phòng, sức chứa và hợp đồng hiện có trong một giao dịch, sau đó đổi đơn thành `APPROVED` và tạo hợp đồng `PENDING_PAYMENT`. Ban quản lý có thể chỉnh sửa phòng, thời hạn và số tiền của hợp đồng nháp. Cổng sinh viên hiển thị hồ sơ, đơn đăng ký và hợp đồng của tài khoản đang đăng nhập.

## 4. Sơ đồ phòng và CSVC

Trang `/rooms` tải số phòng, loại phòng và `soSinhVienHienTai / soSinhVienToiDa` từ bảng `Phong`. Trạng thái CSVC được tổng hợp từ bảng `THIET_BI_PHONG` (Tốt, Hư hỏng, Đang bảo trì); bảng này được tạo cùng schema. Dữ liệu CSVC chưa có sẽ hiển thị là “Chưa có dữ liệu” cho đến khi cán bộ ghi nhận thiết bị trong màn hình phòng.
