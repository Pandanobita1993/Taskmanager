# Quy Trình Chuẩn Hóa Xây Dựng Linh Vật Chấm Công (Mascot Framework)

Tài liệu này chốt bộ khung 6 bước chuẩn để thiết kế, làm hoạt ảnh và tích hợp linh vật mới vào hệ thống TaskFlow (`src/lib/mascot.ts`, `src/components/mascot/`).

## Bước 1: Hồ sơ nhân vật (Character Bible)
Mỗi linh vật mới cần định nghĩa rõ:
- **Mã & Tên loài (`MascotType`):** ví dụ `capybara`, `cat`, `owl`.
- **Bảng màu cố định:** màu lông chính, màu bụng/mõm, màu má hồng, màu viền (khóa `color-scheme: only light` + xuất SVG qua `<img src="data:image/svg+xml,...">` để không bị chế độ ép tối của trình duyệt làm biến màu).
- **Vật đặc trưng (Signature):** Capybara có quả quýt trên đầu; Mèo có chuông cổ/cuộn len; Cú có cặp kính/quyển sổ.
- **Giọng thoại (Tone):** phong cách xưng hô và câu cửa miệng phù hợp với dân kế toán – BHXH – thuế.

## Bước 2: Bộ 7 Trạng thái biểu cảm (`MascotExpression`)
Mọi linh vật đều hỗ trợ đủ 7 trạng thái dùng chung:
1. `happy` – Vừa mở app / chào buổi sáng.
2. `working` – Đang trong ca làm việc (kèm đạo cụ làm việc như sổ sách/máy tính).
3. `chill` – Hết việc chờ trong ngày, ngồi thư giãn.
4. `alert` – Có việc **GẤP** (mồ hôi, giật mình, huy hiệu `!`).
5. `celebrating` – Hoàn thành công việc / vừa điểm danh (mắt `^ ^`, nhảy múa, pháo hoa).
6. `coffee` – Tâm trạng cần cà phê/trà sữa (cầm ly, khói bốc lên).
7. `sleeping` – Đã hết ca sạc pin (nhắm mắt, chữ `Zzz` bay lên).

## Bước 3: 3 Tầng Chuyển động & Tương tác (Độ sống động)
1. **Tầng 1 – Chuyển động từng bộ phận (SVG SMIL + CSS Keyframes):**
   - Chớp mắt tự nhiên theo chu kỳ (3–4 giây/lần).
   - Tai khẽ vẫy, phụ kiện trên đầu nhún lệch nhịp.
   - Đạo cụ theo trạng thái (sổ sách khi `working`, ly cà phê khi `coffee`).
2. **Tầng 2 – Hành động ngẫu nhiên khi rảnh (Idle Behavior):**
   - Sau mỗi 25–35 giây rảnh, linh vật tự nháy mắt hoặc đổi lời thoại khích lệ nhẹ nhàng.
3. **Tầng 3 – Tương tác chạm / Xoa đầu (Interactive Petting):**
   - Cho phép nhân viên bấm xoa đầu / tương tác nhanh để thả tim `🧡`, đổi biểu cảm vui vẻ và nhận lời thoại bất ngờ.

## Bước 4: Điểm neo Phụ kiện (`Anchor Points`)
Quy ước `viewBox="0 0 120 120"` làm khung tọa độ chuẩn:
- **Vùng đầu (`y: 8..35`):** nón bảo hộ, vương miện, vật đặc trưng.
- **Vùng trán/mắt (`y: 40..56`):** băng đô, kính kế toán.
- **Vùng tay (`x: 75..100, y: 68..98`):** ly cà phê, sổ tay, loa nhỏ.

## Bước 5: Ngân hàng Lời thoại theo Ngữ cảnh (Dialogue Bank)
Tách lời thoại theo từng loài linh vật cho các tình huống:
- Chưa điểm danh đầu ngày
- Vừa điểm danh vào ca
- Đang có việc gấp
- Hoàn thành công việc (`+5 🍊`)
- Sạch việc trong ngày
- Hết ca sạc pin
- Phản ứng khi được xoa đầu / nựng

## Bước 6: Đăng ký vào Hệ thống (`MascotRegistry`)
- Mở rộng `MascotType` trong `src/lib/mascot.ts`.
- Tạo component avatar tương ứng (ví dụ `CatAvatar.tsx`, `OwlAvatar.tsx`) và điều phối qua một wrapper chung.
- Cho phép mỗi nhân viên tự chọn linh vật yêu thích trong phần Cài đặt / Hồ sơ cá nhân.
