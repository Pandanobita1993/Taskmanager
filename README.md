# TaskFlow

Ứng dụng nội bộ quản lý công việc, hồ sơ và báo cáo cho doanh nghiệp dịch vụ kế toán.

## Chức năng chính

- Tiếp nhận và theo dõi công việc theo khách hàng, nghiệp vụ và nhân viên.
- Quản lý hồ sơ cần kiểm tra, mã hồ sơ, tiến độ và bằng chứng hoàn thành.
- Quản lý khách hàng, nhân sự và phân công nghiệp vụ.
- Xuất báo cáo Excel cá nhân và báo cáo quản lý.
- Xác thực bằng Supabase Auth, phân quyền bằng Row Level Security.

## Chạy tại máy

1. Sao chép `.env.example` thành `.env` và điền cấu hình Supabase.
2. Chạy `npm install`.
3. Chạy `npm run dev`.

## Triển khai

1. Áp dụng `supabase-security-migration.sql` trong Supabase SQL Editor.
2. Bật Email authentication trong Supabase Auth.
3. Khai báo `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` trên Vercel.
4. Chạy `npm run build` hoặc kết nối repository với Vercel.

Tài khoản đăng ký phải dùng họ tên trùng với một nhân sự hiện có. Tài khoản hợp lệ đầu tiên sau khi migration được áp dụng sẽ nhận quyền quản trị để hoàn tất thiết lập ban đầu.
