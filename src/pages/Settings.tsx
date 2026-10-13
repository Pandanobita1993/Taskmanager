import { useEffect, useState } from 'react';
import { FolderOpen, HardDrive, Save, ShieldCheck, UserRound } from 'lucide-react';
import { chooseReportsDirectory, getSavedDirectoryName } from '../lib/fileStorage';
import { cacheProfile, defaultProfile, loadCurrentProfile } from '../lib/profile';
import type { UserProfile } from '../lib/profile';

export { defaultProfile } from '../lib/profile';
export type { UserProfile } from '../lib/profile';

const BACKGROUNDS = [
  { id: 'bg-gray-50', label: 'Xám', className: 'bg-gray-50' },
  { id: 'bg-gradient-to-r from-cyan-100 to-blue-200', label: 'Xanh dịu', className: 'bg-gradient-to-r from-cyan-100 to-blue-200' },
  { id: 'url(https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80)', label: 'Bãi biển', className: 'bg-cover bg-center' },
  { id: 'url(https://images.unsplash.com/photo-1518098268026-4e89f1a2cd8e?auto=format&fit=crop&w=1400&q=80)', label: 'Thiên nhiên', className: 'bg-cover bg-center' },
];

export default function Settings() {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([loadCurrentProfile(), getSavedDirectoryName()])
      .then(([current, directory]) => setProfile({ ...current, storagePath: directory || current.storagePath }))
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Không thể tải hồ sơ'))
      .finally(() => setLoading(false));
  }, []);

  const chooseDirectory = async () => {
    try {
      const directory = await chooseReportsDirectory();
      setProfile((current) => ({ ...current, storagePath: directory }));
      setMessage(`Đã chọn thư mục ${directory}. Các báo cáo mới sẽ được lưu trực tiếp tại đây.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage(error instanceof Error ? error.message : 'Không thể chọn thư mục');
    }
  };

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    cacheProfile({ ...profile, isSetupComplete: true });
    setMessage('Đã lưu tùy chỉnh trên thiết bị này.');
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải hồ sơ...</div>;

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Tài khoản và thiết bị</h1>
        <p className="text-gray-500 mt-1">Danh tính lấy từ tài khoản đã đăng nhập; giao diện và thư mục báo cáo được lưu trên thiết bị.</p>
      </div>

      <form onSubmit={save} className="bg-white/90 p-5 sm:p-8 rounded-xl shadow-sm border border-gray-100 space-y-8">
        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4 flex items-center gap-2"><UserRound size={19} /> Danh tính</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-50 border">
              <p className="text-xs text-gray-500">Họ và tên</p>
              <p className="font-semibold text-gray-900 mt-1">{profile.fullName}</p>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border">
              <p className="text-xs text-gray-500">Bộ phận</p>
              <p className="font-semibold text-gray-900 mt-1">{profile.department}</p>
            </div>
          </div>
          {profile.isAdmin && <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1"><ShieldCheck size={14} /> Quản trị viên</p>}
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4">Nghiệp vụ được phân công</h2>
          <div className="flex flex-wrap gap-2">
            {profile.additionalRoles.length ? profile.additionalRoles.map((role) => <span key={role} className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-sm">{role}</span>) : <span className="text-sm text-gray-400 italic">Chưa có nghiệp vụ kiêm nhiệm</span>}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-blue-700 border-b pb-2 mb-4 flex items-center gap-2"><HardDrive size={19} /> Thư mục báo cáo</h2>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
            <p className="text-sm text-gray-700 mb-3">Trình duyệt sẽ xin quyền ghi file khi xuất báo cáo. Nếu trình duyệt không hỗ trợ, file vẫn được tải xuống thư mục Downloads.</p>
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
          <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg inline-flex items-center gap-2 font-semibold"><Save size={18} /> Lưu tùy chỉnh</button>
        </div>
      </form>
    </div>
  );
}
