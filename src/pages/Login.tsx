import { useState } from 'react';
import { BarChart3, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Vui lòng nhập họ tên đúng với danh sách nhân sự');
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('Đã tạo tài khoản. Vui lòng kiểm tra email để xác nhận rồi đăng nhập.');
          setMode('login');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đăng nhập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 grid place-items-center p-4">
      <section className="w-full max-w-md bg-white rounded-2xl border border-blue-100 shadow-xl p-7">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white grid place-items-center"><BarChart3 /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">TaskFlow</h1>
            <p className="text-sm text-gray-500">Quản lý công việc nội bộ</p>
          </div>
        </div>

        <h2 className="text-lg font-bold text-gray-800">{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</h2>
        <p className="text-sm text-gray-500 mt-1 mb-5">
          {mode === 'login' ? 'Dùng tài khoản công ty để tiếp tục.' : 'Họ tên phải trùng với nhân sự đã được tạo trong hệ thống.'}
        </p>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'register' && (
            <label className="block text-sm font-medium text-gray-700">
              Họ và tên
              <span className="mt-1 flex items-center gap-2 border rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
                <UserRound size={17} className="text-gray-400" />
                <input className="w-full py-2.5 outline-none" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" required />
              </span>
            </label>
          )}
          <label className="block text-sm font-medium text-gray-700">
            Email
            <span className="mt-1 flex items-center gap-2 border rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
              <Mail size={17} className="text-gray-400" />
              <input className="w-full py-2.5 outline-none" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </span>
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Mật khẩu
            <span className="mt-1 flex items-center gap-2 border rounded-lg px-3 focus-within:ring-2 focus-within:ring-blue-500">
              <LockKeyhole size={17} className="text-gray-400" />
              <input className="w-full py-2.5 outline-none" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
            </span>
          </label>

          {error && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {message && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">{message}</p>}

          <button disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold transition">
            {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setMessage(''); }} className="w-full mt-4 text-sm text-blue-700 hover:underline">
          {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </section>
    </main>
  );
}
