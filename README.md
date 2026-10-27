# TaskFlow

Ứng dụng nội bộ quản lý công việc, hồ sơ và báo cáo cho doanh nghiệp dịch vụ kế toán.

Quyền cập nhật BHXH dùng chung (27/10/2026): cài `supabase-bhxh-staff-permissions-migration.sql` sau migration mã đơn vị để nhân viên BHXH / kiêm nhiệm BHXH thiết lập mã, C12, quá trình đóng và cơ sở cho mọi khách BHXH. Xem [hướng dẫn cài và kiểm tra](docs/bhxh-staff-permissions.md).

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

## Nhắc khách đóng BHXH / thuế

Chạy toàn bộ `supabase-payment-followups-migration.sql` trong Supabase SQL Editor với role postgres, sau đó triển khai bản giao diện mới. File có thể chạy lại và độc lập với migration công việc định kỳ; không cần Cron. Khi chưa cài migration, giao diện hiển thị thông báo cài đặt và không cho lưu khoản mới.

Hai phân hệ được tách riêng: **Theo dõi BHXH → Nhắc khách** và **Theo dõi thuế**. Mỗi thẻ khách hàng có đường dẫn riêng. Liên kết cũ `/payment-followups` chuyển tới Nhắc khách BHXH và giữ bộ lọc khách; dữ liệu thuế cũ vẫn nằm ở Theo dõi thuế.

1. Thêm khoản: chọn khách, loại (BHXH / GTGT / TNCN / TNDN / thuế khác), kỳ (tháng / quý / năm hoặc nội dung riêng), hạn đóng và ngày cần nhắc. Số tiền có thể để trống khi chưa xác định. Hạn đóng do nhân viên nhập theo hồ sơ thực tế, hệ thống không tự suy ra thời hạn pháp luật.
2. Sau khi liên hệ, chọn **Đã báo / nhắc khách**, ghi chú cách liên hệ và đặt ngày nhắc tiếp. Thao tác này giữ khoản đóng ở trạng thái chờ; không đánh dấu hoàn thành. Nếu khách đã hẹn ngày đóng, lời hẹn vẫn được giữ khi nhắc thêm.
3. Chọn **Khách hẹn đóng** để lưu ngày khách hẹn và ngày kiểm tra tiếp. Khoản quá hạn đóng, qua ngày khách hẹn, đến ngày nhắc hoặc đến hạn trong 3 ngày đều vào nhóm cần kiểm tra.
4. Khi kiểm tra được kết quả, chọn **Xác nhận đã đóng**, nhập ngày thực đóng và mã chứng từ / thông tin xác nhận nếu có. Khoản này dừng nhắc nhưng vẫn có trong bộ lọc Đã đóng và Lịch sử. Ngừng theo dõi hoặc mở lại phải ghi lý do.

Nhắc hiển thị trên Bảng điều khiển và sổ theo dõi, kiểm tra lại mỗi phút khi tab đang mở hoặc khi quay lại tab; không gửi tin nhắn, email hay thông báo khi ứng dụng đã đóng. “Đã báo” là ghi nhận thao tác liên hệ do nhân viên thực hiện. Mỗi kỳ cần thêm khoản riêng; lịch công việc định kỳ hiện tại vẫn hoạt động độc lập.

Thuế dùng phạm vi nhân viên được phân công như trước; BHXH dùng chung danh sách khách có dịch vụ BHXH sau migration bên dưới. Phạm vi dựa trên hồ sơ thiết bị hiện có (không phải xác thực email). Khách lưu trữ vẫn giữ các khoản cũ để xử lý, không tạo khoản mới. Không cho xóa khoản hoặc lịch sử từ trình duyệt; ghi nhận người sửa, thời điểm và thông tin sau từng cập nhật. Một khách / loại / kỳ có một khoản duy nhất, kể cả đã đóng hoặc ngừng theo dõi; khi cần sửa khoản đã kết thúc, mở lại theo dõi. Kiểm tra phiên bản tránh ghi đè khi hai người cùng sửa và mã yêu cầu tránh ghi trùng khi gửi lại do lỗi mạng.

Sổ này theo dõi tiền khách đóng cho cơ quan, độc lập với phí dịch vụ, công nợ và tiền thực nhận của công ty; xác nhận đã đóng không tạo phiếu thu hay điều chỉnh công nợ.

Kiểm tra logic bằng PostgreSQL WASM độc lập, không kết nối Supabase thật (dùng runtime QA đã cài ở phần Công việc định kỳ):

```powershell
npm run test:payment-followups
npm run lint
npm run build
```

Kiểm tra giao diện với Chromium (mọi lời gọi Supabase được chặn và xử lý bằng PostgreSQL WASM; không dùng dữ liệu thật): cài thêm `@playwright/test` vào cùng thư mục QA, mở dev server trên `127.0.0.1:5173`, rồi chạy `npm run test:payment-followups:ui`. Script mặc định dùng Chromium đã cài ở `%LOCALAPPDATA%/ms-playwright/chromium-1228/chrome-win64/chrome.exe`; có thể đặt `QA_CHROMIUM_PATH` trỏ đến Chromium khác. Ảnh desktop / mobile được lưu dưới `%TEMP%/anan-recurrence-qa/payment-followups-ui/`.

## Sổ BHXH theo C12 và quá trình đóng

Sau migration nhắc khách đã có, chạy **`supabase-bhxh-ledger-migration.sql`** trong Supabase SQL Editor với role postgres rồi triển khai giao diện mới. File có thể chạy lại, không đổi các khoản nhắc khách / dữ liệu thuế cũ. Khi chưa cài, tab Công nợ C12 và Quá trình đóng thông báo chờ cài đặt; tab Nhắc khách vẫn sử dụng được.

**Theo dõi BHXH** có ba tab:

- **Công nợ C12:** mỗi khách một bản ghi cho mỗi tháng. Nhập tổng phát sinh (dòng B, có thể cập nhật thường xuyên). Đầu kỳ tự lấy cuối tháng liền trước; nếu thiếu tháng hoặc chưa xác định được số dư kỳ trước thì đầu kỳ và cuối kỳ là **Thiếu thông tin**, không coi là 0. Có thể chọn chỉnh đầu kỳ riêng và ghi lý do / nguồn đối chiếu; bỏ chọn để lấy lại từ kỳ trước.
- **Quá trình đóng:** ghi từng lần khách thực nộp cho cơ quan BHXH, số tiền, ngày thực nộp và mã giao dịch nếu có. Cho sửa thông tin, hủy hoặc khôi phục có lý do, không xóa mất lịch sử. Mã chứng từ trùng của cùng khách bị chặn (không phân biệt hoa thường / khoảng trắng đầu cuối); nếu giao dịch không có mã vẫn có thể ghi nhiều lần nộp.
- **Nhắc khách:** giữ các lịch báo / hẹn / nhắc đã có. Xác nhận Đã đóng trước đây chỉ là trạng thái, không đủ để suy ra số tiền thực nộp nên không tự chuyển thành giao dịch. Nhập số thực nộp vào Quá trình đóng sau khi đối chiếu chứng từ.

**Cuối kỳ = Đầu kỳ + Phát sinh − Tổng tiền đã nộp trong tháng thực nộp.** Số tiền đã nộp và số dư cuối kỳ là chỉ đọc trên form C12; server cũng không cho nhập hai số này. Khoản nộp bù được cộng vào tháng thực nộp, không phân bổ lại về tháng nợ. Số dư âm là đóng thừa, được chuyển tiếp nguyên dấu. Sửa phát sinh kỳ cũ / thêm tiền nộp / thay đổi tháng nộp / hủy hoặc khôi phục giao dịch sẽ tính lại chuỗi tháng liền kề, dừng ở khoảng trống hoặc kỳ có đầu kỳ chỉnh riêng. Lịch sử lưu người sửa, thời điểm và dữ liệu của mỗi lần cập nhật; kiểm tra phiên bản chống ghi đè và mã yêu cầu chống lặp khi mất phản hồi mạng.

Số tổng nợ trên đầu trang lấy số dư dương của **kỳ mới nhất từng khách** trong phạm vi khách / tìm kiếm, không cộng dồn số dư của nhiều kỳ. Khách thiếu thông tin được thống kê riêng; số tiền nộp trong bộ lọc không gồm lần nộp đã hủy. Dữ liệu sổ BHXH độc lập với phí dịch vụ và tiền thực nhận của công ty.

Khi mở sổ, khách đang hoạt động đã có kỳ của **tháng liền trước** sẽ tự có thẻ tháng hiện tại ở trạng thái **Chờ nhập phát sinh**, tính theo ngày Việt Nam từ máy chủ. Đầu kỳ lấy số cuối kỳ trước (kể cả 0 hoặc số âm); chưa xác định được thì vẫn để thiếu thông tin. Phát sinh chưa nhập không được coi là 0, và chưa tính số dư cuối kỳ. Bấm **Nhập phát sinh**, nhập số thực tế rồi lưu để ghi nhận chính thức kỳ mới. Kỳ đã lưu được giữ nguyên, không sinh trùng khi mở lại sổ. Nếu đang lọc tháng cũ, nút **Xem tháng hiện tại** chuyển sang kỳ mới. Không tự tạo bù các tháng bị khuyết, không mở kỳ tương lai cho khách và không tạo kỳ mới cho khách lưu trữ.

Thẻ chờ nhập chỉ là bản nháp hiển thị, không ghi một khoản phát sinh giả vào dữ liệu. Các nhân viên đều thấy bản nháp từ dữ liệu kỳ trước; sau khi một người lưu, các máy khác làm mới sẽ thấy kỳ đã ghi nhận. Tổng nợ dùng kỳ đã cập nhật gần nhất của từng khách, chưa cộng thẻ chờ nhập. Tính năng chuyển kỳ này dùng cấu trúc hiện có, không cần cài lịch nền.

### BHXH dùng chung, gợi ý số tiền và ảnh bằng chứng

Sau hai migration ở trên, chạy **toàn bộ `supabase-bhxh-shared-payments-migration.sql`** trong Supabase SQL Editor, role postgres, rồi triển khai giao diện. File có thể chạy lại; giữ nguyên số tiền, bản ghi và lịch sử cũ. File này dùng Supabase Storage, tự tạo bucket `task-proofs` nếu thiếu và thêm chính sách tải / đọc thư mục `public/bhxh/`, giữ nguyên thiết lập bucket và chính sách cũ nếu đã có. Không chạy lại migration cũ sau file mới vì có thể ghi đè hàm kiểm tra mới; nếu cần, chạy lại file mới cuối cùng.

- Sổ C12, tiền nộp và lời nhắc BHXH dùng chung cho mọi hồ sơ nhân viên đang hoạt động, gồm tất cả khách có `BHXH` trong Dịch vụ. Tab Quá trình đóng có bảng tổng quan cả khách chưa từng nộp, mặc định hiển thị tháng hiện tại. Khách ngừng dịch vụ / lưu trữ vẫn giữ lịch sử nhưng không sinh kỳ mới hoặc thêm khoản mới. Phạm vi thuế và danh sách khách thuế giữ nguyên theo người phụ trách.
- Thêm khoản nhắc / bấm **Đã báo / nhắc khách** tự điền số còn phải đóng theo **số dư cuối kỳ C12** đúng kỳ và mã (đầu kỳ + phát sinh − đã nộp), cho sửa số tiền trước khi lưu. Nút **Nhắc khách kỳ này** trên thẻ C12 mở đúng khách và tháng; nếu đã có khoản theo dõi thì dùng lại. Thiếu số dư cuối kỳ thì không tự lấy riêng phát sinh hoặc đoán thành 0. Kỳ riêng không phải tháng vẫn nhập thủ công. Số dư âm được gợi ý 0 để không nhắc thu số âm.
- Lần nộp mới tự điền số dương còn phải đóng của tháng thực nộp (đầu kỳ + phát sinh − đã nộp). Thiếu đầu kỳ hoặc phát sinh thì để trống. Thay khách cập nhật gợi ý; đổi ngày chỉ cập nhật tự động khi chưa sửa tay số tiền. **Dùng số gợi ý** cho phép lấy lại. Khi sửa lần nộp đã có, giữ số tiền giao dịch cũ. Không tạo tiền nộp từ C12 hoặc từ xác nhận trạng thái lời nhắc.
- Ghi / sửa / khôi phục lần nộp và xác nhận Đã đóng ở lời nhắc BHXH cần ảnh PNG, JPEG hoặc WebP tối đa 5 MB. Chọn file hoặc dán ảnh vào khung bằng chứng. Tải ảnh thành công mới cho lưu; server kiểm tra đối tượng ảnh tồn tại trong Storage. Ảnh được giữ kèm bản ghi và snapshot lịch sử; không xóa ảnh cũ khi thay ảnh mới. Bản ghi cũ thiếu ảnh vẫn xem được và cần bổ sung khi sửa / khôi phục. Tiền nộp hiển thị người ghi nhận, lịch sử ghi cả người sửa.

Kiểm tra thêm migration mới bằng `npm run test:bhxh:shared`. Bộ `test:bhxh:ui` kiểm tra gợi ý, sửa tay, thiếu / lỗi tải ảnh, retry, xem ảnh, danh sách khách không phân công và giao diện mobile; `test:payment-followups:ui` kiểm tra vòng đời thuế không cần ảnh.

### Cơ sở BHXH và thông tin đóng tiền

Danh mục cơ sở BHXH, tài khoản mặc định của khách, nội dung nhắc đóng và QR: chạy `supabase-bhxh-agencies-migration.sql` sau các migration BHXH ở trên. Xem [hướng dẫn cơ sở BHXH và thông tin đóng tiền](docs/bhxh-payment-directory.md) về thiết lập, giới hạn QR và kiểm thử.

### Đọc C12 PDF không dùng API trả phí

Chọn **Đọc C12 PDF** để PDF.js trích văn bản trực tiếp trong trình duyệt. Giới hạn 10 MB / 12 trang; file không tải lên server, chỉ tên file được lưu làm tham chiếu sau khi người dùng xác nhận. Thư viện và worker được đóng gói cùng website, chỉ tải khi chọn file.

Đọc tháng / năm, mã đơn vị và cột **CỘNG** ở các dòng A, B, C, Đ. Không nhận dạng được cột hoặc ô tổng trống thì để thiếu dữ liệu; không dùng nhầm số của từng quỹ. Dữ liệu đi vào bản nháp để kiểm tra và sửa; không tự lưu, không tạo khách hay giao dịch. Nếu mã đơn vị trên C12 khác mã trong hồ sơ khách đang chọn, phải chọn đúng khách / kiểm tra mã hồ sơ trước khi lưu. Số đầu kỳ trên PDF chỉ thay thế đầu kỳ tự động khi người dùng bấm dùng số đầu kỳ C12; tiền đã nộp và cuối kỳ trên PDF dùng đối chiếu và cảnh báo lệch, không ghi vào sổ nộp tiền.

PDF scan / ảnh hoặc mẫu không đọc được vẫn nhập thủ công; chưa dùng OCR hay API AI có phí. Để xem lại bản gốc cần giữ file trên máy vì ứng dụng không lưu file PDF.

Kiểm thử độc lập (runtime QA như trên; UI cần Vite trên `127.0.0.1:5173`):

```powershell
npm run test:bhxh
npm run test:bhxh:ui
npm run test:payment-followups
npm run test:payment-followups:ui
npm run build
```

Ảnh UI ở `%TEMP%/anan-recurrence-qa/bhxh-ui/`. Đặt `QA_C12_PDF_PATH` tới file C12 kiểm thử và `QA_C12_EXPECTED_JSON` là JSON chứa `period`, `unitCode`, `opening`, `charges` để kiểm tra thêm luồng trích PDF thực tế (file thử nên thuộc tháng 11/2025 để khớp kịch bản kỳ có sẵn); các bản ghi chỉ lưu ở PostgreSQL WASM cô lập.
