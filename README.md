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
## License

MIT
