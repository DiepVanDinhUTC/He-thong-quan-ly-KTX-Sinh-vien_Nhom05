# Hệ Thống Quản Lý Ký Túc Xá Sinh Viên - Nhóm 05

Dự án phát triển Hệ thống Quản lý Ký túc xá tích hợp Fullstack, bao gồm Backend (Node.js), Frontend (React.js) và cơ sở dữ liệu PostgreSQL trên Supabase.

---

## 🛠 Công nghệ sử dụng
- **Frontend:** React.js
- **Backend:** Node.js
- **Database:** PostgreSQL trên Supabase, truy cập qua Prisma
- **Code Quality:** ESLint, Husky, Lint-staged

---

## 🚀 Hướng dẫn cài đặt cho thành viên nhóm

Sau khi clone dự án về máy, mỗi thành viên cần thực hiện các bước sau để thiết lập môi trường làm việc:

### 1. Tải các gói thư viện (Dependencies)
Do dự án sử dụng các gói cấu hình phiên bản mới, bắt buộc phải dùng cờ `--legacy-peer-deps` để tránh lỗi xung đột phiên bản khi cài đặt:
```bash
npm install --legacy-peer-deps
```
(Lệnh này cũng sẽ tự động kích hoạt cấu hình Husky trên máy của bạn).

2. Thiết lập Biến môi trường (.env)
Tuyệt đối KHÔNG push file .env chứa thông tin thật lên GitHub.

Tạo `backend/.env` với thông tin kết nối lấy từ Supabase. Ví dụ dưới đây chỉ chứa giá trị mẫu; thay host, project ref và mật khẩu bằng thông tin của dự án:

```dotenv
PORT=5000
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@POOLER_HOST:5432/postgres?sslmode=require"
JWT_SECRET="thay-bang-chuoi-bi-mat-cua-ban"
JWT_EXPIRES_IN="7d"
```

`DATABASE_URL` dùng transaction pooler khi backend chạy; `DIRECT_URL` dùng session pooler khi Prisma đồng bộ hoặc đọc cấu trúc bảng. Hai URL phải trỏ tới cùng một database. Mật khẩu có ký tự đặc biệt phải được URL-encode.

Tham khảo [hướng dẫn kết nối Prisma của Supabase](https://supabase.com/docs/guides/database/prisma) để lấy đúng host và cổng cho dự án. Dự án này dùng Prisma 5, cấu hình datasource nằm trong `backend/prisma/schema.prisma`.

Trong `frontend/.env`, đặt `VITE_API_URL=/api/v1` để gọi backend qua proxy của Vite.

Sau khi cài thư viện hoặc sửa schema, chạy tại thư mục gốc:

```bash
npm --prefix backend run db:validate
npm --prefix backend run db:generate
```

Với database dành riêng cho dự án và chưa có bảng KTX, chạy `npm --prefix backend run db:push` để tạo cấu trúc từ schema. Kiểm tra các thay đổi Prisma đề xuất trước khi áp dụng lên database có dữ liệu.

Với database KTX đang có dữ liệu, chạy `npm --prefix backend run db:repair` để bổ sung các cột `trangThaiNoiTru`, `role` còn thiếu và hai bảng y tế. Script `backend/prisma/sql/align-existing-database.sql` giữ các bảng và bản ghi hiện có; vai trò được lấy từ `USER_ACCOUNT` nếu có, trạng thái lưu trú dựa trên hợp đồng `ACTIVE`. Chạy lại script sẽ giữ nguyên các giá trị đã có. Các bảng y tế bật Row Level Security và được truy cập qua backend.

Đăng nhập bằng tài khoản database tra cứu `username` trong `USER_ACCOUNT`, chỉ chấp nhận tài khoản `isActive` và so khớp `password` đã băm bcrypt. Tài khoản có thể liên kết một-một tới sinh viên hoặc nhân viên qua `userId`; quyền truy cập lấy từ `USER_ACCOUNT.role`.

🛡 Quy chuẩn Code (Code Quality & Git Hooks)
Dự án áp dụng ESLint để thống nhất phong cách code và Husky + Lint-staged để tự động chặn các commit chứa code lỗi.

Các lệnh kiểm tra thủ công (Scripts)
npm run lint: Chạy quét lỗi trên toàn bộ dự án.

npm run lint:fix: Tự động sửa các lỗi cơ bản (khoảng trắng, dấu phẩy,...).

Quy trình Pre-commit (Husky)
Mỗi khi bạn chạy lệnh git commit, hệ thống sẽ tự động quét các file vừa chỉnh sửa:

Nếu code chuẩn: Commit thành công.

Nếu code có lỗi nhẹ: Tự động sửa (--fix) và commit.

Nếu code có lỗi nặng (sai logic, biến chưa dùng): Commit sẽ bị CHẶN báo lỗi đỏ.

Cách xử lý khi bị chặn Commit:

Đọc log lỗi trên Terminal, mở file tương ứng trên VS Code để sửa.

Chạy lại lệnh git add . để đưa các file vừa sửa vào staging.

Chạy lại lệnh git commit -m "...".

⚠️ Lưu ý khẩn cấp (WIP):
Chỉ trong trường hợp cần lưu nháp code lỗi lên một nhánh cá nhân riêng, bạn mới được phép vượt rào hệ thống kiểm tra bằng cách thêm cờ --no-verify:

Bash
git commit -m "wip: lưu code dở dang" --no-verify
🔀 Quy trình làm việc với Git & Duyệt Code (Code Review)
Tuyệt đối KHÔNG push code trực tiếp lên nhánh main. Mọi tính năng mới đều phải được code trên nhánh riêng và tạo Pull Request (PR) để Leader kiểm tra trước khi gộp vào dự án.

Bước 1: Cập nhật code mới nhất từ nhánh chung
Trước khi bắt đầu code tính năng mới, luôn đảm bảo máy bạn đang ở nhánh main và có code mới nhất:

Bash
git checkout main
git pull origin main
Bước 2: Tạo nhánh làm việc riêng
Tạo nhánh mới theo cú pháp feature/tên-tính-năng hoặc fix/tên-lỗi:

Bash
git checkout -b feature/login-page
Bước 3: Code và Push lên nhánh của bạn
Sau khi hoàn thiện tính năng, hãy commit (Husky sẽ tự động kiểm tra lỗi) và push nhánh này lên GitHub:

Bash
git add .
git commit -m "feat: hoàn thiện giao diện đăng nhập"
git push -u origin feature/login-page
Bước 4: Tạo Pull Request để Leader duyệt (Code Review)

Lên trang GitHub của dự án, bạn sẽ thấy thông báo màu vàng gợi ý Compare & pull request với nhánh bạn vừa push. Bấm vào nút đó.

Viết mô tả ngắn gọn về những gì bạn đã làm trong PR này.

Bấm Create pull request.

Tag Leader hoặc người có trách nhiệm review code.

Leader sẽ đọc code, nếu có yêu cầu chỉnh sửa (Request Changes) thì bạn sửa ở máy, commit và push lại. Nếu code chuẩn, Leader sẽ bấm Merge pull request để gộp vào nhánh main.

📦 Cài đặt thư viện mới trong quá trình Code
Bất cứ khi nào bạn cần cài thêm một thư viện mới cho dự án (ví dụ axios, react-router-dom,...), hãy nhớ luôn thêm đuôi --legacy-peer-deps:

```bash
npm install ten_thu_vien --legacy-peer-deps
```

## Chạy và build project

Chạy `npm install --legacy-peer-deps` tại thư mục gốc và `npm --prefix backend install --legacy-peer-deps` để cài thư viện cho cả frontend và backend.

- `npm run dev`: chạy cả backend và frontend.
- `npm run lint`: kiểm tra mã frontend và các file cấu hình/script ở thư mục gốc.
- `npm run build`: build frontend vào `frontend/dist`.

`frontend/dist` và các thư mục cache trong `node_modules` là dữ liệu sinh tự động, có thể xóa và tạo lại. Giữ hai file `package-lock.json` để cố định phiên bản thư viện, cùng các file `.env` cục bộ để chạy ứng dụng.
