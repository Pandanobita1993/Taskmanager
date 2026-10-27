# Nhật ký và bàn giao Task Manager — đọc trước khi tiếp tục

> **Thay đổi yêu cầu ngày 27/10/2026:** Người dùng cho phép mọi nhân viên nghiệp vụ chính BHXH hoặc kiêm nhiệm BHXH thiết lập mã đơn vị, cập nhật C12, quá trình đóng và cơ sở BHXH cho tất cả khách BHXH, không giới hạn người được phân công từng khách. Bản chuẩn bị nằm ở `supabase-bhxh-staff-permissions-migration.sql`; xem `docs/bhxh-staff-permissions.md`. Cần xác nhận SQL mới đã được áp dụng trước khi phát hành; việc có file trong repo không có nghĩa database đã đổi quyền. Yêu cầu này thay thế các quy tắc khóa sửa mã theo phân công trong lịch sử bên dưới.

> **Yêu cầu đối chiếu được nhắc lại ngày 27/10/2026:** Mở quyền BHXH dùng chung vẫn phải giữ log ai đã thao tác, thời điểm và nội dung / số liệu thay đổi cho mã đơn vị, C12, quá trình đóng và cơ sở / tài khoản mặc định. Log ghi đúng nhân viên thực hiện, không ghi thay bằng người được phân công khách. Giữ lịch sử cũ, lý do hủy / khôi phục và chống log trùng khi gửi lại yêu cầu.

> **Thay đổi yêu cầu ngày 26/10/2026:** Khi thêm hoặc ghi nhận lần nhắc khách BHXH, số tiền gợi ý lấy **số dư cuối kỳ C12 của đúng kỳ và mã** (đầu kỳ + phát sinh − đã nộp), thay cho riêng phát sinh. Thiếu số dư cuối kỳ thì để người dùng nhập; số âm gợi ý 0. Đây là yêu cầu mới, thay thế quy tắc gợi ý phát sinh ghi trong các mục lịch sử ngày 24/10 bên dưới. Xem `docs/bhxh-unit-ledgers.md` và Git mới nhất để tiếp tục.

**Ngày chốt: 24/10/2026, khoảng 17:37, giờ Việt Nam (UTC+7).**

Người dùng đang làm tại máy cơ quan, sẽ **tắt máy cơ quan** và về nhà mở thư mục project trên Google Drive bằng máy khác. Người dùng yêu cầu ghi lại quá trình làm việc để Codex ở máy nhà đọc và tiếp tục. File này là bản bàn giao trong project, không phải bản xuất nguyên văn toàn bộ cuộc chat hay bản sao cơ sở dữ liệu.

## 1. Trạng thái cần nắm ngay

| Hạng mục | Trạng thái lúc bàn giao |
| --- | --- |
| Website | `https://taskmanager-one-sable.vercel.app` |
| Git repository | `https://github.com/Pandanobita1993/Taskmanager.git` |
| Branch làm việc | `main` |
| Commit code mới nhất tại project | **`b6f8954` — Separate BHXH balances, payments and reminders by client unit code** |
| Remote `main`, kiểm tra trực tiếp bằng `git ls-remote` lúc ghi log | **`9f78fc65cb0f7c5261f2dde2660f705a3f5ae4fd`** |
| Khác biệt trước khi thêm log này | Local đi trước remote **1 commit code**; chưa có thay đổi source đang sửa dở |
| Bản 3 mã BHXH | Đã viết code, migration, tài liệu và kiểm thử tại máy cơ quan; **CHƯA push, CHƯA phát hành lên website** |
| SQL mới nhất | **`supabase-bhxh-units-migration.sql` — CHƯA có xác nhận người dùng chạy trên Supabase** |
| Điểm đang chờ | Người dùng chạy toàn bộ SQL mới, xác nhận kết quả; kiểm tra backend rồi mới push/phát hành giao diện mới |
| Bản phát hành đã ghi nhận thành công ở lượt làm trước | `9f78fc6`: danh mục cơ sở BHXH, thông tin gửi khách, QR tại trình duyệt |

Trạng thái remote được kiểm tra lại ở lượt ghi log này. Trạng thái website và việc cài migration cơ sở BHXH là kết quả đã ghi nhận ở lượt triển khai trước; lượt chỉ ghi log này không triển khai hay ghi dữ liệu lên production.

**Không hiểu nhầm “đã làm xong” là bản 3 mã đã chạy trên website.** Giao diện mới phụ thuộc migration mới; cần hoàn tất bước Supabase trước khi đưa code lên.

## 2. Cách bắt đầu ở máy nhà

Người dùng có thể gửi cho Codex ở máy nhà:

> Đọc toàn bộ file NHAT_KY_BAN_GIAO_TASK_MANAGER.md trong project này, rồi đọc docs/bhxh-unit-ledgers.md. Đây là bàn giao từ máy cơ quan. Giữ các yêu cầu đã chốt và dữ liệu khách. Kiểm tra thư mục đã đồng bộ đủ, đặc biệt code commit b6f8954. Công việc tiếp theo là hoàn tất bản BHXH tối đa 3 mã: xác định SQL supabase-bhxh-units-migration.sql đã chạy chưa, kiểm tra backend rồi tiếp tục triển khai khi đủ điều kiện. Không viết lại chức năng đã hoàn thành và không tự phân loại mã BHXH cũ.

Đường dẫn ở cơ quan là `H:\My Drive\task-manager-app`; **đường dẫn ở nhà có thể khác**. Lấy thư mục người dùng thực sự mở làm gốc. Các đường dẫn tương đối trong log này tính từ gốc project.

Trước khi làm tiếp:

1. Kiểm tra Drive đã đồng bộ file log, SQL mới, `src/pages/BhxhUnits.tsx`, `src/lib/bhxhUnits.ts` và các file source khác.
2. Đọc `git status`, `git log -5`, xem có commit `b6f8954` hay không. Log này có thể được lưu trong một commit tài liệu sau commit code đó.
3. Nếu Git chỉ có `9f78fc6` nhưng file source mới đã đồng bộ, kiểm tra và giữ các file đó trước khi pull/reset/checkout. Commit code mới **chưa có trên GitHub** tại lúc bàn giao. Không lấy bản GitHub cũ ghi đè bản mới trên Drive.
4. Xem `.env` tại máy nhà có tồn tại và đúng project Supabase không, nhưng không in nội dung ra log/chat. File bị Git ignore, không có trong clone GitHub thông thường.
5. Hỏi kết quả SQL mới nếu người dùng chưa báo. Chưa có xác nhận chạy migration 3 mã trong cuộc chat tới thời điểm ghi log này.

## 3. Nhu cầu ban đầu và các quyết định đã chốt

Người dùng muốn Task Manager theo dõi các khoản phải đóng BHXH/thuế của từng khách, vì cả người phụ trách lẫn khách có thể quên sau khi báo. Sau đó chốt **tách thuế riêng, BHXH riêng**, ưu tiên hoàn thiện BHXH trước. Không tự mở rộng phần giao diện thuế.

### Công nợ C12

- Nhập và cập nhật thông số từ C12 theo tháng.
- Đầu kỳ tự lấy số cuối kỳ của **tháng liền trước**, hiện “Thiếu thông tin” nếu không đủ dữ liệu; cho chỉnh riêng kèm lý do/nguồn.
- Phát sinh trong kỳ có thể cập nhật nhiều lần.
- Tiền đã nộp lấy từ **Quá trình đóng**, không nhập tổng tiền nộp tại C12.
- Cuối kỳ = đầu kỳ + phát sinh − tiền đã nộp.
- Số âm là đóng thừa; không tự ép số dư âm về 0.
- Người dùng xác nhận rõ: tiền nộp cộng theo **tháng thực nộp**, kể cả khoản nộp bù nợ tháng trước.
- Khi sửa kỳ cũ hoặc bổ sung/hủy/khôi phục tiền nộp, các kỳ liền sau tính lại tới chỗ chỉnh đầu kỳ riêng hoặc bị đứt thông tin.

### Đọc file C12 tiết kiệm chi phí

- Dùng PDF.js đọc lớp chữ **ngay trong trình duyệt**, không tải C12 lên dịch vụ AI/OCR tính phí.
- Lấy tháng báo cáo từ **tiêu đề kỳ ở trên**, không dùng ngày ký ở dưới để nhận diện kỳ.
- Lấy tổng dòng A/B/C/D tại cột **CỘNG**; không lấy nhầm số thứ tự, tháng hoặc một quỹ bảo hiểm riêng.
- File scan/ảnh chưa có lớp chữ thì báo nhập thủ công; chưa triển khai OCR.
- File nhiều kỳ báo cáo thật hoặc nhiều mã thật thì yêu cầu tách/chọn đúng; ngày ký khác tháng không phải là nhiều kỳ.
- Các số đọc từ PDF là bản nháp để kiểm tra trước khi lưu. Đầu kỳ từ file có nút sử dụng và lý do đối chiếu; không tự áp số thiếu thành 0.
- Người dùng đã từ chối nhập chi tiết UNC/tự tạo các lần đóng từ C12: **“Không, mình sẽ ghi tiền nộp riêng.”** Không xây lại luồng nhập tiền nộp từ C12.

### Tháng hiện tại, nhắc khách và bằng chứng

- Khi có kỳ liền trước, hiện sẵn bản nháp tháng hiện tại, đầu kỳ chuyển sang tự động.
- Bản nháp chưa có phát sinh không ghi số 0 giả vào cơ sở dữ liệu. Chỉ lưu kỳ khi người dùng nhập phát sinh và xác nhận.
- Khi thêm/ghi nhận lệnh nhắc: gợi ý **phát sinh** của kỳ tương ứng; được sửa số tiền.
- Khi ghi Quá trình đóng: gợi ý **số còn phải đóng** của tháng thực nộp; được sửa theo số thực tế.
- Ghi tiền nộp cần ảnh bằng chứng. PNG/JPEG/WebP, tối đa 5 MB; upload xong mới lưu khoản đóng.
- Tiền nộp có sửa, hủy, khôi phục và lịch sử; có kiểm tra phiên bản, chống gửi lại tạo trùng.
- Theo dõi BHXH hiển thị **tất cả khách đang dùng dịch vụ BHXH**, không lọc theo người phụ trách riêng. Thuế giữ phạm vi phân công cũ.

### Danh mục cơ sở BHXH và thông tin thanh toán

Thông tin đã làm:

- Tên cơ sở, **mã cơ sở** (bắt buộc, giữ số 0 đầu), địa chỉ, một số điện thoại chính.
- Tỉnh/thành phố chọn từ danh mục; địa bàn quản lý có từng option loại và tên riêng.
- Loại địa bàn có Xã, Phường, Thị trấn; có thêm Đặc khu để hỗ trợ danh mục. Mã địa bàn 5 chữ số là tùy chọn.
- Nhiều tài khoản nhận: ngân hàng chuẩn, số tài khoản dạng chuỗi giữ số 0 đầu, tên tài khoản nhận và chi nhánh.
- Ghi chú tự do để lưu thêm số liên hệ.
- Có danh mục ngân hàng Việt Nam, snapshot 76 tổ chức ngày 24/10/2026; danh mục 34 tỉnh/thành phố, nguồn và đặc tả ghi trong `docs/bhxh-payment-directory.md`.
- Dữ liệu địa bàn được chuẩn bị cho việc tìm cơ sở theo địa chỉ/TK3 về sau. **Chưa làm tính năng tạo tờ khai TK3, chưa tự gán cơ sở theo địa chỉ.**

Mẫu thông tin gửi khách do chính người dùng yêu cầu:

```text
Mã đơn vị: [mã đơn vị]
Số tiền cần đóng: [số tiền ở lệnh nhắc]
Đóng cho kỳ: [kỳ đóng]
Cú pháp: BHXH 103 00 [mã đơn vị] [mã cơ sở BHXH] DONG BHXH [kỳ đóng]
Tên tài khoản nhận: [Tên BHXH cơ sở tiếng Việt không dấu, viết IN HOA]
Số tài khoản: [tài khoản đã chọn ở lệnh nhắc]
Ngân hàng: [ngân hàng và chi nhánh nếu có]
```

- Kỳ tháng trong cú pháp được điền dạng `MM/YYYY`.
- Mỗi cơ sở có mẫu chuyển khoản riêng, hỗ trợ biến `ma_don_vi`, `ma_co_quan`, `ky`, `thang`, `nam` trong `{{...}}`; cho sửa trước khi lưu.
- Lời nhắc lưu snapshot người nhận/tài khoản/mã/cú pháp. Đổi danh mục không viết lại các lời nhắc và lịch sử đã lưu.
- Tạo QR cục bộ bằng `qrcode` 1.5.4, không gửi thông tin khách tới dịch vụ tạo QR ngoài.
- QR có giới hạn số tiền dương tối đa 13 chữ số, số tài khoản 6–19 chữ số, nội dung tối đa 25 ký tự ASCII theo bộ mã hóa hiện có.
- Cú pháp BHXH thường dài hơn giới hạn nội dung: người dùng phải chọn rõ **QR tài khoản + số tiền**; ảnh và văn bản vẫn giữ đủ cú pháp, hướng dẫn khách dán nội dung. Không cắt cú pháp để ép vào QR.
- Tạo/copy QR không tự gửi tin cho khách, không tự xác nhận thanh toán.

## 4. Yêu cầu mới nhất: tối đa 3 mã đơn vị mỗi khách

Người dùng yêu cầu ba nhóm:

| Giá trị nội bộ | Nhãn giao diện |
| --- | --- |
| `employees` | Người lao động |
| `legal_representative` | Đại diện pháp luật |
| `foreign_workers` | Người nước ngoài |

Hai câu trả lời quan trọng đã nhận:

1. Mã BHXH cũ và dữ liệu cũ có thể thuộc nhóm khác nhau giữa các khách: **“Có thể khác nhau; giữ mã cũ chờ phân loại.”** Không mặc định toàn bộ mã cũ là người lao động.
2. Mỗi mã có công nợ C12, tiền nộp và lời nhắc riêng; khách tổng hợp từ các mã: **“Đúng, theo dõi riêng từng mã.”**

### Cấu trúc đã thực hiện trong commit `b6f8954`

- Bảng `bhxh_client_units`: định danh UUID ổn định, khách, nhóm mã, số mã, trạng thái sử dụng, ghi chú, version, người/thời điểm tạo cập nhật.
- Tối đa **3 mã đang dùng** mỗi khách; mỗi nhóm một mã đang dùng. Mã cũ **Chờ phân loại** có nhóm null và tính là một mã trong giới hạn này.
- Tạo mã mới phải chọn một trong ba nhóm. Chỉ mã cũ được có nhóm null.
- Seed mã cũ từ `clients.ins_code` hoặc từ việc khách đã có dữ liệu BHXH; gắn các kỳ C12, các lần nộp, lời nhắc BHXH và mặc định nhận tiền cũ vào UUID legacy đó.
- Không sửa số tiền, ngày, kỳ, phiên bản, bằng chứng, trạng thái, snapshot người nhận hoặc nhật ký cũ khi migration.
- Phân loại mã cũ giữ cùng UUID và toàn bộ liên kết dữ liệu.
- Thêm `unit_id` / `unit_code` vào dữ liệu sổ, tiền nộp, lời nhắc; mặc định nhận tiền có `unit_id` và khóa theo từng mã.
- Unique C12 theo `(unit_id, period_on)`; chống trùng chứng từ theo mã; lời nhắc BHXH trùng kỳ xét riêng từng mã. Thuế giữ quy tắc riêng.
- Server và helper giao diện tính chuyển kỳ, tổng tiền đã nộp và gợi ý **theo cùng mã**, không chỉ theo client/tháng.
- Một mã đóng thừa không tự bù sang nợ mã khác. Bảng khách cộng nợ dương riêng từng mã và hiển thị dòng chi tiết từng mã.
- Khi có nhiều mã, không đoán mã để tạo khoản mới. Có thể tự chọn khi chỉ có một mã đang dùng đã có số mã.
- Bản ghi đã lưu không cho chuyển khách/mã âm thầm khi sửa. Mã đã có dữ liệu không cho đổi số mã làm sai lịch sử; có thể ngừng mã cũ, giữ lịch sử rồi thêm mã được cấp mới.
- Chỉ nhân viên **phụ trách BHXH của khách** được thêm/sửa/phân loại mã, giữ ranh giới quyền sửa hồ sơ cũ. Các nhân viên đang hoạt động vẫn xem và theo dõi tiền BHXH dùng chung.
- `clients.ins_code` giữ làm nguồn cũ và chặn sửa trực tiếp; `clientDetailUpdates` không gửi cột đó nữa. Thông tin phần mềm/tài khoản đăng nhập BHXH vẫn sửa theo quyền cũ.
- Tab **Mã đơn vị** mới trong Theo dõi BHXH; My Clients có link tới chỗ quản lý tối đa 3 mã.
- C12, tiền nộp, nhắc khách có chọn/lọc mã và nhãn nhóm + số mã. Link “Nhắc khách kỳ này” và “Xem tiền đã nộp” giữ đúng ngữ cảnh mã.
- Mặc định cơ sở/tài khoản nhận lưu riêng cho từng mã. Khi đổi mã trong biểu mẫu nhắc, làm lại gợi ý tiền và cấu hình nhận tiền, tránh giữ QR/cú pháp của mã trước.
- Đọc C12 tìm mã trong mọi nhóm. Nếu một số mã được dùng lại ở mã đã ngừng và mã hiện hành, cần chọn rõ UUID/mã đích; không lấy bừa kết quả đầu tiên.

### Các file chính của bản 3 mã

| File | Vai trò |
| --- | --- |
| `supabase-bhxh-units-migration.sql` | Schema, backfill legacy, quyền, RPC mới và thay hàm xử lý theo mã |
| `src/lib/bhxhUnits.ts` | Nhóm mã, nhãn, chọn một mã duy nhất, đối chiếu mã C12 có kiểm tra mơ hồ |
| `src/lib/bhxhLedger.ts` | Kiểu dữ liệu, gợi ý tiền, xem trước số dư, bản nháp hiện tại theo mã |
| `src/pages/BhxhUnits.tsx` | Giao diện quản lý, phân loại/ngừng/khôi phục mã |
| `src/pages/InsuranceLedger.tsx` | Sổ C12, quá trình đóng, tổng khách, lọc và chọn mã |
| `src/pages/PaymentFollowups.tsx` | Nhắc theo mã, gợi ý phát sinh, snapshot thông tin nhận tiền |
| `src/components/BhxhReceiverFields.tsx` | Chọn cơ sở/tài khoản và xem trước thông tin/QR theo mã |
| `src/pages/BhxhAgencies.tsx` | Danh mục cơ sở; mặc định nhận tiền theo mã |
| `src/lib/bhxhAgencies.ts`, `src/lib/paymentFollowups.ts` | Bổ sung thông tin mã vào các kiểu dữ liệu liên quan |
| `src/pages/MyClients.tsx`, `src/lib/clientDetails.ts` | Dẫn tới quản lý mã riêng, không ghi đè cột mã đơn cũ |
| `scripts/test-bhxh-units.mjs`, `scripts/test-bhxh-units-ui.mjs` | Kiểm thử PostgreSQL/helper và kiểm thử trình duyệt cho ba mã |
| `docs/bhxh-unit-ledgers.md` | Hướng dẫn sử dụng/cài đặt và các quy tắc bảo toàn dữ liệu |

## 5. Lịch sử các mốc trong cuộc chat

| Ngày / commit | Nội dung |
| --- | --- |
| 22/10 — `c8f5509` | Theo dõi khoản đóng BHXH/thuế, nhắc khách và các trạng thái theo dõi |
| 24/10 — `0b77962` | Tách sổ BHXH C12 và quá trình đóng thực tế |
| 24/10 — `0e68c7f` | Nhận kỳ C12 từ tiêu đề thay cho ngày ký |
| 24/10 — `3e58874` | Chuẩn bị tháng hiện tại từ số dư kỳ liền trước |
| 24/10 — `3eb4128` | Toàn bộ khách BHXH dùng chung, bằng chứng hình ảnh, gợi ý số tiền |
| 24/10 — `bbfd5f8` | Giữ thao tác soạn nhắc ổn định khi refresh, tránh mở lại biểu mẫu ngoài ý muốn |
| 24/10 — `9f78fc6` | Cơ sở BHXH, ngân hàng/tỉnh/địa bàn, thông tin chuyển khoản gửi khách và QR cục bộ |
| 24/10 — `b6f8954` | Ba mã/khách, sổ và lời nhắc/tài khoản nhận riêng theo mã; đang chờ SQL và triển khai |

Các tình huống đã xử lý/đã chốt trong trao đổi:

- Ban đầu ổ H: từng không truy cập được, người dùng kết nối lại. Hiện project đã làm được và ghi log tại ổ H:.
- Có lần người dùng chạy SQL báo Success nhưng bảng/hàm C12 kiểm tra ra null. Đã hướng dẫn kiểm tra đúng dự án và chạy đúng toàn bộ migration; không suy luận Success của một câu lệnh là mọi tính năng đã có.
- File C12 09/2026 bị báo nhiều kỳ do ngày ký dưới khác kỳ ở trên; đã đổi cách nhận kỳ từ tiêu đề.
- Người dùng báo app đọc nhầm mục/số; parser hiện đọc cột CỘNG và các dòng tổng tương ứng, có cảnh báo thiếu/không thống nhất để kiểm tra.
- Người dùng đã cập nhật một khách cho 09/2026, từ đó yêu cầu mở sẵn tháng hiện tại; luồng draft không tự lưu phát sinh giả đã được làm.
- Người dùng không muốn import chi tiết UNC/tiền nộp từ C12; tiếp tục nhập riêng Quá trình đóng.
- Người dùng bổ sung mã cơ sở sau yêu cầu danh mục; mã cơ sở đã là trường quan trọng trong danh mục và cú pháp.
- Người dùng bổ sung ba loại mã sau khi tính năng QR đã làm; bản ba mã đã cập nhật xuyên suốt những chỗ dùng mã để không dùng mã cũ của khách một cách chung chung.

Tài liệu tham chiếu từng dùng trên máy cơ quan (không đảm bảo có ở máy nhà):

- PDF người dùng đưa: `D:\Bao hiem\Bao Hiem Xa Hoi\ADP-Công Ty TNHH Nguyên Liệu An Đại Phát\C12\2026\1102002738_TH2099H_2026_09_C12.pdf`.
- Ảnh báo đọc sai: `C:\Users\Admin\AppData\Local\Temp\codex-clipboard-6ee14058-84df-4883-b02b-61a22196e838.png`.
- Đường dẫn chỉ để nhận diện nguồn cũ, không yêu cầu người dùng gửi lại nếu công việc tiếp theo không cần file đó. Các bộ test đã có fixture riêng trong scripts.

## 6. Supabase, migration và triển khai còn lại

Project đang dùng: **`yzciddxfeyqmlrtlsknz`**.

SQL Editor: `https://supabase.com/dashboard/project/yzciddxfeyqmlrtlsknz/sql/new`.

Thứ tự lịch sử khi dựng một database trống:

1. Các bảng nền của app và cột hồ sơ khách cần thiết; có `supabase-client-insurance-code-migration.sql` cho cột mã cũ.
2. `supabase-payment-followups-migration.sql`.
3. `supabase-bhxh-ledger-migration.sql`.
4. `supabase-bhxh-shared-payments-migration.sql`.
5. `supabase-bhxh-agencies-migration.sql`.
6. **`supabase-bhxh-units-migration.sql` — cuối cùng.**

**Database website đã có các bước trước ở trạng thái ghi nhận của phiên cũ. Việc đang chờ là chạy duy nhất toàn bộ file mới `supabase-bhxh-units-migration.sql`, không tự chạy lại mọi file cũ trên production.** Hướng dẫn cũ trong tài liệu danh mục nói agency chạy cuối chỉ áp dụng trước khi có bản units; sau bản này units mới là migration cuối.

File units có transaction, backfill và có thể chạy lại; bộ test đã chạy lại cả trước và sau phân loại/thêm mã/ngừng/thay mã. Nó không tự chia số liệu cũ vào ba nhóm.

RPC quan trọng ở bản mới:

- `bhxh_units_portal(p_staff_id)` và `save_bhxh_unit(p_staff_id,p_request_id,p_record)`.
- `bhxh_ledger_portal` và `save_bhxh_ledger` đã được thay phần xử lý để giữ mã riêng.
- `bhxh_followup_portal` / `save_payment_followup`: BHXH theo mã, thuế giữ phạm vi cũ.
- `save_bhxh_directory`: mặc định nhận tiền theo `unit_id`.
- `bhxh_unit_balances` / `bhxh_resolve_unit` là hàm nội bộ; không cấp quyền gọi trực tiếp cho anon/authenticated.

Luồng tiếp tục triển khai:

1. Nhận xác nhận người dùng chạy **toàn bộ SQL mới** đúng dự án. Nếu lỗi, đọc lỗi thật và xử lý; không giả định người dùng đã chạy từ việc file tồn tại trên Drive.
2. Kiểm tra chỉ đọc RPC mới với hồ sơ nhân viên hợp lệ. Ledger portal trả `clients[].units`; các bản ghi cũ có `unit_id`, nhóm mã cũ null/chờ phân loại. Không ghi dữ liệu kiểm thử vào sổ khách thật.
3. Kiểm tra Git và các thay đổi ở máy nhà trước khi push. Code đang ở `main`, lịch sử mới có `b6f8954`. Nếu có commit log tài liệu thì giữ cùng lịch sử.
4. Sau khi backend đúng cấu trúc, tiếp tục quy trình push đã dùng cho dự án; không đưa giao diện phụ thuộc schema mới lên trước migration.
5. Chờ trạng thái Vercel của **đúng commit vừa push**. Phiên trước dùng commit status context `Vercel – taskmanager`; đọc tên/status thực tế GitHub trả về nếu có thay đổi.
6. Smoke website production chỉ đọc, xác nhận bản mới/tab Mã đơn vị tải được. Không tự phân loại mã cũ, tạo mã hay ghi khoản nộp cho khách thật để thử.
7. Báo lại người dùng rõ đã lên website hay còn chờ gì. Hướng dẫn phân loại mã cũ trước khi thêm đủ ba nhóm nếu cần.

Môi trường ở máy cơ quan chỉ thấy Supabase URL/anon key trong `.env`, **không có kết nối quản trị database** để tự chạy DDL từ terminal. Vì thế đã giao SQL cho người dùng chạy trong dashboard. Không ghi key/token/mật khẩu vào file bàn giao và không tự tìm cách nâng quyền.

## 7. Kiểm thử đã hoàn tất trước bàn giao

Đã chạy thành công tại máy cơ quan:

- `npm run test:bhxh`: số dư/chuyển kỳ, đứt tháng, sửa số liệu, actual payments, quyền, retry, audit, parser C12.
- `npm run test:bhxh:shared`: khách BHXH dùng chung, cách ly thuế, bằng chứng đã upload, defaults, lịch sử, gợi ý tiền.
- `npm run test:bhxh:agencies`: cài/rerun, danh mục, nhiều tài khoản, địa bàn, snapshot bất biến, stale update, QR/CRC.
- `npm run test:payment-followups`: vòng đời khoản theo dõi, phạm vi nhân viên, retry và validation.
- `npm run test:bhxh:units`: bảo toàn records và snapshot cũ; ba mã; quyền; chống trùng/đổi sai mã; số dư và thanh toán riêng; hủy/khôi phục; mặc định người nhận; thuế; helper draft và import; rerun sau phân loại/thay mã.
- `npm run test:bhxh:units:ui`: phân loại legacy giữ UUID, thêm đủ ba nhóm, lọc/sửa C12, đọc PDF của nhóm khác đúng sổ, gợi ý tiền và mặc định theo mã, giải mã ảnh QR độc lập bằng jsQR, tổng khách, desktop/mobile.
- `npm run test:payment-followups:ui`: thêm/sửa, lỗi lưu, retry mất phản hồi, nhắc/hẹn/đã đóng/mở lại, lịch sử, dashboard, mobile, thiếu migration; đã dùng backend schema mới.
- `npm run test:bhxh:agencies:ui`: CRUD/retry, hai tài khoản, địa bàn, mặc định, cú pháp, clipboard, QR giải mã được, lịch sử người nhận, mobile, thiếu migration; fixtures tạo dữ liệu cũ rồi chạy migration mới.
- `npm run test:bhxh:ui`: current draft, lưu/chuyển kỳ, thiếu đầu kỳ, manual/auto, tiền nộp, retry, correction, void/restore, history, thuế riêng, link cũ và mobile; dùng schema mới.
- `npm run build`: TypeScript + Vite pass. Có cảnh báo kích thước bundle lớn đã tồn tại; không có lỗi build.
- Oxlint phạm vi các file BHXH/helper thay đổi và `git diff --check`: sạch ở lần kiểm tra cuối. Không tuyên bố toàn bộ repo không có warning ngoài phạm vi.
- Đã xem ảnh desktop/mobile bằng công cụ xem ảnh, bố cục dùng được. Không ghi thử tài chính trên production.

Không cần lặp vô hạn toàn bộ kiểm thử nếu máy nhà không sửa code. Nếu có chỉnh logic mới/schema mới, chạy lại các kiểm thử liên quan và build.

## 8. Runtime và lưu ý khi chạy tại máy nhà

App là React/TypeScript/Vite, Supabase, không phải site của Sites plugin. Dùng repo hiện có; không dựng lại app bằng plugin Sites chỉ vì đây là website.

Lệnh cơ bản:

```powershell
npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
# Ở terminal khác khi cần kiểm thử giao diện:
$env:QA_APP_ORIGIN='http://127.0.0.1:5187'
npm run test:bhxh:units:ui
```

Các scripts QA hiện dùng dependency bên ngoài repo tại `%TEMP%/anan-recurrence-qa` qua `createRequire`. Nếu máy nhà chưa có, có thể cài trong thư mục temp/local của máy nhà:

```powershell
npm install --prefix "$env:TEMP/anan-recurrence-qa" --ignore-scripts --no-audit --no-fund @electric-sql/pglite @playwright/test jsqr
```

UI suite cần Chromium. Trên máy cơ quan đang dùng `C:\Users\Admin\AppData\Local\ms-playwright\chromium-1228\chrome-win64\chrome.exe`. Máy nhà có thể khác; cài Chromium cho runtime QA và truyền `QA_CHROMIUM_PATH` trỏ đúng executable nếu cần. Không mặc định đường dẫn máy cơ quan tồn tại ở nhà.

Môi trường cơ quan từng gặp lỗi npm ghi package trên Google Drive H:; **tránh cài lại hàng loạt `node_modules` trên Drive nếu gặp lỗi tương tự**. Đã có bản dependency đầy đủ và bản source dùng chạy Vite ở `%TEMP%/taskmanager-bhxh-dev` của cơ quan. Đây là temp **không đi theo Drive**, máy nhà tự chuẩn bị khi cần. Build từ workspace ở cơ quan đã pass ở cuối phiên.

Nếu chạy Vite bằng mirror ở ổ local, đặt working directory là mirror, copy source/config/package/.env cần thiết; không chỉ gọi executable temp trong khi cwd vẫn là H:. Đừng dùng bulk copy cả node_modules hoặc robocopy lớn gây nghẽn I/O.

Ảnh QA ở máy cơ quan: `%TEMP%/anan-recurrence-qa/bhxh-units-ui/`, `bhxh-ui/`, `bhxh-agencies-ui/`, `payment-followups-ui/`. Chúng không được đảm bảo có ở máy nhà; có thể tạo lại từ scripts.

Các script release/smoke tạm ở máy cơ quan từng có tên `bhxh-shared-release.mjs`, `bhxh-agencies-live.mjs`; **không dựa vào việc chúng có trên Drive**. Nếu cần, viết thao tác kiểm tra chỉ đọc dựa trên source, RPC hiện tại và quyền sẵn có, không nhúng thông tin truy cập vào log.

Dev server cổng 5187 do phiên làm ba mã mở đã được dừng sau kiểm thử. Không cần giữ máy cơ quan chạy để tiếp tục bằng bản bàn giao này.

## 9. Những thứ phải giữ nguyên và tránh làm nhầm

- Không tự phân loại mã cũ thành người lao động; không chia/chuyển khoản tiền thật giữa mã bằng phỏng đoán.
- Không cộng tiền nộp của các mã khác nhau để tính một sổ C12; không lấy cuối kỳ của mã khác làm đầu kỳ.
- Không nhập UNC/tiền nộp từ C12 thay người dùng; chỉ dùng số đã nộp trên file để đối chiếu.
- Không làm mất version, audit, ảnh bằng chứng, idempotency, optimistic locking hoặc thông tin người nhận lịch sử.
- Không mở rộng phạm vi thuế hoặc quyền sửa mã/hồ sơ khách khi làm tính năng BHXH dùng chung.
- Không gửi thông tin khách/tài khoản/số tiền tới dịch vụ QR ngoài và không tự nhắn khách.
- Không đổi cơ sở/tài khoản ở danh mục rồi sửa toàn bộ lời nhắc cũ cho giống danh mục mới.
- Không tự triển khai TK3 hay mở rộng giao diện thuế trong việc đang chờ này.
- Không tự push code phụ thuộc schema mới trước khi SQL tương ứng chạy thành công.
- Không in `.env`, token GitHub, service role key hoặc thông tin đăng nhập khách ra chat/log.

File/thư mục untracked đã có sẵn, không thuộc feature này, **không xóa/ghi đè**:

- `BaoCao_KetQua_Ngô_Minh_Tiến_2026-10-12.xlsx`.
- `_review_taskmanager_20261013/`.
- `scratch/`.

Git ở cơ quan có `.git/packed-refs.lock` tồn tại từ trước. Commit vẫn tạo thành công dù Git in lỗi bảo trì liên quan lock. Không tự xóa lock nếu chưa kiểm tra tiến trình đang dùng Git; không nhầm lỗi bảo trì đó với việc commit `b6f8954` thất bại.

Người dùng thích làm tiếp chủ động, không hỏi lại các lựa chọn đã chốt. Tuy nhiên chạy SQL quản trị trên dashboard đang là bước người dùng thực hiện; cần kết quả thật trước khi phát hành. Khi báo tiến độ, nói rõ phần đã lưu, phần đã test, phần đã deploy và phần còn chờ.

## 10. Việc đang dừng cụ thể

Thông báo cuối về feature đã gửi cho người dùng: bản ba mã đã chỉnh và kiểm thử, mã cũ ở Chờ phân loại; đề nghị chạy toàn bộ `supabase-bhxh-units-migration.sql` tại đúng SQL Editor rồi báo kết quả để kiểm tra/cập nhật app.

Sau đó người dùng hỏi cách tiếp tục chat ở nhà và quyết định tắt máy cơ quan, yêu cầu log này. **Chưa có câu trả lời “đã chạy SQL units” sau thông báo đó.**

Điểm tiếp tục là hoàn tất cài SQL và phát hành bản ba mã, dựa trên code đã có; không bắt đầu lại từ yêu cầu BHXH ban đầu.
