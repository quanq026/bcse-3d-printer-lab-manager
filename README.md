# BCSE 3D Printer Lab Manager

Hệ thống quản lý đặt lịch in 3D cho phòng lab BCSE (VJU), gồm frontend React + backend Express + SQLite.

## Mục tiêu

- Sinh viên đặt job in 3D online, không phải nhắn tay qua Zalo/email.
- Quản lý tồn kho filament, bảng giá và tính phí tự động.
- Lưu lịch sử hoạt động và hỗ trợ sao lưu dữ liệu.

## Tính năng chính

- Quản lý máy in, tồn kho filament, pricing/service fee.
- Upload file in (`.stl`, `.3mf`, `.gcode`) và có preview 3D.
- Dashboard cho moderator/admin duyệt và theo dõi job.
## Tech Stack

- Frontend: React 19, TypeScript, Vite, Tailwind, Three.js
- Backend: Express, TypeScript (`tsx`), Zod, JWT, multer
- Database: SQLite (`better-sqlite3`, WAL)
- Logging: Winston

## Chạy local nhanh

### 1. Cài dependency

```bash
npm install
```

### 2. Tạo file môi trường

```bash
cp .env.example .env
```

Trên Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

### 3. Chạy backend

```bash
npm run dev:server
```
 
Backend mặc định chạy ở `http://localhost:3000`.
 
### 4. Chạy frontend (terminal khác)

```bash
npm run dev
```

Frontend mặc định chạy ở `http://localhost:5173`.

## Biến môi trường

Xem mẫu đầy đủ trong `.env.example`.

Biến quan trọng:

- `PORT`: cổng backend (mặc định `3000`)
- `JWT_SECRET`: bắt buộc đổi khi production
- `NODE_ENV`: `development` hoặc `production`
- `ALLOWED_ORIGINS`: danh sách origin cho CORS
- `DATA_DIR`: thư mục dữ liệu runtime (mặc định `./data`)
- `LOG_LEVEL`: `error | warn | info | debug`
- `SEED_ADMIN_PASSWORD` / `SEED_MOD_PASSWORD`: dùng để tạo tài khoản admin/mod khi DB còn rỗng
- `SYNC_SEED_PASSWORDS=true`: đồng bộ lại mật khẩu admin/mod từ `.env` cho DB đã tồn tại trong lúc khởi động

## Đổi mật khẩu admin/mod bằng `.env`

Hiện tại hệ thống quản lý 2 tài khoản mặc định theo email:

- `admin@vju.ac.vn`
- `mod@vju.ac.vn`

Nếu bạn chỉ sửa `SEED_ADMIN_PASSWORD` hoặc `SEED_MOD_PASSWORD`, thay đổi đó chỉ áp dụng khi bảng `users` đang rỗng.

Để ép hệ thống cập nhật mật khẩu cho DB đang dùng:

1. Sửa `SEED_ADMIN_PASSWORD` và/hoặc `SEED_MOD_PASSWORD` trong `.env`
2. Thêm `SYNC_SEED_PASSWORDS=true`
3. Khởi động lại backend một lần
4. Đăng nhập bằng mật khẩu mới
5. Xóa hoặc tắt `SYNC_SEED_PASSWORDS` sau khi đổi xong để tránh reset lại ở các lần restart sau
## License

MIT
