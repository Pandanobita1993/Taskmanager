# Tra cứu đơn vị tham gia BHXH

Vào **Theo dõi BHXH → Công cụ → Tra cứu đơn vị tham gia BHXH** (`/insurance?tab=tools`). Chọn khách để điền MST hoặc nhập riêng, nhập **mã cơ sở BHXH gồm 5 chữ số** (giữ số 0 ở đầu, ví dụ `09200`), rồi nhập 5 ký tự trong ảnh CAPTCHA và bấm Tra cứu. Có thể đổi ảnh hoặc tải lại công cụ khi hết phiên. Mã cơ sở gửi vào `MaBHXH`, là mã cơ quan quản lý, khác mã đơn vị của doanh nghiệp. Không dùng danh sách 63 tỉnh/thành cũ và không tự quy đổi địa bàn mới sang mã cũ.

Kết quả và các trang tiếp theo được đọc từ nguồn BHXH, có thời điểm tra cứu và liên kết nguồn. Công cụ chỉ đọc, không tự ghi mã đơn vị, C12, tiền nộp hay thông tin khách hàng vào Supabase. Nếu danh sách khách không tải được, vẫn có thể nhập thông tin riêng.

## Chạy và triển khai

1. `npm install`.
2. Đặt biến **chỉ phía máy chủ** `BHXH_LOOKUP_SESSION_SECRET` trong `.env` và trên Vercel. Tạo giá trị ngẫu nhiên riêng cho mỗi môi trường bằng `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Không thêm tiền tố `VITE_`, không đưa khóa vào Git hoặc mã giao diện. Khóa phải có ít nhất 32 ký tự; đổi khóa làm hết hạn phiên tra cứu đang mở.
3. Chạy `npm run dev` để Vite phục vụ cả giao diện và API. Khởi động lại dev server sau khi đổi `.env`.
4. Trên Vercel, triển khai project gốc gồm `api/bhxh-lookup.ts` và `server/bhxhLookup.ts`, dùng Node 24.x. `vercel.json` giữ `/api/*` cho Functions và chuyển các đường dẫn giao diện về `index.html`. Sau khi thêm biến môi trường cần triển khai lại.

`npm run preview` và hosting chỉ phục vụ file tĩnh không chạy API này. Công cụ sẽ báo rõ nếu API chưa có. Không cần migration Supabase mới. Kết nối từ nơi chạy máy chủ tới `https://baohiemxahoi.gov.vn` phải hoạt động; cổng nguồn có thể gián đoạn hoặc chặn lưu lượng từ máy chủ triển khai.

## Cách hoạt động

- Khắc phục TLS ngày 30/10/2026: một số máy cân bằng tải BHXH yêu cầu handshake TLS cũ hoặc reset kết nối từ fetch (`ECONNRESET`). Transport thử kết nối mặc định trước, chỉ retry hai lỗi này bằng HTTPS với `SSL_OP_LEGACY_SERVER_CONNECT`, riêng tên miền BHXH. Vẫn bắt buộc xác thực chứng chỉ và hostname, không chuyển hướng, không hạ xác thực cho lỗi chứng chỉ hết hạn / sai tên / thiếu chuỗi tin cậy. Timeout và giới hạn phản hồi vẫn áp dụng.

- `POST /api/bhxh-lookup` nhận JSON cho các thao tác `init`, `captcha`, `search`, `page`. API chỉ gọi những đường dẫn cố định của cổng BHXH; không nhận URL đích do người dùng cung cấp.
- `init` khởi tạo cookie phiên từ trang nguồn, rồi lấy ảnh CAPTCHA trong cùng phiên; không đọc danh mục tỉnh/thành hoặc gọi API danh sách cơ quan.
- `search` gửi form URL encoded gồm đúng `MaBHXH` (mã cơ sở nhập trực tiếp), `tokenRecaptch`, `MaSoThue`, `MaDonVi=''`, `TenDonVi=''` tới `pListDonViThamGia.aspx`. MST và mã cơ sở bắt buộc. CAPTCHA do nhân viên đọc và nhập; không giải mã tự động hay dùng lại mã trong ảnh chụp DevTools. Sau mỗi lần gửi, giao diện lấy ảnh mới như trang nguồn.
- Cookie nguồn và bộ lọc đã xác nhận được giữ trong token AES-256-GCM, có hạn 20 phút kể từ lúc khởi tạo, chỉ lưu trong bộ nhớ của tab hiện tại. Các tab và người dùng có phiên riêng, không cần bộ nhớ dùng chung giữa các Vercel Functions. API không ghi log payload, token hoặc kết quả.
- Phân trang dùng `docheck=1` giống mã của trang nguồn, chỉ sau khi một tra cứu CAPTCHA thành công và chỉ cho trang do nguồn trả về. Bộ lọc được lấy từ token đã xác thực; không nhận bộ lọc thay thế từ trình duyệt khi phân trang.
- HTML nguồn được parse phía máy chủ và chuyển thành chuỗi văn bản / hàng / cột. Giao diện không nhúng hoặc thực thi HTML, script, event handler, ảnh hay liên kết từ kết quả. Trang lỗi / phản hồi lạ không được báo thành “không có dữ liệu”.
- Giới hạn 20 giây cho mỗi thao tác và 2 MB cho mỗi phản hồi nguồn, 24 KB cho yêu cầu API. Không tự quét, không retry hàng loạt, không tự tra cứu mọi khách.

## Kiểm tra

`npm run test:bhxh:lookup` kiểm tra API và parser với nguồn giả lập, không gọi BHXH hoặc Supabase. `npm run test:bhxh:lookup:ui` kiểm tra giao diện desktop/mobile với API và Supabase giả lập; cần bộ `@playwright/test` trong `%TEMP%/anan-recurrence-qa/node_modules` và Chromium tương tự các test giao diện BHXH khác. Dev server mặc định tại `127.0.0.1:5189`; có thể đổi bằng `QA_APP_ORIGIN` và `QA_CHROMIUM_PATH`.

Kiểm tra thật sau triển khai: vào Công cụ, nhập MST + mã cơ sở đang cần đối chiếu, tự nhập CAPTCHA đang hiển thị và đối chiếu kết quả với trang nguồn. Thử mã sai, đổi ảnh, tải lại và phân trang nếu có. Kiểm thử giả lập không chứng minh rằng máy chủ Vercel được cổng BHXH chấp nhận.
