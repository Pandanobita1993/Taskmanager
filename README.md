# TaskFlow

Ứng dụng nội bộ quản lý công việc, hồ sơ và báo cáo cho doanh nghiệp dịch vụ kế toán.

## Chức năng chính

- Tiếp nhận và theo dõi công việc theo khách hàng, nghiệp vụ và nhân viên.
- Quản lý hồ sơ cần kiểm tra, mã hồ sơ, tiến độ và bằng chứng hoàn thành.
- Cho phép bổ sung nội dung công việc và lưu nhật ký từng lần cập nhật.
- Quản lý khách hàng, nhân sự và phân công nghiệp vụ.
- Gán nhân sự theo văn phòng Cần Thơ / Long An, lọc danh sách và xuất báo cáo đúng văn phòng.
- Xuất báo cáo Excel cá nhân và báo cáo quản lý.
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
