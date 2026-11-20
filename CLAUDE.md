# CLAUDE.md (Cloudy Task)

Cloudy Task là app desktop gom Note (tờ giấy dán màn hình), Reminder, Project, Task, Habit tracker, Report và Lịch, kèm màn My day. Nó xuất phát từ `note-task-personal`. Đọc `SPEC-cloudy.md` trước (phần khác biệt), rồi `SPEC-personal.md` (phần nền, vẫn đúng nếu `SPEC-cloudy.md` không nhắc). Khi hai file mâu thuẫn, `SPEC-cloudy.md` thắng. Nếu spec thiếu hoặc mâu thuẫn, hỏi tôi thay vì tự đoán.

## Công nghệ đã chốt (không tự đổi)

- App desktop: Electron, React, TypeScript, Vite. Build .exe cho Windows là chính; .dmg chỉ cho máy Mac của chủ dự án (không ký, không tự cập nhật).
- Không có server, không có tên miền. Dữ liệu nằm ở SQLite trên máy và đồng bộ lên thư mục ẩn `appDataFolder` trên Google Drive của chính từng người dùng. Dữ liệu Habit chỉ ở máy, không đồng bộ.
- Đăng nhập Google (OAuth cho ứng dụng cài trên máy, PKCE, trình duyệt hệ thống). Token lưu bằng kho khóa của hệ điều hành. Chưa đăng nhập vẫn dùng được, chỉ lưu local.
- Lịch: Google Calendar API gọi trực tiếp, chỉ để kéo meeting về xem. Task chỉ hiện trong lịch của app, không ghi lên Google.
- Nhắc việc chạy bằng app trên máy (chạy nền ở khay). Không có email hay thông báo đẩy từ server.
- Dùng project Google Cloud và OAuth client riêng của Cloudy Task, không dùng chung với `note-task-personal` (hai app dùng chung client sẽ đè lên thư mục `appDataFolder` của nhau).

## Nguyên tắc làm việc

- Làm theo lộ trình trong `SPEC-cloudy.md`. Xong từng giai đoạn thì dừng để tôi chạy thử.
- Tách gói dữ liệu và đồng bộ (mô hình note, reminder, project, task, định dạng file trên Drive, logic xung đột) khỏi giao diện và Electron (`src/core`). Lưu trữ đi qua lớp trung gian. Định dạng file trên Drive có số phiên bản.
- Phần chỉ có desktop tách riêng khỏi giao diện dùng chung.
- Tiếng Việt cho giao diện. Font Be Vietnam Pro, Lora, Patrick Hand, Roboto Mono, đóng gói sẵn. Kiểm tra hiển thị câu nhiều dấu chồng (ví dụ "Nguyễn Thị Quyền chuyển về Việt Nam").
- Giao diện: nền màu trơn, pastel, dùng biến CSS cho màu. Màu giấy của note độc lập với màu nền app.
- Không thêm tính năng ngoài spec (giao task cho người khác, bản web, chia sẻ note, Kanban, chat, soạn tài liệu kiểu Notion). Muốn thêm thì hỏi trước.
- Test phải độc lập múi giờ (CI chạy UTC). Chạy test: `npm test`.
- Trước khi coi một việc là xong, chạy thử thực tế (mở app, thao tác), không chỉ build.
- Không bao giờ commit khóa bí mật (client secret, token). Dùng `.env`, đã nằm trong `.gitignore`.
- Shell là PowerShell 5.1: dùng `;` thay `&&`. Khi test tự động, chạy Electron với `--user-data-dir` riêng để không đụng dữ liệu thật.

## Những chỗ còn mở

Xem mục "Còn cần chốt" cuối `SPEC-cloudy.md`.
