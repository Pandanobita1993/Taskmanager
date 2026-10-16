# AN AN · Điều hành

Website riêng cho giám đốc và quản lý số liệu, dùng cùng Supabase với ứng dụng nhân viên.

## Vercel

Import cùng repository `Pandanobita1993/Taskmanager`, tạo project mới, chọn Root Directory `management-site`, Framework `Other`, Build Command `npm run build`, Output Directory `dist`. Khai báo `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` giống project nhân viên. Không sử dụng service-role key trong website.

## Thiết lập

1. Chạy toàn bộ `../supabase-management-portal-migration.sql` trong Supabase SQL Editor.
2. Quản trị đăng nhập bằng tên `admin` và mật khẩu quản trị hiện tại. Không cần đưa mật khẩu này cho sếp hoặc quản lý.
3. Cấp tài khoản giám đốc; cấp tài khoản quản lý gắn nhân sự và văn phòng Cần Thơ / Long An. Mật khẩu ít nhất 10 ký tự. Sếp không được cấp / sửa tài khoản. Quản lý chỉ xem dữ liệu văn phòng mình và duyệt yêu cầu không phải do mình gửi.
4. Nhập số dư còn nợ ở ngày bắt đầu, hoặc các khoản phải thu riêng. Không nhập trùng khoản đã bao gồm trong số dư đầu kỳ. Khoản nhân viên báo thu chưa trừ công nợ; chỉ tiền thực nhận được xác nhận mới trừ.
5. Nhân viên dùng mục Công nợ & yêu cầu trên website hiện tại. Yêu cầu có thể gắn link tài liệu HTTPS (Drive, Sheets, PDF hoặc file báo cáo đã chia sẻ). Bản đã duyệt không sửa trực tiếp; yêu cầu bổ sung tạo phiên bản mới khi gửi lại.

## Quyền và lịch sử

Các bảng điều hành mới bật RLS, không cấp quyền đọc/ghi trực tiếp cho anon. RPC quản lý kiểm tra phiên đăng nhập, vai trò và văn phòng. Token ngẫu nhiên 256 bit, chỉ lưu hash ở Supabase, hết hạn sau 8 giờ. Thay quyền / mật khẩu / trạng thái tài khoản thu hồi các phiên cũ. Khoản thu được khóa khi đối soát để chống vượt số dư; các lần xác nhận và hủy giữ lại lịch sử.

Website nhân viên vẫn dùng cơ chế hồ sơ trên thiết bị cho giai đoạn dùng thử theo yêu cầu. API gửi yêu cầu và xem công nợ của nhân viên dựa trên hồ sơ đó; đây chưa phải danh tính được xác thực. Khi kết thúc dùng thử cần chuyển phần nhân viên sang xác thực riêng và siết các quyền legacy. Website điều hành không cung cấp trường mật khẩu của khách hàng.

## Kiểm tra

`npm run build`, `npm test`.
