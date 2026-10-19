# Ghi chỉ số điện nước cho CSVC

API chỉ trả về các phòng thuộc tòa nhà được gán cho tài khoản trong `USER_BUILDING_ACCESS`. Bảng lưu chỉ số cần được tạo trước khi trang tải được sổ ghi.

Chạy từ thư mục `backend` để áp dụng migration và cập nhật Prisma Client:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Sau đó khởi động lại backend. Nếu tài khoản vẫn không thấy phòng, kiểm tra tài khoản có bản ghi phân công tòa nhà trong `USER_BUILDING_ACCESS` và tòa nhà đó có phòng trong `Phong`.
