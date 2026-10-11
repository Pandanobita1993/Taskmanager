-- Bổ sung các trường về ngày tiếp nhận và mức phí dịch vụ cho khách hàng
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS intake_date DATE, -- Ngày tiếp nhận (để tính miễn phí 3 tháng đầu GPKD)
ADD COLUMN IF NOT EXISTS accounting_fee NUMERIC DEFAULT 0, -- Phí dịch vụ kế toán
ADD COLUMN IF NOT EXISTS insurance_fee NUMERIC DEFAULT 0, -- Phí dịch vụ BHXH
ADD COLUMN IF NOT EXISTS fee_effective_month TEXT; -- Tháng bắt đầu có hiệu lực thay đổi phí (VD: Tháng 11/2026)

-- Bổ sung trường nội dung thu chi tiết trong bảng tasks
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS payment_reason TEXT; -- Nội dung thu phí (Phí DV kế toán, Phí DV BHXH, Phí setup...)
