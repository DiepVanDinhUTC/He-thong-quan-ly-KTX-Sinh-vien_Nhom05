# Thanh toán hóa đơn VNPAY

Sinh viên có thể thanh toán phí hợp đồng lưu trú hoặc hóa đơn tháng qua VNPAY-QR. Mỗi giao dịch lưu mã hóa đơn, mã sinh viên, số tiền, mã giao dịch VNPAY và trạng thái. Backend chỉ kích hoạt hợp đồng/gạch nợ hóa đơn sau khi IPN của VNPAY xác thực chữ ký, mã terminal, số tiền và tham chiếu giao dịch. Biên lai thành công hiển thị trong tab **Biên lai**.

## Cấu hình

Thêm các biến sau vào môi trường backend:

```env
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_TMN_CODE=<terminal code VNPAY cấp>
VNPAY_HASH_SECRET=<secret key VNPAY cấp>
VNPAY_BANK_CODE=VNPAYQR
VNPAY_RETURN_URL=https://<frontend-domain>/bill-payment
```

`VNPAY_BANK_CODE=VNPAYQR` chọn thẳng phương thức QR. Nếu merchant sandbox báo phương thức này không hỗ trợ, đặt `VNPAY_BANK_CODE=` để VNPAY hiển thị các phương thức đang bật cho merchant; sau khi VNPAY bật QR cho website, có thể đặt lại `VNPAYQR`.

Đăng ký IPN tại cấu hình merchant VNPAY trỏ tới endpoint HTTPS công khai:

```text
https://<backend-domain>/api/v1/webhooks/vnpay-ipn
```

VNPAY yêu cầu IPN server-to-server có thể truy cập qua HTTPS. Khai báo URL IPN trong trang merchant VNPAY. Mã QR động VNPAY được hiển thị trên cổng thanh toán sau khi sinh viên mở giao dịch.

## Cập nhật cơ sở dữ liệu

Chạy từ thư mục `backend`:

```powershell
npx prisma db execute --file .\migrations\20261023_vnpay_invoice_payments.sql --schema .\prisma\schema.prisma
npx prisma generate
```

Thay thông tin sandbox bằng thông tin merchant thật trước khi triển khai production.

## Thử thanh toán thành công trên máy local

Để thử bằng thẻ NCB Sandbox khi chưa có IPN HTTPS công khai, chạy thêm bộ chuyển tiếp kết quả Sandbox:

```powershell
npm run vnpay:sandbox-relay
```

Trong `backend/.env`, giữ `VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`, dùng thông tin merchant Sandbox và đặt:

```env
VNPAY_RETURN_URL=http://127.0.0.1:5002/vnpay-return
VNPAY_BANK_CODE=
```

Khởi động lại backend sau khi đổi `.env`. Mặc định bộ chuyển tiếp gọi backend tại `http://localhost:5000` và đưa trình duyệt về `http://localhost:5173/bill-payment`. Có thể đổi các origin local bằng `VNPAY_TEST_BACKEND_URL`, `VNPAY_TEST_FRONTEND_URL` và cổng lắng nghe bằng `VNPAY_TEST_RELAY_PORT`.

1. Đăng nhập tài khoản sinh viên demo, mở **Hóa đơn & thanh toán** và chọn một hóa đơn đang chờ có số tiền từ **5.000 đồng**. Không dùng hóa đơn 1 đồng vì API sẽ từ chối tạo giao dịch.
2. Bấm thanh toán VNPAY, chọn **Thẻ nội địa / tài khoản ngân hàng**, rồi chọn **NCB**.
3. Dùng [thẻ thử VNPAY công bố](https://sandbox.vnpayment.vn/apis/vnpay-demo/): số thẻ `9704198526191432198`, tên `NGUYEN VAN A`, ngày phát hành `07/15`, OTP `123456`.
4. Sau khi VNPAY trả kết quả, bộ chuyển tiếp kiểm tra chữ ký và merchant rồi gửi nguyên kết quả có chữ ký đến bộ xử lý IPN đang có. Backend tiếp tục kiểm tra hóa đơn, số tiền và trạng thái giao dịch trước khi gạch nợ. Trình duyệt được đưa về trang sinh viên để hiển thị **Biên lai**.
5. Với phí hợp đồng, kết quả mong đợi là giao dịch VNPAY `PAID`, hợp đồng `ACTIVE`, một biên lai VNPAY và một khoản thu trong sổ tài chính. Với hóa đơn tháng, hóa đơn chuyển sang `PAID`. Callback lặp không tạo thêm khoản thu.

Bộ chuyển tiếp chỉ lắng nghe trên loopback và từ chối chạy trong `production` hoặc với cổng VNPAY thật. Nó không tự tạo chữ ký, không giả lập xác nhận ngân hàng và không trực tiếp sửa trạng thái hóa đơn. Luồng production vẫn dùng IPN HTTPS do VNPAY gọi trực tiếp như phần cấu hình ở trên.

Chạy kiểm thử riêng cho bộ chuyển tiếp:

```powershell
node --test test/vnpaySandboxRelay.test.js
```
