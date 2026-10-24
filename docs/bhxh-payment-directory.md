# Cơ sở BHXH và thông tin đóng tiền

## Cài đặt

Chạy **toàn bộ `supabase-bhxh-agencies-migration.sql`**, role postgres trong Supabase SQL Editor, sau `supabase-bhxh-shared-payments-migration.sql`. File có transaction và có thể chạy lại. Chờ “Success. No rows returned” rồi triển khai giao diện. Khi cài lại các migration cũ, chạy file này cuối cùng để giữ hàm xử lý mới.

File bổ sung danh mục cơ sở, ngân hàng, tỉnh / thành phố, mặc định cơ sở nhận tiền theo khách và lịch sử cập nhật. Thêm `transfer_details` vào các lời nhắc; dữ liệu tiền nộp và công nợ C12 giữ nguyên. Không tự thêm tài khoản ngân hàng của cơ sở hoặc gán khách theo địa chỉ.

## Sử dụng

1. Vào **Theo dõi BHXH → Cơ sở BHXH → Thêm cơ sở BHXH**. Điền tên, mã cơ sở (giữ số 0 đầu), địa chỉ, một số điện thoại chính, tỉnh / thành phố. Ghi tự do số liên hệ khác trong Ghi chú.
2. Thêm từng tài khoản: chọn ngân hàng, nhập nguyên dãy số tài khoản, tên tài khoản nhận (không dấu, viết hoa; được gợi ý từ tên cơ sở), chi nhánh nếu có. Chọn tài khoản chính xác theo thông báo của cơ sở. Tên tài khoản nhập vào là thông tin cấu hình, không phải kết quả tra cứu chủ tài khoản từ ngân hàng.
3. Thêm từng địa bàn bằng loại và tên riêng: Xã, Phường, Thị trấn hoặc Đặc khu; mã địa bàn 5 chữ số là tùy chọn. Tỉnh lưu bằng mã hành chính. Mỗi mục có ID riêng trong JSON, có thể truy vấn bằng `jsonb_array_elements`; chỉ mục GIN hỗ trợ việc tìm cơ sở theo địa bàn sau này. Chưa suy đoán cơ sở từ địa chỉ hoặc tạo TK3 trong bản này.
4. Gắn cơ sở và tài khoản mặc định cho từng khách trong cùng tab. Chỉ gắn cho khách đang sử dụng dịch vụ BHXH. Thay đổi mặc định chỉ áp dụng khi tạo lời nhắc mới hoặc chọn lại tại lời nhắc.
5. Khi thêm / sửa khoản nhắc hoặc chọn **Đã báo / nhắc khách**, chọn cơ sở và một tài khoản. Mặc định lấy theo khách; cho đổi riêng từng lần. Mã đơn vị lấy từ hồ sơ khách. Cú pháp có thể sửa trước khi lưu. Khi cơ sở đổi thông tin lúc đang soạn, server yêu cầu làm mới để tránh lưu đè thông tin cũ.
6. Lưu khoản nhắc sẽ hiện thông tin tài khoản và cú pháp trên thẻ. Chọn **Thông tin gửi khách / QR** để sao chép hoặc tạo ảnh QR tải về. Không gửi tin tới khách và không tự ghi nhận đã đóng khi tạo QR.

Thông tin gửi khách có các dòng:

```text
Mã đơn vị: [mã đơn vị]
Số tiền cần đóng: [số tiền ở lệnh nhắc]
Đóng cho kỳ: [kỳ ở lệnh nhắc]
Cú pháp: BHXH 103 00 [mã đơn vị] [mã cơ sở] DONG BHXH [MM/YYYY]
Tên tài khoản nhận: [tên không dấu, viết hoa]
Số tài khoản: [tài khoản đã chọn]
Ngân hàng: [tên đầy đủ và chi nhánh nếu có]
```

Mẫu cú pháp lưu riêng ở từng cơ sở. Biến hỗ trợ: `{{ma_don_vi}}`, `{{ma_co_quan}}`, `{{ky}}`, `{{thang}}`, `{{nam}}`. Với kỳ tháng, `{{ky}}` xuất `MM/YYYY`. Chưa có mã đơn vị / chưa điền hết biến thì không cho lưu thông tin nhận tiền.

Mỗi khoản nhắc lưu bản chụp thông tin nhận tiền, có tên, mã cơ sở, ngân hàng, tên / số tài khoản, mã đơn vị và cú pháp. Thay đổi danh mục không viết lại các lời nhắc đã lưu. Nếu cập nhật thông tin nhận tiền khi nhắc lần sau, lịch sử vẫn giữ bản chụp trước đó. Ngừng sử dụng cơ sở không xóa thông tin đã gửi khách.

## QR và giới hạn nội dung

Mã VietQR chuyển khoản ngân hàng được tạo tại trình duyệt bằng thư viện `qrcode` (MIT). Không gọi dịch vụ tạo QR, không cần API key và không truyền thông tin khách / số tiền / cú pháp cho bên thứ ba. Chuỗi TLV NAPAS sử dụng GUID `A000000727`, dịch vụ `QRIBFTTA`, tiền tệ `704`, quốc gia `VN` và CRC-16/CCITT-FALSE.

QR chỉ tạo khi số tiền dương, tối đa 13 chữ số và số tài khoản 6–19 chữ số. Cú pháp không dấu dài tối đa 25 ký tự được đưa nguyên vào QR. Cú pháp dài hơn hoặc có chữ có dấu được giữ đầy đủ trong văn bản; người dùng cần chọn rõ **QR tài khoản + số tiền**. Ảnh xuất ra ghi rõ QR không kèm nội dung và hướng dẫn dán nguyên cú pháp trước khi xác nhận. Không cắt cú pháp, bỏ mã cơ sở, bỏ kỳ hoặc tự sửa ký tự để ép vào QR. Không tự xác nhận giao dịch hay hạch toán sau khi khách quét.

Nguồn và tài liệu kỹ thuật:

- [Danh sách ngân hàng và mã BIN VietQR](https://www.vietqr.io/api-bank), [dữ liệu API](https://api.vietqr.io/v2/banks): chụp ngày 24/10/2026 tại `src/lib/vietnamBanks.json`, 76 tổ chức. Danh mục có thể thay đổi; cập nhật cùng cả file JSON và phần seed SQL trong một phiên bản để tên / BIN phía trình duyệt và server khớp nhau.
- [Danh mục tỉnh / thành phố theo Quyết định 19/2025/QĐ-TTg](https://chinhphu.vn/?classid=1&docid=214409&orggroupid=3&pageid=27160), [Phụ lục chính thức](https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/19ttg.signed.pdf): 34 mã tỉnh / thành phố, lưu chuỗi để giữ số 0 đầu.
- [Đặc tả API VietQR, giới hạn và ví dụ chuỗi QR](https://www.vietqr.io/generate): giới hạn 13 chữ số tiền và 25 ký tự nội dung. Ví dụ công khai là vector kiểm thử độc lập của bộ mã hóa / CRC.
- [Thư viện tạo ảnh QR](https://github.com/soldair/node-qrcode).

Cú pháp mặc định ở đây theo mẫu người dùng yêu cầu. Có thể thay riêng theo thông báo thực tế của từng cơ sở; không suy ra một mẫu pháp lý áp dụng cho mọi cơ sở.

## Kiểm thử

Không dùng dữ liệu tài chính thật. QA dùng PostgreSQL WASM / Playwright đặt trong `%TEMP%/anan-recurrence-qa`.

```powershell
npm install --prefix "$env:TEMP/anan-recurrence-qa" --ignore-scripts --no-audit --no-fund @electric-sql/pglite @playwright/test jsqr
npm run test:bhxh:agencies
# Mở Vite và truyền địa chỉ app thử nếu không dùng cổng mặc định 5186:
$env:QA_APP_ORIGIN='http://127.0.0.1:5186'
npm run test:bhxh:agencies:ui
npm run test:bhxh:shared
npm run test:bhxh
npm run build
```

SQL kiểm tra chạy lại migration, quyền của nhân viên, kiểm tra ngân hàng, nhiều tài khoản, địa bàn có loại, giữ số 0 đầu, chống trùng / ghi đè, snapshot bất biến và luồng thuế. UI kiểm tra lỗi mất phản hồi / gửi lại, cấu hình khách, chọn tài khoản khác, cú pháp đúng mẫu, clipboard, giải mã ảnh QR bằng `jsQR` độc lập, thông tin cũ sau khi đổi tài khoản, mobile và thiếu migration. Ảnh kiểm thử ở `%TEMP%/anan-recurrence-qa/bhxh-agencies-ui/`.
