import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, PlusCircle, BarChart3, Settings as SettingsIcon, Menu, Bell, Shield, Building2, XCircle, Calendar, History, Search, FileText, Check, X, Camera, Eye, AlertCircle, FileCheck, Upload } from 'lucide-react';
import SettingsPage, { defaultProfile } from './pages/Settings';
import type { UserProfile } from './pages/Settings';
import AdminPage from './pages/Admin';

import { supabase } from './lib/supabase';

function Dashboard() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modal xử lý công việc (Hoàn thành / Thất bại)
  const [activeTask, setActiveTask] = useState<any | null>(null);
  const [resolveStatus, setResolveStatus] = useState<'completed' | 'failed'>('completed');
  const [resolutionNote, setResolutionNote] = useState('');
  const [dossierCode, setDossierCode] = useState('');
  const [proofImage, setProofImage] = useState<string>('');

  // Modal hỏi làm lại hồ sơ thất bại
  const [failedRetryTask, setFailedRetryTask] = useState<any | null>(null);

  // Modal cập nhật tiến độ hồ sơ cần kiểm tra
  const [dossierModalTask, setDossierModalTask] = useState<any | null>(null);
  const [progressInput, setProgressInput] = useState('');
  const [showDossierDrawer, setShowDossierDrawer] = useState(false);

  // Bộ lọc lịch sử
  const [historyTab, setHistoryTab] = useState<'all' | 'by_client' | 'by_date'>('all');
  const [filterClient, setFilterClient] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('task_manager_profile');
    let p: UserProfile | null = null;
    if (saved) {
      try {
        p = JSON.parse(saved);
        setProfile(p);
      } catch (e) {
        console.error(e);
      }
    }
    fetchTasks(p);
  }, []);

  const fetchTasks = async (currentProfile?: UserProfile | null) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, clients(name, tax_code)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTasks(data || []);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Lọc chỉ lấy công việc của người dùng hiện tại (hoặc do người dùng này tạo/phụ trách)
  const myTasks = tasks.filter(t => {
    if (!profile) return true;
    return t.user_id === profile.id || t.user_id === profile.fullName;
  });

  // Kiểm tra công việc có phải là hồ sơ theo dõi tiến độ (có mã hồ sơ hoặc thuộc nộp hồ sơ GPKD/BHXH)
  const isDossierTask = (t: any) => {
    return Boolean(t.dossier_code && t.dossier_code.trim()) || t.action_type === 'nop_ho_so';
  };

  // Công việc thông thường đang xử lý của cá nhân (không phải hồ sơ đang theo dõi mã)
  const pendingTasks = myTasks.filter(t => (t.status === 'received' || t.status === 'in_progress') && !isDossierTask(t));
  // Hồ sơ đã nộp cần kiểm tra / theo dõi tiến độ của cá nhân (có mã hồ sơ hoặc thuộc nop_ho_so)
  const pendingDossiers = myTasks.filter(t => (t.status === 'received' || t.status === 'in_progress') && isDossierTask(t));

  const urgentTasks = myTasks.filter(t => t.is_urgent && (t.status === 'received' || t.status === 'in_progress'));
  const completedTasks = myTasks.filter(t => t.status === 'completed');
  const failedTasks = myTasks.filter(t => t.status === 'failed');

  const openResolveModal = (task: any, status: 'completed' | 'failed') => {
    setActiveTask(task);
    setResolveStatus(status);
    setResolutionNote('');
    setDossierCode(task.dossier_code || '');
    setProofImage(task.proof_image || '');
  };

  const [proofFileName, setProofFileName] = useState<string>('');

  const generateProofFileName = (task: any) => {
    const today = new Date().toISOString().split('T')[0];
    const tax = task?.clients?.tax_code || 'MST';
    const month = task?.action_type === 'nop_ho_so' ? (task.dossier_code || 'HS') : 'ChungTu';
    return `${today}-${tax}-${month}.png`;
  };

  const captureScreenForTask = async (task: any) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: false
      });
      const track = stream.getVideoTracks()[0];
      const imageCapture = new (window as any).ImageCapture(track);
      const bitmap = await imageCapture.grabFrame();
      track.stop();

      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const context = canvas.getContext('2d');
      context?.drawImage(bitmap, 0, 0, bitmap.width, bitmap.height);
      const dataUrl = canvas.toDataURL('image/png');

      const fileName = generateProofFileName(task);
      setProofImage(dataUrl);
      setProofFileName(fileName);
    } catch (err) {
      console.warn("Hủy chụp màn hình", err);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, task: any) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofImage(reader.result as string);
        const fileName = generateProofFileName(task);
        setProofFileName(fileName);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResolveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTask) return;

    if (!resolutionNote.trim()) {
      alert("Vui lòng điền ghi chú / lý do!");
      return;
    }

    const isDossier = isDossierTask(activeTask);

    if (resolveStatus === 'completed' && isDossier) {
      if (!dossierCode.trim()) {
        alert("Công việc này thuộc loại 'Hồ sơ', bạn bắt buộc phải nhập Mã hồ sơ!");
        return;
      }
      if (!proofImage) {
        alert("Chỉ khi hồ sơ hoàn toàn hoàn thành thì mới được đánh dấu vào và bắt buộc phải chụp kèm hình ảnh chứng minh!");
        return;
      }
    }

    try {
      const updates: any = {
        status: resolveStatus,
        resolution_note: resolutionNote,
        completed_at: new Date().toISOString()
      };

      if (dossierCode.trim()) {
        updates.dossier_code = dossierCode;
      }

      if (proofImage) {
        updates.proof_image = proofImage;
        if (proofFileName) {
          updates.proof_file = proofFileName;
        }
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', activeTask.id);
      if (error) throw error;

      const finishedTask = { ...activeTask, resolution_note: resolutionNote };

      setActiveTask(null);
      setDossierModalTask(null);
      fetchTasks();

      // Nếu hồ sơ thất bại, hiển thị hộp thoại hỏi người dùng có muốn tiếp nhận lại để bổ sung/nộp lại không
      if (resolveStatus === 'failed' && isDossier) {
        setFailedRetryTask(finishedTask);
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi cập nhật trạng thái công việc');
    }
  };

  const handleUpdateDossierProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossierModalTask) return;
    try {
      const { error } = await supabase.from('tasks').update({
        dossier_progress: progressInput
      }).eq('id', dossierModalTask.id);
      if (error) throw error;
      alert("Đã cập nhật tiến độ hồ sơ!");
      setDossierModalTask(null);
      fetchTasks();
    } catch (err) {
      console.error(err);
      alert("Lỗi cập nhật tiến độ hồ sơ");
    }
  };

  // Danh sách công việc đã xử lý (Lịch sử: hoàn thành hoặc thất bại của cá nhân)
  const historyTasks = myTasks.filter(t => t.status === 'completed' || t.status === 'failed');

  // Lọc lịch sử
  const filteredHistory = historyTasks.filter(t => {
    if (filterClient && !t.clients?.name?.toLowerCase().includes(filterClient.toLowerCase())) {
      return false;
    }
    if (filterDate) {
      const taskDate = (t.completed_at || t.created_at || '').split('T')[0];
      if (taskDate !== filterDate) return false;
    }
    return true;
  });

  // Danh sách tên công ty duy nhất trong lịch sử
  const uniqueClients = Array.from(new Set(historyTasks.map(t => t.clients?.name).filter(Boolean)));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Bảng điều khiển</h1>
          <p className="text-sm text-gray-500 mt-0.5">Theo dõi công việc đang thực hiện và tra cứu lịch sử</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Nút Hồ sơ cần kiểm tra ở góc trên bên phải */}
          <button 
            onClick={() => setShowDossierDrawer(true)}
            className={`relative px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition shadow-sm ${
              pendingDossiers.length > 0
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-2 border-amber-500 shadow-amber-200 ring-2 ring-amber-400/40'
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
            }`}
          >
            <FileCheck size={18} className={pendingDossiers.length > 0 ? 'text-amber-700 animate-bounce' : 'text-gray-500'} />
            <span>Hồ sơ cần kiểm tra</span>
            {pendingDossiers.length > 0 ? (
              <span className="bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow-xs animate-pulse">
                {pendingDossiers.length}
              </span>
            ) : (
              <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded-full font-medium">
                0
              </span>
            )}
          </button>

          <Link to="/new-task" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-sm text-sm font-medium">
            <PlusCircle size={18} />
            Tiếp nhận công việc mới
          </Link>
        </div>
      </div>

      {/* Thống kê nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/60 flex items-center gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl"><Clock size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Đang xử lý</p>
            <p className="text-2xl font-bold text-gray-800">{pendingTasks.length}</p>
          </div>
        </div>
        
        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/60 flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-xl"><Bell size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Việc gấp</p>
            <p className="text-2xl font-bold text-gray-800">{urgentTasks.length}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/60 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Hoàn thành</p>
            <p className="text-2xl font-bold text-gray-800">{completedTasks.length}</p>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/60 flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><XCircle size={22} /></div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Thất bại</p>
            <p className="text-2xl font-bold text-gray-800">{failedTasks.length}</p>
          </div>
        </div>
      </div>

      {/* 1. KHU VỰC CÔNG VIỆC CẦN XỬ LÝ */}
      <div className="bg-white/75 backdrop-blur-md rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <div className="p-4 border-b border-gray-100/70 flex justify-between items-center bg-white/40">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Công việc đang thực hiện ({pendingTasks.length})
          </h2>
        </div>
        <div>
          <ul className="divide-y divide-gray-100/70">
            {pendingTasks.map((task) => (
              <li key={task.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white/60 transition">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.is_urgent && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">GẤP</span>}
                    {task.task_category === 'support' && (
                      <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Hỗ trợ: {task.supported_user_name || 'Đồng nghiệp'}
                      </span>
                    )}
                    {task.action_type === 'ke_toan' && (
                      <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Kế toán
                      </span>
                    )}
                    {task.action_type === 'bhxh' && (
                      <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        BHXH
                      </span>
                    )}
                    {(task.action_type === 'nop_ho_so' || task.action_type === 'setup') && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Setup / GPKD
                      </span>
                    )}
                    {task.action_type === 'ra_soat' && (
                      <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Rà soát
                      </span>
                    )}
                    {task.action_type === 'dau_tu' && (
                      <span className="bg-rose-100 text-rose-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        Đầu tư
                      </span>
                    )}
                    <span className="font-semibold text-gray-800 text-base">{task.clients?.name}</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{task.content}</p>
                  <p className="text-xs text-gray-500">
                    Người liên hệ: <strong>{task.contact_person}</strong> 
                    {task.info_pending && <span className="text-orange-600 ml-2">• Chờ bổ sung: {task.info_pending}</span>}
                    {task.notes && <span className="ml-2">• Ghi chú: {task.notes}</span>}
                  </p>
                </div>
                
                {/* 2 Nút lựa chọn: Hoàn thành hoặc Thất bại */}
                <div className="flex items-center gap-2 shrink-0">
                  <button 
                    onClick={() => openResolveModal(task, 'completed')}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Check size={14} /> Hoàn thành
                  </button>
                  <button 
                    onClick={() => openResolveModal(task, 'failed')}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition"
                  >
                    <X size={14} /> Thất bại
                  </button>
                </div>
              </li>
            ))}
            {pendingTasks.length === 0 && (
              <li className="p-8 text-center text-gray-500 font-medium text-sm">
                Không có công việc nào đang chờ xử lý.
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* 2. KHU VỰC LỊCH SỬ CÔNG VIỆC (Xem theo công ty hoặc theo ngày) */}
      <div className="bg-white/75 backdrop-blur-md rounded-xl shadow-sm border border-white/60 overflow-hidden">
        <div className="p-4 border-b border-gray-100/70 flex flex-col md:flex-row justify-between md:items-center gap-3 bg-white/40">
          <div className="flex items-center gap-2">
            <History size={18} className="text-purple-600" />
            <h2 className="text-base font-bold text-gray-800">Lịch sử công việc ({filteredHistory.length})</h2>
          </div>

          {/* Bộ lọc linh hoạt */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Lọc theo công ty */}
            <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs">
              <Building2 size={14} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Lọc theo khách hàng..." 
                value={filterClient} 
                onChange={e => setFilterClient(e.target.value)} 
                className="outline-none bg-transparent w-36 text-gray-700"
              />
              {filterClient && <button onClick={() => setFilterClient('')} className="text-gray-400 hover:text-gray-600">×</button>}
            </div>

            {/* Lọc theo ngày */}
            <div className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs">
              <Calendar size={14} className="text-gray-400" />
              <input 
                type="date" 
                value={filterDate} 
                onChange={e => setFilterDate(e.target.value)} 
                className="outline-none bg-transparent text-gray-700"
              />
              {filterDate && <button onClick={() => setFilterDate('')} className="text-gray-400 hover:text-gray-600">×</button>}
            </div>

            {(filterClient || filterDate) && (
              <button 
                onClick={() => { setFilterClient(''); setFilterDate(''); }}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Xóa lọc
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-200/50 text-gray-600 text-xs uppercase font-semibold">
                <th className="py-3 px-4">Ngày xử lý</th>
                <th className="py-3 px-4">Khách hàng</th>
                <th className="py-3 px-4">Nội dung</th>
                <th className="py-3 px-4">Tính chất</th>
                <th className="py-3 px-4">Kết quả</th>
                <th className="py-3 px-4">Mã hồ sơ</th>
                <th className="py-3 px-4">Ảnh kết quả</th>
                <th className="py-3 px-4">Lý do / Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/70">
              {filteredHistory.map((t) => (
                <tr key={t.id} className="hover:bg-white/60 transition">
                  <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                    {t.completed_at ? new Date(t.completed_at).toLocaleDateString('vi-VN') : new Date(t.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="py-3 px-4 font-medium text-gray-800 whitespace-nowrap">
                    {t.clients?.name || '-'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">
                    {t.content}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {t.task_category === 'support' ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full font-medium">
                        Hỗ trợ {t.supported_user_name}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                        Nhiệm vụ chính
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {t.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <Check size={12} /> Hoàn thành
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full text-xs font-semibold">
                        <X size={12} /> Thất bại
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono font-semibold text-blue-700 whitespace-nowrap">
                    {t.dossier_code || '-'}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {t.proof_image ? (
                      <button 
                        onClick={() => {
                          const w = window.open("");
                          w?.document.write(`<title>Ảnh chứng minh</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;height:100vh;"><img src="${t.proof_image}" style="max-width:95%;max-height:95%;box-shadow:0 0 20px rgba(0,0,0,0.5);border-radius:8px;"/></body>`);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-1 rounded border border-blue-200 font-medium"
                      >
                        <Eye size={12} /> Xem ảnh
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate" title={t.resolution_note || ''}>
                    {t.resolution_note || '-'}
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400 text-sm">
                    {historyTasks.length === 0 ? 'Chưa có công việc nào được hoàn thành hoặc thất bại.' : 'Không tìm thấy công việc phù hợp với bộ lọc.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* POPUP MODAL HOÀN THÀNH / THẤT BÀI */}
      {activeTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                {resolveStatus === 'completed' ? (
                  <><CheckCircle2 size={20} className="text-emerald-600" /> Xác nhận Hoàn thành</>
                ) : (
                  <><XCircle size={20} className="text-rose-600" /> Xác nhận Thất bại</>
                )}
              </h3>
              <button onClick={() => setActiveTask(null)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1 text-gray-600 border border-gray-200">
              <p>Khách hàng: <strong className="text-gray-800">{activeTask.clients?.name}</strong></p>
              <p>Nội dung: <strong className="text-gray-800">{activeTask.content}</strong></p>
              {isDossierTask(activeTask) && (
                <p className="text-amber-800 font-semibold">★ Đây là Hồ sơ theo dõi tiến độ {activeTask.dossier_code ? `(Mã HS: ${activeTask.dossier_code})` : ''}</p>
              )}
            </div>

            <form onSubmit={handleResolveTask} className="space-y-4">
              {/* Nếu là Hồ sơ và Hoàn thành thì hiển thị / cập nhật mã hồ sơ */}
              {resolveStatus === 'completed' && isDossierTask(activeTask) && (
                <div>
                  <label className="block text-sm font-semibold text-blue-800 mb-1">
                    Mã hồ sơ điện tử *
                  </label>
                  <input 
                    required 
                    type="text" 
                    value={dossierCode} 
                    onChange={e => setDossierCode(e.target.value)} 
                    placeholder="Nhập mã biên nhận / mã hồ sơ điện tử..." 
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              )}

              {/* Chụp kèm hình ảnh chứng minh nếu là Hồ sơ và Hoàn thành */}
              {resolveStatus === 'completed' && isDossierTask(activeTask) && (
                <div className="bg-amber-50/70 p-3.5 rounded-lg border border-amber-200 space-y-2">
                  <label className="block text-sm font-semibold text-amber-900 flex items-center gap-1.5">
                    <Camera size={16} className="text-amber-700" />
                    Chụp / Tải ảnh chứng minh kết quả hồ sơ *
                  </label>
                  <p className="text-xs text-amber-700">
                    Chỉ khi hồ sơ hoàn toàn hoàn thành thì mới được đánh dấu vào và bắt buộc chụp kèm hình ảnh kết quả/biên lai thành công.
                  </p>

                  <div 
                    onPaste={(e) => {
                      const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image/'));
                      if (item) {
                        const file = item.getAsFile();
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProofImage(reader.result as string);
                            const fileName = generateProofFileName(activeTask);
                            setProofFileName(fileName);
                          };
                          reader.readAsDataURL(file);
                        }
                      }
                    }}
                    tabIndex={0}
                    className="border border-amber-300 rounded-lg p-3 bg-white flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <div className="text-center mb-2">
                      <p className="text-sm font-bold text-gray-800">
                        📋 Nhấn <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 rounded font-mono text-xs text-gray-800">Ctrl + V</kbd> để dán ảnh chứng minh
                      </p>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        (Copy ảnh hoặc chụp bằng phím tắt <kbd className="px-1 py-0.2 bg-gray-100 border rounded text-[10px]">Win + Shift + S</kbd> rồi nhấn Ctrl + V)
                      </p>
                    </div>

                    <label className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition mb-1">
                      <Upload size={14} />
                      Hoặc chọn file ảnh từ máy
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={e => handleImageUpload(e, activeTask)} 
                        className="hidden"
                      />
                    </label>

                    {proofImage && (
                      <div className="mt-3 border rounded-md p-1 bg-gray-50 flex flex-col items-center">
                        <p className="text-[11px] font-mono font-bold text-amber-800 mb-1">
                          Tên file: {proofFileName}
                        </p>
                        <img src={proofImage} alt="Hình ảnh chứng minh" className="object-contain max-h-36 rounded border" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {resolveStatus === 'completed' 
                    ? 'Ghi chú kết quả hoàn thành *' 
                    : (isDossierTask(activeTask) ? 'Lý do hồ sơ thất bại / Cần bổ sung chỉnh sửa *' : 'Lý do công việc thất bại *')}
                </label>
                <textarea 
                  required 
                  rows={3} 
                  value={resolutionNote} 
                  onChange={e => setResolutionNote(e.target.value)} 
                  placeholder={resolveStatus === 'completed' 
                    ? 'Ghi rõ chi tiết kết quả đã hoàn thành...' 
                    : (isDossierTask(activeTask) 
                        ? 'Ghi rõ nguyên nhân bị từ chối / lý do cần bổ sung chỉnh sửa hồ sơ...' 
                        : 'Ghi rõ nguyên nhân thất bại / bị từ chối / trục trặc...')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveTask(null)} 
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium shadow-sm ${
                    resolveStatus === 'completed' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Xác nhận lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP / DRAWER: CÁC HỒ SƠ CẦN KIỂM TRA */}
      {showDossierDrawer && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-amber-500 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileCheck size={22} />
                <div>
                  <h3 className="font-bold text-base">Các hồ sơ cần kiểm tra & theo dõi ({pendingDossiers.length})</h3>
                  <p className="text-xs text-amber-100">Cập nhật tiến độ hồ sơ cho đến khi hoàn thành có ảnh chứng minh</p>
                </div>
              </div>
              <button onClick={() => setShowDossierDrawer(false)} className="text-white hover:bg-amber-600 p-1 rounded-full text-xl font-bold">×</button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {pendingDossiers.map(d => (
                <div key={d.id} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/70 hover:border-amber-400 transition space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                        Mã HS: {d.dossier_code || 'Chưa gắn mã'}
                      </span>
                      <h4 className="font-bold text-gray-800 mt-1">{d.clients?.name}</h4>
                      <p className="text-xs text-gray-600">{d.content}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  {/* Tiến độ hiện tại */}
                  <div className="p-2.5 bg-white rounded-lg border border-amber-100 text-xs flex justify-between items-center">
                    <div>
                      <span className="text-gray-500">Tiến độ hồ sơ: </span>
                      <strong className="text-amber-800 font-semibold">{d.dossier_progress || 'Chưa cập nhật tiến độ (Đang xử lý)'}</strong>
                    </div>
                    <button 
                      onClick={() => { setDossierModalTask(d); setProgressInput(d.dossier_progress || ''); }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline ml-2"
                    >
                      Cập nhật tiến độ
                    </button>
                  </div>

                  {/* Nút hành động hoàn thành/thất bại */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-amber-100/60">
                    <button 
                      onClick={() => { setShowDossierDrawer(false); openResolveModal(d, 'failed'); }}
                      className="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-xs font-medium hover:bg-rose-100 flex items-center gap-1"
                    >
                      <X size={13} /> Thất bại
                    </button>
                    <button 
                      onClick={() => { setShowDossierDrawer(false); openResolveModal(d, 'completed'); }}
                      className="px-3 py-1 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 flex items-center gap-1 shadow-xs"
                    >
                      <Check size={13} /> Hoàn thành (Cần ảnh)
                    </button>
                  </div>
                </div>
              ))}

              {pendingDossiers.length === 0 && (
                <div className="py-12 text-center text-gray-400 text-sm">
                  <FileCheck size={36} className="mx-auto text-gray-300 mb-2" />
                  Hiện không có hồ sơ nào đang chờ kiểm tra!
                </div>
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t flex justify-end">
              <button 
                onClick={() => setShowDossierDrawer(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP CẬP NHẬT TIẾN ĐỘ HỒ SƠ */}
      {dossierModalTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-gray-800 text-sm">Cập nhật tiến độ hồ sơ</h3>
              <button onClick={() => setDossierModalTask(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border">
              <p>Khách hàng: <strong>{dossierModalTask.clients?.name}</strong></p>
              <p>Mã hồ sơ: <span className="font-mono text-blue-700 font-bold">{dossierModalTask.dossier_code || 'Chưa có'}</span></p>
            </div>

            <form onSubmit={handleUpdateDossierProgress} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nội dung tiến độ mới *
                </label>
                <textarea 
                  required 
                  rows={2} 
                  value={progressInput} 
                  onChange={e => setProgressInput(e.target.value)} 
                  placeholder="VD: Đã nộp lên Cổng DVC, Chờ chuyên viên thẩm định, Bổ sung giấy phép..." 
                  className="w-full px-3 py-2 border rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button 
                  type="button" 
                  onClick={() => setDossierModalTask(null)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700"
                >
                  Lưu tiến độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HỎI TIẾP NHẬN LẠI KHI HỒ SƠ THẤT BẠI */}
      {failedRetryTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 border border-rose-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-full">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Hồ sơ chưa đạt / Thất bại</h3>
                <p className="text-xs text-gray-500">Đã ghi nhận lý do vào lịch sử hồ sơ</p>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 text-xs space-y-1.5 text-gray-700">
              <p>Khách hàng: <strong className="text-gray-900">{failedRetryTask.clients?.name}</strong></p>
              <p>Mã HS cũ: <span className="font-mono text-blue-700 font-bold">{failedRetryTask.dossier_code || 'Không có'}</span></p>
              <p className="text-rose-800 font-medium pt-1 border-t border-rose-200/60">
                Lý do thất bại / Cần bổ sung:
              </p>
              <p className="italic text-rose-900 bg-white p-2 rounded border border-rose-200">
                "{failedRetryTask.resolution_note}"
              </p>
            </div>

            <div className="text-sm text-gray-800 font-semibold">
              Bạn có muốn thực hiện lại hồ sơ này không?
            </div>
            <p className="text-xs text-gray-500">
              Nếu chọn <strong>Có</strong>, hệ thống sẽ tự động mở giao diện tiếp nhận công việc mới, giữ nguyên các thông tin cũ của khách hàng và tự động điền lý do thất bại vào ô Ghi chú để dễ dàng theo dõi bổ sung.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setFailedRetryTask(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition"
              >
                Không, đóng lại
              </button>
              <button
                type="button"
                onClick={() => {
                  const retryObj = {
                    client_id: failedRetryTask.client_id,
                    content: failedRetryTask.content,
                    contact_person: failedRetryTask.contact_person,
                    task_category: failedRetryTask.task_category || 'main',
                    supported_user_id: failedRetryTask.supported_user_id,
                    action_type: failedRetryTask.action_type,
                    info_provided: failedRetryTask.info_provided || '',
                    info_pending: failedRetryTask.info_pending || '',
                    is_urgent: failedRetryTask.is_urgent || false,
                    dossier_code: '', // Mã hồ sơ mới sẽ được cấp sau khi nộp lại
                    notes: failedRetryTask.resolution_note 
                      ? `Lý do nộp/thực hiện lại: ${failedRetryTask.resolution_note}`
                      : 'Thực hiện nộp lại hồ sơ'
                  };
                  setFailedRetryTask(null);
                  navigate('/new-task', { state: { retryTask: retryObj } });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
              >
                <Check size={16} /> Có, tiếp nhận lại ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);
  const location = useLocation();
  const navigate = useNavigate();

  const loadProfile = () => {
    const saved = localStorage.getItem('task_manager_profile');
    const isExempt = location.pathname === '/settings' || location.pathname === '/admin';
    if (saved) {
      try {
        const p = JSON.parse(saved);
        setProfile(p);
        if (!p.isSetupComplete && !isExempt) {
          navigate('/settings');
        }
      } catch (e) {
        console.error(e);
      }
    } else if (!isExempt) {
      navigate('/settings');
    }
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener('storage', loadProfile);
    return () => window.removeEventListener('storage', loadProfile);
  }, [location.pathname]);

  const navLinkClass = (path: string) => 
    `flex items-center gap-2 px-3 py-2 rounded-md font-medium transition ${
      location.pathname === path 
        ? 'bg-blue-50 text-blue-700' 
        : 'text-gray-600 hover:bg-gray-50'
    }`;

  const isCustomBg = profile.background?.startsWith('url(');
  const bgClass = isCustomBg ? 'bg-contain bg-no-repeat bg-center' : (profile.background || 'bg-gray-50');
  const bgStyle = isCustomBg ? { backgroundImage: profile.background, backgroundColor: '#f3f4f6' } : {};

  return (
    <div className={`flex h-screen font-sans transition-colors ${bgClass}`} style={bgStyle}>
      <aside className="w-[140px] bg-white/65 backdrop-blur-md border-r border-gray-200/50 flex flex-col hidden md:flex shadow-xl">
        <div className="p-2 border-b border-gray-200/50">
          <h2 className="text-base font-bold text-blue-600 flex items-center gap-1 justify-center">
            <BarChart3 size={16} />
            TaskFlow
          </h2>
        </div>
        <nav className="flex-1 p-2 flex flex-col gap-1 text-[13px]">
          <Link to="/" className={navLinkClass('/')}>
            <Clock size={16} />
            Bảng điều khiển
          </Link>
          <Link to="/reports" className={navLinkClass('/reports')}>
            <BarChart3 size={16} />
            Xuất báo cáo
          </Link>
          <Link to="/my-clients" className={navLinkClass('/my-clients')}>
            <Building2 size={16} />
            Khách hàng
          </Link>
          
          <div className="mt-auto flex flex-col gap-1 border-t border-gray-100/50 pt-2">
            <Link to="/admin" className={navLinkClass('/admin')}>
              <Shield size={16} />
              Quản lý
            </Link>
            <Link to="/settings" className={navLinkClass('/settings')}>
              <SettingsIcon size={16} />
              Cài đặt
            </Link>
          </div>
        </nav>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-white/15">
        <header className="bg-white/55 backdrop-blur-md border-b border-gray-200/50 py-2 px-4 flex items-center justify-between md:justify-end shadow-sm">
          <button className="md:hidden text-gray-600">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3">
            {profile.isSetupComplete && (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/70 border border-gray-200/80 rounded-md text-[11px] text-gray-600 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span className="font-medium text-gray-500">Lưu trữ:</span>
                <span className="font-mono font-medium text-blue-700 max-w-[150px] truncate" title={profile.storagePath || 'D:\\Taskmanager'}>
                  {profile.storagePath || 'D:\\Taskmanager'}
                </span>
              </div>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-[13px] font-medium text-gray-800 leading-tight flex items-center justify-end gap-1">
                {profile.fullName || 'Người dùng'}
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">{profile.department}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase text-sm shadow-2xs">
              {profile.fullName ? profile.fullName.charAt(0) : 'U'}
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}

import NewTask from './pages/NewTask';
import Reports from './pages/Reports';
import MyClients from './pages/MyClients';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-task" element={<NewTask />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/my-clients" element={<MyClients />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
