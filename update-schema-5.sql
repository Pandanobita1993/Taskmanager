-- Thêm các cột cho quy trình theo dõi hồ sơ: tiến độ, hình ảnh kết quả / chứng minh hoàn thành
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS dossier_progress TEXT, -- Tiến độ hồ sơ hiện tại (VD: Đang xử lý, Chờ duyệt, Yêu cầu bổ sung...)
ADD COLUMN IF NOT EXISTS proof_image TEXT; -- URL / base64 hình ảnh chứng minh hoàn thành hồ sơ
