# Sổ BHXH theo mã đơn vị

Chạy **toàn bộ** `supabase-bhxh-units-migration.sql` trong SQL Editor của cùng dự án Supabase đang chạy website, sau bản `supabase-bhxh-agencies-migration.sql`. Chỉ phát hành giao diện này sau khi migration thành công. Không chạy lại các migration cũ lên cấu trúc mới.

## Sử dụng

- Tab **Mã đơn vị**: mỗi khách tối đa 3 mã đang dùng, mỗi nhóm một mã: người lao động, đại diện pháp luật, người nước ngoài. Mã cũ ở **Chờ phân loại** vẫn tính là một mã; phân loại mã đó trước khi cần thêm đủ ba nhóm.
- Nhân viên phụ trách BHXH của khách cập nhật mã. Mọi nhân viên đang hoạt động xem được danh sách và theo dõi tiền của khách sử dụng dịch vụ BHXH, như phạm vi BHXH dùng chung hiện có.
- Khi có nhiều mã, chọn mã cụ thể tại C12, ghi tiền nộp, nhắc khách và thiết lập tài khoản nhận mặc định. Không tự coi mã cũ là mã người lao động.
- Mỗi mã có chuỗi số dư riêng. Đầu kỳ lấy cuối tháng liền trước của cùng mã; thiếu dữ liệu vẫn là “Thiếu thông tin”. Tiền nộp cộng theo tháng **thực nộp** của cùng mã, bao gồm nộp bù.
- Bảng khách tổng hợp phát sinh và tiền nộp từ các mã; tổng còn phải đóng cộng các dư nợ dương, không tự bù tiền thừa của mã này sang mã khác. Dòng từng mã giữ số dư có dấu.
- Lời nhắc lấy phát sinh của kỳ/mã đã chọn; ghi tiền nộp gợi ý số còn phải đóng của kỳ/mã đó. Số tiền được sửa trước khi lưu; ghi tiền nộp vẫn cần ảnh bằng chứng.
- Cú pháp gửi khách và QR dùng mã đang chọn cùng tài khoản nhận được chọn. Mỗi mã có thể có tài khoản/cơ sở mặc định khác nhau. Lời nhắc đã lưu giữ nguyên thông tin người nhận tại thời điểm lưu.
- Đọc C12 đối chiếu mã trên file với các mã của khách. Nếu cùng số mã xuất hiện ở cả mã cũ ngừng dùng và mã đang dùng, chọn rõ mã cần đối chiếu; app không đoán sổ đích.

## Giữ dữ liệu cũ

Migration gắn C12, tiền nộp, lời nhắc BHXH và mặc định nhận tiền cũ với một định danh mã cũ chờ phân loại của khách. Không đổi số tiền, kỳ, ngày nộp, trạng thái, phiên bản, ảnh, nội dung chuyển khoản đã lưu hoặc nhật ký cũ. Hồ sơ thuế giữ nguyên phạm vi và quy tắc riêng.

Phân loại mã cũ giữ cùng định danh; dữ liệu không bị chuyển sang mã mới. Mã có số liệu không được đổi số mã hoặc chuyển bản ghi sang mã khác bằng biểu mẫu sửa thông thường. Nếu được cấp mã khác, ngừng mã cũ và thêm mã mới; lịch sử mã cũ vẫn xem được. Không xóa mã hoặc số liệu để né giới hạn.

Cột `clients.ins_code` được giữ làm nguồn cũ, chặn sửa trực tiếp để tránh mất liên kết với sổ riêng. Các thông tin phần mềm/tài khoản đăng nhập BHXH vẫn theo quyền sửa hồ sơ khách hiện có; portal dùng chung chỉ lấy thông tin phục vụ sổ, không lấy mật khẩu khách.

## Kiểm thử

- `npm run test:bhxh:units`: PostgreSQL cách ly (PGlite), migration chạy lại trước/sau phân loại, giữ dữ liệu và snapshot cũ, giới hạn/nhóm/quyền, ba mã cùng tháng, chuyển kỳ, tiền nộp/hủy/khôi phục, tài khoản mặc định, lời nhắc, cách ly thuế, chống chuyển sai mã và các helper giao diện.
- `npm run test:bhxh:units:ui`: Chromium với mọi RPC trỏ vào PostgreSQL cách ly, chặn mạng ngoài. Phân loại/thêm ba mã, lọc và đọc C12 PDF, chọn mã khi nhắc khách, đổi mặc định và gợi ý số tiền, giải mã QR bằng jsQR, tổng khách, giao diện máy tính/điện thoại.
- Các suite UI C12/cơ sở/thuế dùng cấu trúc mới, đồng thời tạo dữ liệu cũ trước migration ở những luồng BHXH để kiểm tra tương thích.
- Build TypeScript/Vite và lint các file thay đổi. Không ghi dữ liệu tài chính thử nghiệm lên website thật.

Các suite cần runtime QA tại `%TEMP%/anan-recurrence-qa` (`@electric-sql/pglite`, `@playwright/test`, `jsqr`). UI mặc định chạy tại `http://127.0.0.1:5187` cho suite mã; truyền `QA_APP_ORIGIN` để dùng cổng khác.
