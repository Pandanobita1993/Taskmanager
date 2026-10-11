-- Thêm các cột hỗ trợ phân loại công việc, hỗ trợ người khác, kết quả hoàn thành/thất bại và mã hồ sơ
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS task_category TEXT DEFAULT 'main', -- 'main' (nhiệm vụ chính / kiêm nhiệm), 'support' (hỗ trợ)
ADD COLUMN IF NOT EXISTS supported_user_id TEXT, -- ID hoặc Tên người được hỗ trợ
ADD COLUMN IF NOT EXISTS supported_user_name TEXT,
ADD COLUMN IF NOT EXISTS action_type TEXT, -- ví dụ: 'nop_ho_so', 'khac'
ADD COLUMN IF NOT EXISTS dossier_code TEXT, -- mã hồ sơ đã nộp
ADD COLUMN IF NOT EXISTS resolution_note TEXT, -- lý do / ghi chú khi hoàn thành hoặc thất bại
ADD COLUMN IF NOT EXISTS failure_reason TEXT;
