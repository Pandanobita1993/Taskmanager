import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Thiếu cấu hình Supabase URL hoặc Anon Key trong biến môi trường!');
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
);
