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
- Theo dõi từng khoản khách phải đóng BHXH / thuế, lịch báo khách, lời hẹn, nhắc lại và xác nhận đã đóng.
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

## Theo dõi khách đóng BHXH & thuế

Chạy toàn bộ `supabase-payment-followups-migration.sql` trong Supabase SQL Editor với role postgres, sau đó triển khai bản giao diện mới. File có thể chạy lại và độc lập với migration công việc định kỳ; không cần Cron. Khi chưa cài migration, giao diện hiển thị thông báo cài đặt và không cho lưu khoản mới.

Mở **BHXH & thuế** ở menu hoặc **Theo dõi đóng BHXH / thuế** trên thẻ khách hàng:

1. Thêm khoản: chọn khách, loại (BHXH / GTGT / TNCN / TNDN / thuế khác), kỳ (tháng / quý / năm hoặc nội dung riêng), hạn đóng và ngày cần nhắc. Số tiền có thể để trống khi chưa xác định. Hạn đóng do nhân viên nhập theo hồ sơ thực tế, hệ thống không tự suy ra thời hạn pháp luật.
2. Sau khi liên hệ, chọn **Đã báo / nhắc khách**, ghi chú cách liên hệ và đặt ngày nhắc tiếp. Thao tác này giữ khoản đóng ở trạng thái chờ; không đánh dấu hoàn thành. Nếu khách đã hẹn ngày đóng, lời hẹn vẫn được giữ khi nhắc thêm.
3. Chọn **Khách hẹn đóng** để lưu ngày khách hẹn và ngày kiểm tra tiếp. Khoản quá hạn đóng, qua ngày khách hẹn, đến ngày nhắc hoặc đến hạn trong 3 ngày đều vào nhóm cần kiểm tra.
4. Khi kiểm tra được kết quả, chọn **Xác nhận đã đóng**, nhập ngày thực đóng và mã chứng từ / thông tin xác nhận nếu có. Khoản này dừng nhắc nhưng vẫn có trong bộ lọc Đã đóng và Lịch sử. Ngừng theo dõi hoặc mở lại phải ghi lý do.

Nhắc hiển thị trên Bảng điều khiển và sổ theo dõi, kiểm tra lại mỗi phút khi tab đang mở hoặc khi quay lại tab; không gửi tin nhắn, email hay thông báo khi ứng dụng đã đóng. “Đã báo” là ghi nhận thao tác liên hệ do nhân viên thực hiện. Mỗi kỳ cần thêm khoản riêng; lịch công việc định kỳ hiện tại vẫn hoạt động độc lập.

Các nhân viên cùng được phân công cho khách dùng chung sổ. Phạm vi dựa trên hồ sơ thiết bị và nhân sự phụ trách hiện có (không phải xác thực email). Đổi người phụ trách chuyển quyền xem/cập nhật theo phân công mới. Khách lưu trữ vẫn giữ các khoản cũ để xử lý, không tạo khoản mới. Không cho xóa khoản hoặc lịch sử từ trình duyệt; ghi nhận người sửa, thời điểm và thông tin sau từng cập nhật. Một khách / loại / kỳ có một khoản duy nhất, kể cả đã đóng hoặc ngừng theo dõi; khi cần sửa khoản đã kết thúc, mở lại theo dõi. Kiểm tra phiên bản tránh ghi đè khi hai người cùng sửa và mã yêu cầu tránh ghi trùng khi gửi lại do lỗi mạng.

Sổ này theo dõi tiền khách đóng cho cơ quan, độc lập với phí dịch vụ, công nợ và tiền thực nhận của công ty; xác nhận đã đóng không tạo phiếu thu hay điều chỉnh công nợ.

Kiểm tra logic bằng PostgreSQL WASM độc lập, không kết nối Supabase thật (dùng runtime QA đã cài ở phần Công việc định kỳ):

```powershell
npm run test:payment-followups
npm run lint
npm run build
```

Kiểm tra giao diện với Chromium (mọi lời gọi Supabase được chặn và xử lý bằng PostgreSQL WASM; không dùng dữ liệu thật): cài thêm `@playwright/test` vào cùng thư mục QA, mở dev server trên `127.0.0.1:5173`, rồi chạy `npm run test:payment-followups:ui`. Script mặc định dùng Chromium đã cài ở `%LOCALAPPDATA%/ms-playwright/chromium-1228/chrome-win64/chrome.exe`; có thể đặt `QA_CHROMIUM_PATH` trỏ đến Chromium khác. Ảnh desktop / mobile được lưu dưới `%TEMP%/anan-recurrence-qa/payment-followups-ui/`.
