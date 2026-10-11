import React, { useState, useEffect } from 'react';
import { Save, Lock, Unlock, FolderOpen, AlertCircle, HardDrive } from 'lucide-react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id?: string;
  fullName: string;
  department: string;
  additionalRoles: string[];
  isSetupComplete: boolean;
  background?: string;
  storagePath?: string;
}

export const defaultProfile: UserProfile = {
  fullName: '',
  department: 'Kế toán',
  additionalRoles: [],
  isSetupComplete: false,
  background: 'bg-gray-50',
  storagePath: 'D:\\Taskmanager',
};

const ADDITIONAL_ROLES_OPTIONS = [
  { id: 'gpkd', label: 'Hồ sơ GPKD' },
  { id: 'dt', label: 'Giấy chứng nhận đầu tư' },
  { id: 'khac', label: 'Khác (công việc vụn vặt)' }
];

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [isSaved, setIsSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');

  useEffect(() => {
    fetchUsers();
    const saved = localStorage.getItem('task_manager_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (!parsed.additionalRoles) parsed.additionalRoles = [];
        if (!parsed.storagePath) parsed.storagePath = 'D:\\Taskmanager';
        setProfile(parsed);
        if (parsed.isSetupComplete && parsed.fullName) {
          setIsLocked(true);
        }
      } catch (e) {
        console.error("Lỗi đọc dữ liệu người dùng", e);
      }
    }
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('app_users').select('*').order('name');
      if (error) throw error;
      setUsers(data || []);
    } catch (err) {
      console.error("Lỗi tải danh sách nhân viên:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (isLocked) return;
    const selectedId = e.target.value;
    const user = users.find(u => u.id === selectedId);
    
    if (user) {
      setProfile(prev => ({
        ...prev,
        id: user.id,
        fullName: user.name,
        department: user.department || 'Kế toán',
        additionalRoles: user.roles || [],
      }));
      setIsSaved(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
    setIsSaved(false);
  };

  const handlePickDirectory = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const handle = await (window as any).showDirectoryPicker();
        if (handle && handle.name) {
          setProfile(prev => ({
            ...prev,
            storagePath: `Thư mục đã chọn: [${handle.name}]`
          }));
          setIsSaved(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err);
        }
      }
    } else {
      const customPath = prompt("Trình duyệt không hỗ trợ chọn thư mục trực tiếp qua hộp thoại. Vui lòng nhập đường dẫn thư mục lưu trữ (ví dụ: D:\\Taskmanager hoặc C:\\Taskmanager):", profile.storagePath || 'D:\\Taskmanager');
      if (customPath && customPath.trim()) {
        setProfile(prev => ({ ...prev, storagePath: customPath.trim() }));
        setIsSaved(false);
      }
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'admin123') {
      setIsLocked(false);
      setShowUnlockModal(false);
      setAdminPassword('');
      setUnlockError('');
    } else {
      setUnlockError('Mật khẩu quản trị viên không chính xác!');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile.fullName) return;
    const updatedProfile = { 
      ...profile, 
      isSetupComplete: true,
      storagePath: profile.storagePath || 'D:\\Taskmanager'
    };
    localStorage.setItem('task_manager_profile', JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
    setIsLocked(true);
    setIsSaved(true);
    
    // Báo hiệu cập nhật profile
    setTimeout(() => {
      window.dispatchEvent(new Event('storage'));
    }, 300);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Thiết lập tài khoản cá nhân</h1>
        <p className="text-gray-500 mt-1">Vui lòng cập nhật thông tin cá nhân của bạn để hệ thống định danh trong các công việc và báo cáo.</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
        
        {/* Thông tin cá nhân */}
        <div>
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-blue-700">Định danh máy tính & Người dùng</h2>
            {isLocked && (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Lock size={13} />
                  Đã cố định trên máy này
                </span>
                <button
                  type="button"
                  onClick={() => setShowUnlockModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 underline font-medium cursor-pointer"
                >
                  Thay đổi người dùng
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Họ và tên nhân viên *</label>
              {loading ? (
                <div className="px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500">Đang tải danh sách...</div>
              ) : isLocked ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
                  <span className="font-semibold text-gray-800">{profile.fullName}</span>
                  <span className="text-xs text-gray-500 bg-gray-200/80 px-2 py-0.5 rounded">Cố định thiết bị</span>
                </div>
              ) : users.length === 0 ? (
                <div className="p-4 bg-orange-50 border border-orange-200 rounded-md">
                  <p className="text-orange-700 text-sm mb-2">Chưa có danh sách nhân viên. Vui lòng thiết lập danh sách trong trang Quản trị trước.</p>
                  <a href="/admin" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Đến trang Quản trị</a>
                </div>
              ) : (
                <select
                  name="id"
                  required
                  value={profile.id || ''}
                  onChange={handleUserSelect}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                >
                  <option value="" disabled>-- Chọn tên của bạn --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              )}
              {isLocked ? (
                <p className="text-xs text-gray-400 mt-1">Máy tính này đã khóa dữ liệu cho bạn, không bị lẫn việc của người khác.</p>
              ) : (
                <p className="text-xs text-amber-600 mt-1">Sau khi lưu lần đầu, tên sẽ được cố định trên máy tính này.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nghiệp vụ chính</label>
              <div className="px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600">
                {profile.department} (Admin thiết lập)
              </div>
            </div>
          </div>
        </div>

        {/* Thiết lập thư mục lưu trữ dữ liệu */}
        <div>
          <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2 flex items-center gap-2">
            <HardDrive size={19} />
            Thư mục lưu trữ dữ liệu & Báo cáo
          </h2>
          <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl space-y-3">
            <p className="text-sm text-gray-700">
              Mặc định ứng dụng sẽ ưu tiên lưu trữ chứng từ, hình ảnh và báo cáo tại ổ <strong className="text-blue-700">D:\Taskmanager</strong>.
              Nếu máy của bạn không có ổ D, bạn có thể tự chọn thư mục khác (ví dụ trên ổ C: hoặc ổ bất kỳ).
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <input
                type="text"
                name="storagePath"
                value={profile.storagePath || 'D:\\Taskmanager'}
                onChange={handleChange}
                placeholder="Ví dụ: D:\Taskmanager hoặc C:\Taskmanager"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white font-mono text-sm"
              />
              <button
                type="button"
                onClick={handlePickDirectory}
                className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-md flex items-center justify-center gap-2 text-sm font-medium transition shadow-xs"
              >
                <FolderOpen size={16} className="text-amber-500" />
                Chọn thư mục khác
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Đường dẫn lưu hiện tại: <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 text-blue-700 font-semibold">{profile.storagePath || 'D:\\Taskmanager'}</code></span>
            </div>
          </div>
        </div>

        {/* Kiêm nhiệm */}
        <div>
          <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Nghiệp vụ kiêm nhiệm thêm</h2>
          <p className="text-sm text-gray-500 mb-4">Các mảng công việc bạn được Admin phân công hỗ trợ thêm:</p>
          <div className="flex flex-wrap gap-2">
            {profile.additionalRoles.length === 0 ? (
              <span className="text-gray-400 italic">Không có</span>
            ) : (
              profile.additionalRoles.map(roleId => {
                const roleDef = ADDITIONAL_ROLES_OPTIONS.find(r => r.id === roleId);
                return (
                  <span key={roleId} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-100">
                    {roleDef?.label || roleId}
                  </span>
                );
              })
            )}
          </div>
        </div>

        {/* Tùy chỉnh giao diện */}
        <div>
          <h2 className="text-lg font-semibold text-blue-700 mb-4 border-b pb-2">Tùy chỉnh giao diện</h2>
          <p className="text-sm text-gray-500 mb-4">Chọn màu hoặc hình nền cho ứng dụng của bạn:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { id: 'bg-gray-50', label: 'Xám (Mặc định)', class: 'bg-gray-50', url: '' },
              { id: 'bg-gradient-to-r from-cyan-100 to-blue-200', label: 'Gradient', class: 'bg-gradient-to-r from-cyan-100 to-blue-200', url: '' },
              { id: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80)', label: 'Bãi biển', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80)' },
              { id: 'url(https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1000&q=80)', label: 'Thiên nhiên', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1000&q=80)' },
              { id: 'url(https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=80)', label: 'Phong cảnh', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=1000&q=80)' },
              { id: 'url(https://images.unsplash.com/photo-1497250681560-ef16bc4aab74?auto=format&fit=crop&w=1000&q=80)', label: 'Bình minh', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1497250681560-ef16bc4aab74?auto=format&fit=crop&w=1000&q=80)' },
              { id: 'url(https://images.unsplash.com/photo-1470071131384-001b85755b36?auto=format&fit=crop&w=1000&q=80)', label: 'Rừng xanh', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1470071131384-001b85755b36?auto=format&fit=crop&w=1000&q=80)' },
              { id: 'url(https://images.unsplash.com/photo-1506744626753-143b665654d1?auto=format&fit=crop&w=1000&q=80)', label: 'Cổ điển', class: 'bg-cover bg-center', url: 'url(https://images.unsplash.com/photo-1506744626753-143b665654d1?auto=format&fit=crop&w=1000&q=80)' },
            ].map(bg => (
              <label key={bg.id} className="cursor-pointer group">
                <div 
                  className={`h-20 rounded-md border-2 mb-2 transition-all ${profile.background === bg.id ? 'border-blue-600 shadow-md scale-105' : 'border-gray-200 group-hover:border-blue-300'} ${bg.class}`}
                  style={bg.url ? { backgroundImage: bg.url } : {}}
                ></div>
                <div className="flex items-center gap-2">
                  <input type="radio" name="background" value={bg.id} checked={profile.background === bg.id} onChange={handleChange} className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">{bg.label}</span>
                </div>
              </label>
            ))}
            
            <label className="cursor-pointer group">
              <div className="h-20 rounded-md border-2 border-dashed border-gray-300 mb-2 flex items-center justify-center bg-gray-50 group-hover:border-blue-300 transition-all">
                <span className="text-gray-500 text-sm font-medium">+ Tải ảnh lên</span>
              </div>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const base64 = event.target?.result as string;
                      // Lưu class chứa base64
                      const customBg = `url(${base64})`;
                      setProfile(prev => ({ ...prev, background: customBg }));
                      setIsSaved(false);
                    };
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              <div className="flex items-center gap-2">
                <input type="radio" name="background" readOnly checked={profile.background?.startsWith('url(data:image')} className="w-4 h-4 text-blue-600" />
                <span className="text-sm text-gray-700">Ảnh tự chọn</span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-4 border-t border-gray-100">
          {isSaved && <span className="text-green-600 font-medium">Đã lưu thông tin thành công!</span>}
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2.5 rounded-md flex items-center gap-2 hover:bg-blue-700 transition font-medium"
          >
            <Save size={20} />
            Lưu thiết lập
          </button>
        </div>
      </form>

      {/* Modal mở khóa đổi nhân sự (yêu cầu mật khẩu Admin) */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Unlock size={22} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-base">Mở khóa thay đổi nhân sự</h3>
                <p className="text-xs text-gray-500">Yêu cầu quyền Quản trị viên để đổi tên trên máy này</p>
              </div>
            </div>

            <form onSubmit={handleUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu quản trị (Mặc định: admin123)</label>
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={adminPassword}
                  onChange={(e) => {
                    setAdminPassword(e.target.value);
                    setUnlockError('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
                {unlockError && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle size={12} />
                    {unlockError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnlockModal(false);
                    setAdminPassword('');
                    setUnlockError('');
                  }}
                  className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition shadow-xs"
                >
                  Xác nhận mở khóa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
