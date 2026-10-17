# TaskFlow

Ứng dụng nội bộ quản lý công việc, hồ sơ và báo cáo cho doanh nghiệp dịch vụ kế toán.

## Chức năng chính

- Tiếp nhận và theo dõi công việc theo khách hàng, nghiệp vụ và nhân viên.
- Quản lý hồ sơ cần kiểm tra, mã hồ sơ, tiến độ và bằng chứng hoàn thành.
- Cho phép bổ sung nội dung công việc và lưu nhật ký từng lần cập nhật.
- Quản lý khách hàng, nhân sự và phân công nghiệp vụ.
- Gán nhân sự theo văn phòng Cần Thơ / Long An, lọc danh sách và xuất báo cáo đúng văn phòng.
- Xuất báo cáo Excel cá nhân và báo cáo quản lý.
- Tạo công việc định kỳ cho nhiều khách hàng theo lịch ngày / tuần / tháng.
- Thiết lập hồ sơ nhân viên trực tiếp trên từng thiết bị, không cần đăng nhập email.
- Khu vực quản trị được khóa bằng mật khẩu kiểm tra ở Supabase.

## Chạy tại máy

1. Sao chép `.env.example` thành `.env` và điền cấu hình Supabase.
2. Chạy `npm install`.
3. Chạy `npm run dev`.

## Triển khai

1. Nếu dự án đã áp dụng cơ chế đăng nhập trước đây, chạy `supabase-no-login-migration.sql` trong Supabase SQL Editor để khôi phục chế độ hồ sơ theo thiết bị.
2. Chạy `supabase-task-update-log-migration.sql` để bật chỉnh sửa công việc và nhật ký cập nhật.
   Chạy thêm `supabase-offices-migration.sql` để bổ sung văn phòng nhân sự. Nhân sự hiện có mặc định thuộc Cần Thơ; chọn Long An khi thêm nhân sự mới trong Quản lý → Nhân sự.
3. Khai báo `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trên Vercel.
4. Chạy `npm run build` hoặc kết nối repository với Vercel.

Khi mở ứng dụng lần đầu trên một thiết bị, người dùng chọn tên nhân viên để hoàn tất thiết lập. Mật khẩu quản trị chỉ được kiểm tra qua hàm Supabase và không nằm trong mã nguồn giao diện.

## Website điều hành riêng

Mã nguồn trong `management-site/`, triển khai thành project Vercel riêng. Chạy `supabase-management-portal-migration.sql` để bật công nợ khách hàng, xác nhận thực nhận tiền và luồng xét duyệt số liệu. Website nhân viên có thêm mục Công nợ & yêu cầu để gửi yêu cầu và xem phản hồi. Xem `management-site/README.md` để thiết lập tài khoản sếp / quản lý.

## Công việc định kỳ

Chạy toàn bộ `supabase-recurring-tasks-migration.sql` trong Supabase SQL Editor (role postgres). Kết quả cuối cần có job `anan-recurring-tasks` với `active = true`. File có thể chạy lại; chỉ cập nhật job có tên này và giữ các lịch / công việc đã tạo.

Nhân viên vào **Công việc định kỳ → Tạo lịch định kỳ**, chọn khách, nghiệp vụ, nội dung, lịch lặp và ngày bắt đầu. Mỗi khách có lịch riêng. Các biến `{{thang}}`, `{{nam}}`, `{{ngay}}` lấy theo ngày của kỳ. Ngày 29–31 được chuyển về cuối tháng nếu tháng ngắn hơn. Tạo nhắc đóng phí là tạo việc `normal` ở trạng thái `received`, không ghi nhận tiền hay giảm công nợ.

Supabase Cron kiểm tra mỗi 5 phút, theo ngày Việt Nam. Dashboard cũng kiểm tra lịch khi mở, khi quay lại tab và mỗi phút nếu đang hiển thị. Lịch bỏ lỡ do dịch vụ gián đoạn được tạo bù tối đa 100 kỳ mỗi lịch mỗi lần chạy; lịch tạm dừng thì bỏ qua thời gian tạm dừng khi bật lại. Bảng occurrence và khóa hàng chống trùng, kể cả khi việc cũ đã hoàn thành hoặc bị xóa. Sửa lịch chỉ thay đổi những việc được tạo sau này.

Kiểm tra logic SQL bằng PostgreSQL WASM độc lập, không ghi vào Supabase thật:

```powershell
npm install --prefix "$env:TEMP/anan-recurrence-qa" --no-audit --no-fund @electric-sql/pglite
npm run test:recurring
npm run test:debt-report
npm run build
```
