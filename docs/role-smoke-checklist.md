# Role Smoke Checklist

Checklist này dùng cho lần kiểm tra cuối trước khi merge hoặc deploy nội bộ. Mục tiêu là xác nhận nhanh các happy path quan trọng của ba nhóm tài khoản `Student`, `Moderator`, `Admin` và chặn các lỗi UX/bảo mật dễ lọt.

## Student

### Login và vào hệ thống

- Đăng nhập bằng tài khoản student hợp lệ.
- Kiểm tra dashboard tải được, không bị redirect sai.
- Đăng xuất và đăng nhập lại để xác nhận session ổn định.

### Booking và theo dõi job

- Tạo một booking mới với file hợp lệ.
- Xác nhận job xuất hiện trong lịch sử và trạng thái ban đầu rõ ràng.
- Mở trang chi tiết job và kiểm tra:
  - không còn tab/payment flow gây hiểu nhầm
  - thông tin file, trạng thái, moderator, notes hiển thị đúng
- Với job `Needs Revision`, bấm gửi lại và kiểm tra trạng thái phản hồi rõ ràng.

### Pain points cần nhìn kỹ

- Flow booking hoàn tất có đủ dữ liệu thật, không còn field “ảo”.
- Student hiểu được queue status hiện tại mà không cần hỏi moderator.
- `JobDetail` không hứa hẹn chức năng chưa có.
- Download file job hoạt động đúng quyền.

### Thiết lập và bảo mật

- Vào tab `Thiết lập` và xác nhận wording là bảo mật cá nhân, không mang cảm giác “admin settings”.
- Đổi mật khẩu của chính mình bằng mật khẩu hiện tại.
- Sau khi đổi mật khẩu thành công, hệ thống tự logout.
- Token cũ không còn dùng được, đăng nhập lại chỉ thành công với mật khẩu mới.

### Edge/destructive check

- Thử hủy một job chưa hoàn thành và xác nhận xuất hiện dialog trong app, không dùng browser confirm.
- Sau khi hủy, trạng thái job cập nhật đúng và không còn thao tác sai flow.

## Moderator

### Login và queue triage

- Đăng nhập bằng tài khoản moderator.
- Mở `Hàng đợi duyệt` và xác nhận danh sách job tải được.
- Chọn job, đổi trạng thái bằng quick action và kiểm tra dialog/toast hiển thị đúng.

### Pain points cần nhìn kỹ

- Queue đủ nhanh để tìm job theo tên, mã job, user.
- Flow request revision bắt buộc có ghi chú rõ ràng.
- Quote/update estimated grams lưu được và phản hồi thành công rõ ràng.
- Moderator không nhìn thấy công cụ quản trị hệ thống vượt quyền.

### Thiết lập và bảo mật

- Vào `Thiết lập` và xác nhận chỉ thấy khu vực bảo mật cá nhân.
- Đổi mật khẩu của chính mình.
- Sau khi đổi mật khẩu thành công, phiên hiện tại bị logout và cần đăng nhập lại.
- Moderator không thể đổi mật khẩu cho người khác.

### Edge/destructive check

- Thử reject hoặc cancel một job và xác nhận có dialog xác nhận trong app.
- Kiểm tra moderator không thể thao tác vào job ngoài quyền được backend cho phép.

## Admin

### Login và quản trị hệ thống

- Đăng nhập bằng tài khoản admin.
- Mở các trang `Người dùng`, `Máy in`, `Vật tư`, `Sao lưu`, `Thiết lập`.
- Xác nhận các màn hình tải được, không lỗi quyền và không có placeholder gây hiểu nhầm.

### Pain points cần nhìn kỹ

- Duyệt hoặc khóa user phản hồi bằng toast/dialog đúng ngữ cảnh.
- Đổi mật khẩu cho Admin/Moderator khác hiển thị rõ việc tài khoản đích phải đăng nhập lại.
- Lưu settings hệ thống xong có phản hồi thành công rõ ràng.
- Tạo backup và tải backup hoạt động ổn định.

### Thiết lập và bảo mật

- Trong `Thiết lập`, admin vẫn thấy cả personal security, system settings, managed password tools.
- Đổi mật khẩu của chính admin và xác nhận token cũ bị vô hiệu.
- Reset mật khẩu cho moderator và xác nhận:
  - moderator cũ bị out session
  - admin đang thao tác không bị logout

### Edge/destructive check

- Xóa user bằng dialog trong app, không dùng browser confirm.
- Kiểm tra admin không thể vô tình thao tác lặp gây duplicate backup hoặc inconsistent state.

## Ready To Ship

Chỉ nên coi build là sẵn sàng release khi tất cả điều kiện sau đều đạt:

- `npm run lint` pass sạch
- `npm run test` pass sạch
- `npx tsc --noEmit` pass
- `npm run build` pass
- Role smoke checklist ở trên được chạy xong
- Không còn placeholder user-facing gây hiểu nhầm ở flow chính
- Flow đổi mật khẩu đã được kiểm tra cho Student, Moderator, Admin
- Không còn browser `alert()` hoặc `confirm()` trong các màn hình đã harden
