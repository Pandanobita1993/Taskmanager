import React from 'react';
import { Lock } from 'lucide-react';

interface AdminAuthProps {
  password: string;
  setPassword: (val: string) => void;
  error: string;
  onLogin: (e: React.FormEvent) => void;
}

export const AdminAuth: React.FC<AdminAuthProps> = ({
  password,
  setPassword,
  error,
  onLogin
}) => {
  return (
    <div className="flex h-full items-center justify-center bg-gray-50/50">
      <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Quyền truy cập quản lý</h1>
        <p className="text-gray-500 mb-6">Vui lòng nhập mật khẩu quản trị để tiếp tục</p>
        <form onSubmit={onLogin}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition mb-4 text-center text-lg tracking-widest"
            placeholder="••••••••"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};
