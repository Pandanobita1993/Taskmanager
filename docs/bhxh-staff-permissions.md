# Quyền cập nhật BHXH dùng chung

Chạy **toàn bộ** `supabase-bhxh-staff-permissions-migration.sql` trong SQL Editor của project Supabase đang dùng website, **sau** `supabase-bhxh-units-migration.sql`. Đây là migration cuối cùng về quyền BHXH. Chỉ phát hành giao diện tương ứng sau khi SQL thành công và đã kiểm tra RPC trên backend thật.

## Quy tắc từ ngày 27/10/2026

- Nhân viên đang hoạt động có nghiệp vụ chính `BHXH`, hoặc có quyền kiêm nhiệm `bhxh` trong `app_users.roles`, được cập nhật mã đơn vị, C12, quá trình đóng và cơ sở / tài khoản nhận BHXH của mọi khách BHXH.
- Không cần khách được phân công trực tiếp cho nhân viên đó. Không đổi tên người phụ trách trên hồ sơ khách.
- Nhân viên không có nghiệp vụ BHXH vẫn xem được theo phạm vi BHXH dùng chung hiện có; các thao tác cập nhật kể trên bị khóa ở cả giao diện và RPC. Nhân viên ngừng hoạt động không được ghi dữ liệu.
- Quyền lấy từ dữ liệu nhân sự trên server. Thay vai trò trong bộ nhớ trình duyệt không cấp thêm quyền; bỏ vai trò hoặc ngừng nhân viên có hiệu lực khi gửi yêu cầu tiếp theo, kể cả gửi lại yêu cầu cũ.
- Phân công và quy tắc hồ sơ thuế giữ nguyên. Luồng nhắc khách hiện có không được viết lại trong migration này.

Migration chỉ thay hàm và quyền thực thi, không sửa mã, phân loại mã cũ, phân công khách, tiền, ảnh hay lịch sử. Giữ giới hạn ba mã, khóa phiên bản, chống gửi trùng, bằng chứng khoản đóng và nhật ký người thực hiện.

Mọi lần lưu mã đơn vị, C12, tiền nộp, cơ sở hoặc tài khoản mặc định tiếp tục ghi **ID và tên nhân viên thực hiện, thời điểm, bản ghi / mã liên quan, nội dung gửi lên và số liệu sau khi lưu**. Hủy / khôi phục khoản nộp có loại thao tác và lý do riêng. Tên người thực hiện lấy từ hồ sơ nhân sự trên server, không lấy tên người được phân công khách. Log cũ được giữ nguyên kể cả khi nhân viên đổi tên; gửi lại đúng yêu cầu cũ không tạo log trùng. Dữ liệu và log được lưu cùng giao dịch: yêu cầu lỗi không được ghi như một cập nhật thành công.

Không chạy lại các migration cũ sau bản quyền này. Nếu cần cài lại các hàm cũ, chạy lại file quyền này cuối cùng. File có transaction, chạy lại được; nếu cấu trúc hàm hiện có khác dự kiến thì dừng và rollback thay vì sửa một phần.

## Kiểm tra

- `npm run test:bhxh:permissions`: PostgreSQL cách ly; vai trò chính / kiêm nhiệm, cập nhật khách của đồng nghiệp, nhân viên chỉ xem / đã ngừng, thu hồi quyền, bảo toàn dữ liệu khi cài và chạy lại, C12 / tiền nộp / cơ sở / mã đơn vị, quyền thuế, khóa phiên bản và retry.
- `npm run test:bhxh:permissions:ui`: cùng PostgreSQL cách ly qua RPC; thêm mã cho khách của người khác, sửa C12, upload bằng chứng và ghi tiền nộp, sửa cơ sở, quyền kiêm nhiệm và giao diện chỉ xem dù cache giả vai trò BHXH; máy tính / điện thoại.
- Sau khi cài trên Supabase thật, chỉ đọc các portal với hồ sơ nhân viên hợp lệ để xác nhận `can_manage_bhxh` và `clients[].can_edit_units`. Không ghi dữ liệu tài chính thử lên website thật.
