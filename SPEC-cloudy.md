# Spec Cloudy Task (phần khác so với bản cá nhân)

Cập nhật: 2026-11-19

Cloudy Task xuất phát từ `note-task-personal`. **`SPEC-personal.md` vẫn đúng cho mọi phần không được nhắc ở đây** (Note, vẽ, sticky, khay, theme, đồng bộ Drive, tìm kiếm, thông báo, My day, xuất/nhập). Khi hai file mâu thuẫn, `SPEC-cloudy.md` thắng.

## Khác biệt về định hướng

- Thêm **Project**, **Task** (có task con, trạng thái), **Report** và **Habit tracker**. Reminder cũ giữ lại cho việc nhắc đơn giản.
- Task có ngày bắt đầu và kết thúc, nên hiện trên lịch trong app như thanh sự kiện (tham khảo ảnh lịch tháng dạng Apple Calendar: thanh dài nhiều ngày, chấm màu theo project).
- Mỗi người dùng Google Drive của chính họ. Hiện tại dùng cho 1 người, tối đa khoảng 5 người. Phát hành bằng file `.exe` (Windows) là chính; `.dmg` chỉ cho máy của chủ dự án, không ký, không mua Apple Developer, không có tự cập nhật trên Mac.
- Project Google Cloud **mới**, tên app "Cloudy Task", OAuth client riêng. Chuyển sang "In production" để token không hết hạn sau 7 ngày; người dùng sẽ thấy cảnh báo "chưa xác minh" (chấp nhận, dưới 100 người). Calendar là kết nối tùy chọn.
- Task chỉ hiện trong lịch của app, **không ghi lên Google Calendar**. Lịch Google vẫn được kéo về để xem meeting.

## Giao diện (khác bản cũ)

- Tông mặc định là **xanh dương** (không còn tông tím). Năm tông gợi ý: Xanh dương (mặc định), Tím, Xanh lơ, Bạc hà, Hồng đào. Màu chữ và màu phụ cũng ngả xanh, không còn ngả tím.
- Avatar mặc định là cô gái tóc xoăn đất sét đeo kính (áo len vàng), nền trắng be `#faf6ee`. Thẻ động viên ở My day đổi theo tông: tông Tím và Hồng đào dùng thẻ con mèo (tím), các tông còn lại dùng thẻ đám mây (xanh).
- Icon app (`build/icon.png`, `resources/*.png`) vẫn là bản tím của app cũ, chờ icon mới.

## Project

| Trường | Mô tả |
| --- | --- |
| Tên | Bắt buộc |
| Màu | Dùng cho chấm màu, thanh trên lịch, biểu đồ |
| Mô tả | Văn bản |
| Trạng thái | Đang chạy hoặc đã đóng (project đóng ẩn khỏi danh sách chọn khi tạo task, task cũ giữ nguyên) |

Màn chi tiết project: thông tin, danh sách task theo trạng thái, số task từng trạng thái.

## Task

| Trường | Mô tả |
| --- | --- |
| Tiêu đề | Bắt buộc |
| Mô tả | Văn bản tùy chọn |
| Project | Chọn từ danh sách, **được để trống** |
| Ngày bắt đầu | Tùy chọn |
| Ngày kết thúc (deadline) | Tùy chọn. Task không có ngày thì không hiện trên lịch |
| Nhắc hàng ngày | Tùy chọn, nhắc mỗi ngày trong khoảng từ ngày bắt đầu đến deadline |
| Nhắc trước deadline | Nhắc trước n ngày (người dùng chọn số ngày) |
| Trạng thái | Pending, In progress, Done, Re-do |
| Task cha | Task con thuộc một task lớn |

Trạng thái:

- **Pending:** chưa làm. **In progress:** đang làm. **Done:** xong. **Re-do:** bị yêu cầu sửa hoặc làm lại.
- Task Done thì gạch chữ, rồi chuyển sang **Archived** (cách thức chuyển: lúc đánh dấu Done, task gạch ngay và nằm ở nhóm Archived; mở lại được, đổi về trạng thái khác thì ra khỏi Archived).
- Task Re-do tính là chưa xong, hiện nổi bật trong My day.

Task con:

- Task lớn có danh sách task con, xổ ra thu vào được ngay tại dòng task lớn (hiện tiến độ x/y).
- Task con có trạng thái riêng. Một cấp con là đủ (task con không có con).
- Task lớn đánh dấu Done khi tất cả task con Done là gợi ý, không tự động ép; người dùng quyết định.

Tự xóa Archived:

- Mặc định xóa task Archived sau **24 tháng** kể từ lúc archive. Chỉnh được trong Setting (có tùy chọn không bao giờ xóa).
- Report tối đa nhìn 1 năm, nên 24 tháng luôn đủ dữ liệu cho mọi kỳ báo cáo. Nếu người dùng chỉnh thời hạn xóa ngắn hơn kỳ báo cáo thì app cảnh báo ở Setting rằng Report kỳ dài sẽ thiếu dữ liệu.
- Task xóa tự động đi qua thùng rác 30 ngày như các mục khác, và việc xóa lan sang Drive như quy ước cũ.

Đồng bộ Drive: Project và Task đồng bộ giống note và reminder (mỗi mục một file JSON có số phiên bản định dạng, bản sửa sau cùng thắng).

## Report

- Chọn kỳ: từng tháng, cụm 3 tháng, cụm 6 tháng, 1 năm (có mũi tên chuyển kỳ trước, sau).
- Biểu đồ tròn: tỷ lệ task theo project (gồm nhóm "Không có project").
- Biểu đồ cột: số task theo trạng thái (Done, In progress, Pending, Re-do).
- Danh sách task của kỳ nằm dưới biểu đồ. Bấm một phần biểu đồ thì lọc danh sách tương ứng.
- Task thuộc kỳ nào: tính theo ngày kết thúc nếu có, không thì theo ngày tạo (cần ghi chú rõ trên giao diện).
- Báo cáo Habit là phần riêng (xem dưới).

## Habit tracker

- Là một dạng reminder lặp: người dùng đặt tên habit, chọn các ngày trong tuần và **một hoặc nhiều khung giờ** trong ngày.
- Đến giờ, app hiện popup nổi (như sticky nhắc). Người dùng tick **Đã làm** hoặc **Bỏ qua**. Không phản hồi thì tính là chưa làm (hiện là "lỡ" khi mở lại app, theo quy ước thông báo cũ).
- Report habit theo tuần và tháng: tỷ lệ hoàn thành từng habit, chuỗi ngày liên tiếp (streak), biểu đồ cột theo ngày.
- **Dữ liệu habit chỉ lưu trên máy, không đồng bộ Drive**, tự xóa sau **3 tháng** (chỉnh được trong Setting). Hệ quả: report habit chỉ nhìn lại tối đa 3 tháng, đổi máy hoặc cài lại thì mất lịch sử. Định nghĩa habit (tên, ngày, giờ) cũng chỉ ở máy.
- Habit không hiện trên lịch.

## Note và Reminder

- Note giữ nguyên là note. Muốn nhắc thì bấm nút Remind (đã có), không đổi.
- Reminder giữ như `SPEC-personal.md`.

## Lịch

- Lịch trong app hiện: sự kiện Google (nếu kết nối), reminder có giờ, task có ngày. Task nhiều ngày vẽ thành thanh dài, chấm màu theo project, task đã Done mờ đi.
- Bỏ chế độ iCal khỏi giao diện (đã ẩn ở bản cũ). Không ghi task lên Google.
- Với Gmail cá nhân: kết nối Calendar bằng OAuth bình thường, thêm mail vào Test users cho tới khi chuyển In production.

## Sao lưu Google Sheet (tùy chọn)

- Ngoài đồng bộ Drive, có nút xuất một chiều: Project, Task, Report ra một Google Sheet riêng của người dùng (quyền `drive.file`, file do app tạo). Chỉ để xem và lọc, không dùng để khôi phục.
- Ảnh, nét vẽ, file đính kèm không nằm trong Sheet. Ô dài quá 50.000 ký tự bị cắt.

## Lộ trình

Làm theo thứ tự, xong từng giai đoạn thì dừng để chạy thử:

1. Dọn dự án: đổi tên, repo GitHub mới, OAuth client mới trong project Google Cloud mới, kiểm tra build và test vẫn đạt.
2. Project và Task: mô hình dữ liệu trong `src/core`, màn Project, màn Task (trạng thái, task con xổ ra, nhắc), Archived và tự xóa, đồng bộ Drive cho hai loại mới, nhập/xuất JSON gồm Project và Task.
3. Report task: kỳ, biểu đồ tròn, biểu đồ cột, danh sách bên dưới.
4. Lịch có task, My day có task (quá hạn, Re-do, hôm nay).
5. Habit tracker và report habit.
6. Xuất Google Sheet, hoàn thiện, phát hành `.exe` (và `.dmg` cho máy chủ).

## Còn cần chốt

- Tên repo GitHub (đang để `lyhala/cloudy-task` trong `package.json`, repo chưa tạo).
- Task thuộc kỳ Report nào khi chưa có ngày kết thúc: đang chọn theo ngày tạo, chưa xác nhận.
- Icon và mascot riêng cho Cloudy Task (hiện đang dùng của bản cũ).
