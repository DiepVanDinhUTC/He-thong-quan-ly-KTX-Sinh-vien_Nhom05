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
