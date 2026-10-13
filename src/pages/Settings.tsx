import { useEffect, useState } from 'react';
import { AlertCircle, FolderOpen, HardDrive, Lock, Save, Unlock, UserRound } from 'lucide-react';
import { chooseReportsDirectory, getSavedDirectoryName } from '../lib/fileStorage';
import { cacheProfile, readCachedProfile } from '../lib/profile';
import type { UserProfile } from '../lib/profile';
import { supabase } from '../lib/supabase';

interface StaffMember {
  id: string;
  name: string;
  department?: string;
  roles?: string[];
}

const BACKGROUNDS = [
  { id: 'bg-gray-50', label: 'Xám', className: 'bg-gray-50' },
  { id: 'bg-gradient-to-r from-cyan-100 to-blue-200', label: 'Xanh dịu', className: 'bg-gradient-to-r from-cyan-100 to-blue-200' },
  { id: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80)', label: 'Bãi biển', className: 'bg-cover bg-center' },
  { id: 'url(https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1400&q=80)', label: 'Thiên nhiên', className: 'bg-cover bg-center' },
];

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>(readCachedProfile());
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(() => readCachedProfile().isSetupComplete);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('app_users').select('id, name, department, roles').eq('is_active', true).order('name'),
      getSavedDirectoryName(),
    ]).then(([usersResult, directory]) => {
      if (usersResult.error) throw usersResult.error;
      setUsers(usersResult.data || []);
      if (directory) setProfile((current) => ({ ...current, storagePath: directory }));
    }).catch((error) => {
      console.error(error);
      setMessage('Không thể tải danh sách nhân viên.');
    }).finally(() => setLoading(false));
  }, []);

  const selectUser = (userId: string) => {
    if (isLocked) return;
    const user = users.find((item) => item.id === userId);
    if (!user) return;
    setProfile((current) => ({
      ...current,
      id: user.id,
      fullName: user.name,
      department: user.department || 'Kế toán',
      additionalRoles: user.roles || [],
    }));
  };

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault();
    setUnlockError('');
    const { data, error } = await supabase.rpc('verify_admin_password', { candidate: adminPassword });
    if (error || data !== true) {
      setUnlockError('Mật khẩu quản trị viên không chính xác.');
      return;
    }
    setIsLocked(false);
    setShowUnlockModal(false);
    setAdminPassword('');
  };

  const chooseDirectory = async () => {
    try {
      const directory = await chooseReportsDirectory();
      setProfile((current) => ({ ...current, storagePath: directory }));
      setMessage(`Đã chọn thư mục ${directory}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(error instanceof Error ? error.message : 'Không thể chọn thư mục');
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!profile.id || !profile.fullName) return;
    const updated = { ...profile, isSetupComplete: true };
    cacheProfile(updated);
    setProfile(updated);
    setIsLocked(true);
    setMessage('Đã lưu thiết lập và khóa nhân sự trên thiết bị này.');
  };

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Thiết lập tài khoản cá nhân</h1>
        <p className="text-gray-500 mt-1">Chọn nhân viên sử dụng thiết bị này để hệ thống lọc công việc và báo cáo.</p>
      </div>

      <form onSubmit={save} className="bg-white/90 p-5 sm:p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2 mb-4">
            <h2 className="text-lg font-semibold text-blue-700 flex items-center gap-2"><UserRound size={19} /> Định danh thiết bị</h2>
            {isLocked && (
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><Lock size={13} /> Đã cố định</span>
                <button type="button" onClick={() => setShowUnlockModal(true)} className="text-xs text-blue-700 underline">Thay đổi nhân viên</button>
              </div>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="text-sm font-medium text-gray-700">
              Họ và tên nhân viên
              {isLocked ? (
                <div className="mt-2 px-4 py-3 rounded-lg bg-gray-50 border font-semibold text-gray-900">{profile.fullName}</div>
              ) : (
                <select className="mt-2 w-full px-4 py-2.5 border rounded-lg bg-white" value={profile.id || ''} onChange={(event) => selectUser(event.target.value)} required disabled={loading}>
                  <option value="">{loading ? 'Đang tải...' : '-- Chọn tên của bạn --'}</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                </select>
              )}
            </label>
            <div className="text-sm font-medium text-gray-700">
              Nghiệp vụ chính
              <div className="mt-2 px-4 py-3 rounded-lg bg-gray-50 border text-gray-700">{profile.department}</div>
            </div>
          </div>
          {!isLocked && <p className="text-xs text-amber-700 mt-3">Sau khi lưu, nhân sự sẽ được cố định trên thiết bị. Cần mật khẩu quản trị để thay đổi.</p>}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4">Nghiệp vụ kiêm nhiệm</h2>
          <div className="flex flex-wrap gap-2">
            {profile.additionalRoles.length ? profile.additionalRoles.map((role) => <span key={role} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm">{role}</span>) : <span className="text-sm text-gray-400 italic">Không có</span>}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4 flex items-center gap-2"><HardDrive size={19} /> Thư mục báo cáo</h2>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-gray-700 mb-3">Nếu chưa chọn, báo cáo sẽ được tải xuống thư mục Downloads của trình duyệt.</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 bg-white border rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700">{profile.storagePath || 'Chưa chọn thư mục'}</div>
              <button type="button" onClick={chooseDirectory} className="px-4 py-2.5 bg-white border rounded-lg hover:bg-gray-50 inline-flex items-center justify-center gap-2 text-sm font-semibold"><FolderOpen size={17} className="text-amber-600" /> Chọn thư mục</button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4">Giao diện</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BACKGROUNDS.map((background) => (
              <label key={background.id} className="cursor-pointer">
                <div className={`h-20 rounded-lg border-2 ${profile.background === background.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-gray-200'} ${background.className}`} style={background.id.startsWith('url(') ? { backgroundImage: background.id } : undefined} />
                <span className="mt-2 flex items-center gap-2 text-sm"><input type="radio" name="background" checked={profile.background === background.id} onChange={() => setProfile((current) => ({ ...current, background: background.id }))} /> {background.label}</span>
              </label>
            ))}
          </div>
        </section>

        {message && <p role="status" className="text-sm bg-blue-50 text-blue-800 border border-blue-200 rounded-lg p-3">{message}</p>}

        <div className="flex justify-end border-t pt-5">
          <button type="submit" disabled={isLocked || !profile.id} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg inline-flex items-center gap-2 font-semibold"><Save size={18} /> Lưu thiết lập</button>
        </div>
      </form>

      {showUnlockModal && (
        <div className="fixed inset-0 z-50 bg-black/45 grid place-items-center p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4"><Unlock className="text-amber-600" /><div><h3 className="font-bold">Mở khóa thiết bị</h3><p className="text-xs text-gray-500">Nhập mật khẩu quản trị để đổi nhân sự.</p></div></div>
            <form onSubmit={unlock} className="space-y-4">
              <input type="password" value={adminPassword} onChange={(event) => { setAdminPassword(event.target.value); setUnlockError(''); }} className="w-full px-3 py-2 border rounded-lg" placeholder="Mật khẩu quản trị" autoFocus required />
              {unlockError && <p role="alert" className="text-xs text-red-700 flex gap-1"><AlertCircle size={14} /> {unlockError}</p>}
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowUnlockModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Hủy</button><button className="px-4 py-2 bg-blue-600 text-white rounded-lg">Mở khóa</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
