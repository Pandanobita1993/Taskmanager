-- Bảng: clients (Khách hàng)
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tax_code TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    services TEXT[] DEFAULT '{}',
    accounting_person TEXT,
    insurance_person TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng: tasks (Công việc)
CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL, -- 'normal' or 'payment'
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    user_id TEXT, -- Lưu tên hoặc ID nhân viên tạo
    contact_person TEXT,
    content TEXT,
    info_provided TEXT,
    info_pending TEXT,
    notes TEXT,
    is_urgent BOOLEAN DEFAULT FALSE,
    paid_months TEXT[], -- Cho loại payment
    proof_file TEXT, -- Cho loại payment
    status TEXT DEFAULT 'received', -- 'received', 'processing', 'completed'
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng: app_users (Nhân sự)
CREATE TABLE public.app_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT, -- 'Kế toán' hoặc 'BHXH'
    roles TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bảng: report_settings (Cấu hình báo cáo)
CREATE TABLE public.report_settings (
    id INT PRIMARY KEY DEFAULT 1, -- Chỉ dùng 1 dòng
    header_title TEXT,
    company_name TEXT,
    address TEXT,
    office TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thiết lập RLS. Không tạo policy công khai ở schema nền.
-- Chạy supabase-security-migration.sql để tạo policy theo người dùng và vai trò.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;
