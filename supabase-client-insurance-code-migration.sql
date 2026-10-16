-- Bổ sung mã đơn vị BHXH cho biểu mẫu cập nhật khách hàng.
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS ins_code TEXT;
