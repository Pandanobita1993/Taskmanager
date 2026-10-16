import React, { useState, useEffect } from 'react';
import { Building2, Save, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../lib/profile';
import { readCachedProfile } from '../lib/profile';
import { clientDetailUpdates } from '../lib/clientDetails';

export default function MyClients() {
  const [clients, setClients] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const current = readCachedProfile();
    setProfile(current);
    fetchClients(current);
  }, []);

  const fetchClients = async (userProfile: UserProfile | null) => {
    if (!userProfile) return;
    try {
      const { data, error } = await supabase.from('clients').select('*').is('archived_at', null).order('name');
      if (error) throw error;
      
      const formattedClients = (data || []).map((c: any) => {
        let review_person = c.review_person || '';
        let investment_person = c.investment_person || '';
        const cleanedServices: string[] = [];

        (c.services || []).forEach((s: string) => {
          if (s.startsWith('Rà soát:')) {
            review_person = s.replace('Rà soát:', '');
            cleanedServices.push('Rà soát');
          } else if (s.startsWith('Đầu tư:')) {
            investment_person = s.replace('Đầu tư:', '');
            cleanedServices.push('Đầu tư');
          } else {
            cleanedServices.push(s);
          }
        });

        return {
          ...c,
          services: Array.from(new Set(cleanedServices)),
          review_person,
          investment_person
        };
      });

      const myClients = formattedClients.filter(c => 
        c.accounting_person === userProfile.fullName || 
        c.insurance_person === userProfile.fullName ||
        c.review_person === userProfile.fullName ||
        c.investment_person === userProfile.fullName
      );
      setClients(myClients);
    } catch(err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (client: any) => {
    setSaveError('');
    setEditingClient({
      ...client,
      invoice_user: client.invoice_user || client.tax_code,
      tax_user: client.tax_user || `${client.tax_code}-ql`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient || saving) return;

    setSaving(true);
    setSaveError('');
    try {
      const updates = clientDetailUpdates(editingClient, profile?.fullName || '');
      if (!Object.keys(updates).length) throw new Error('Bạn không có thông tin có thể cập nhật cho khách hàng này.');
      const { error } = await supabase.from('clients').update(updates).eq('id', editingClient.id).select('id').single();
      if (error) throw error;
      
      alert('Lưu thông tin thành công!');
      setEditingClient(null);
      fetchClients(profile);
    } catch(err: any) {
      console.error(err);
      setSaveError(err?.message?.includes('ins_code')
        ? 'Cơ sở dữ liệu chưa có cột Mã đơn vị BHXH. Vui lòng nhờ quản trị cập nhật cơ sở dữ liệu.'
        : `Không thể lưu thông tin: ${err?.message || 'Vui lòng thử lại.'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 bg-white/60 backdrop-blur-md p-4 rounded-xl border border-white/40 shadow-sm inline-block">
        <h1 className="text-2xl font-bold text-gray-800">Khách hàng của tôi</h1>
        <p className="text-gray-600 mt-1 text-sm font-medium">Quản lý và bổ sung thông tin (Hóa đơn, Thuế, Kế toán, BHXH) cho các khách hàng bạn phụ trách.</p>
      </div>

      {editingClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Cập nhật: {editingClient.name}</h2>
              <button disabled={saving} onClick={() => setEditingClient(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              
              {profile?.fullName === editingClient.accounting_person && (
                <>
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100 space-y-4">
                    <h3 className="font-semibold text-blue-800">Trang web xuất hóa đơn</h3>
                    <div>
                      <label className="block text-sm mb-1 text-gray-700">Link trang web</label>
                      <input type="text" value={editingClient.invoice_link || ''} onChange={e => setEditingClient({...editingClient, invoice_link: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Tên tài khoản</label>
                        <input type="text" value={editingClient.invoice_user || ''} onChange={e => setEditingClient({...editingClient, invoice_user: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Mật khẩu</label>
                        <input type="text" value={editingClient.invoice_pass || ''} onChange={e => setEditingClient({...editingClient, invoice_pass: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 space-y-4">
                    <h3 className="font-semibold text-orange-800">Trang thuế điện tử</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Tên đăng nhập</label>
                        <input type="text" value={editingClient.tax_user || ''} onChange={e => setEditingClient({...editingClient, tax_user: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Mật khẩu</label>
                        <input type="text" value={editingClient.tax_pass || ''} onChange={e => setEditingClient({...editingClient, tax_pass: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-100 space-y-4">
                    <h3 className="font-semibold text-emerald-800">Cấu hình dữ liệu Kế toán</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Tên phần mềm</label>
                        <input type="text" value={editingClient.acc_software || ''} onChange={e => setEditingClient({...editingClient, acc_software: e.target.value})} placeholder="VD: MISA SME..." className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Phiên bản / Dữ liệu</label>
                        <input type="text" value={editingClient.acc_version || ''} onChange={e => setEditingClient({...editingClient, acc_version: e.target.value})} placeholder="VD: SME 2026 - R4.1" className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Tên đăng nhập</label>
                        <input type="text" value={editingClient.acc_user || ''} onChange={e => setEditingClient({...editingClient, acc_user: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700">Mật khẩu</label>
                        <input type="text" value={editingClient.acc_pass || ''} onChange={e => setEditingClient({...editingClient, acc_pass: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                      </div>
                    </div>
                  </div>

                  {/* Thiết lập mức phí dịch vụ và hiệu lực */}
                  <div className="bg-teal-50/60 p-4 rounded-lg border border-teal-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-teal-900">Thiết lập mức phí dịch vụ & Theo dõi công nợ</h3>
                      {editingClient.intake_date && (
                        <span className="text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded font-medium">
                          Ngày tiếp nhận: {new Date(editingClient.intake_date).toLocaleDateString('vi-VN')} (Miễn phí 3 tháng đầu)
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-1 text-gray-700 font-medium">Phí DV Kế toán (VNĐ/tháng)</label>
                        <input 
                          type="number" 
                          value={editingClient.accounting_fee ?? ''} 
                          onChange={e => setEditingClient({...editingClient, accounting_fee: Number(e.target.value)})} 
                          placeholder="VD: 1500000" 
                          className="w-full px-3 py-2 border rounded-md" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700 font-medium">Phí DV BHXH (VNĐ/tháng)</label>
                        <input 
                          type="number" 
                          value={editingClient.insurance_fee ?? ''} 
                          onChange={e => setEditingClient({...editingClient, insurance_fee: Number(e.target.value)})} 
                          placeholder="VD: 500000" 
                          className="w-full px-3 py-2 border rounded-md" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1 text-gray-700 font-medium">Tháng bắt đầu có hiệu lực</label>
                        <input 
                          type="text" 
                          value={editingClient.fee_effective_month || ''} 
                          onChange={e => setEditingClient({...editingClient, fee_effective_month: e.target.value})} 
                          placeholder="VD: Tháng 11/2026" 
                          className="w-full px-3 py-2 border rounded-md" 
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {profile?.fullName === editingClient.insurance_person && (
                <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-100 space-y-4">
                  <h3 className="font-semibold text-purple-800">Thông tin phần mềm BHXH</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1 text-gray-700">Mã đơn vị BHXH</label>
                      <input type="text" value={editingClient.ins_code || ''} onChange={e => setEditingClient({...editingClient, ins_code: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-gray-700">Tên phần mềm</label>
                      <input type="text" value={editingClient.ins_software || ''} onChange={e => setEditingClient({...editingClient, ins_software: e.target.value})} placeholder="VD: vBHXH..." className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-gray-700">Tên đăng nhập</label>
                      <input type="text" value={editingClient.ins_user || ''} onChange={e => setEditingClient({...editingClient, ins_user: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                    <div>
                      <label className="block text-sm mb-1 text-gray-700">Mật khẩu</label>
                      <input type="text" value={editingClient.ins_pass || ''} onChange={e => setEditingClient({...editingClient, ins_pass: e.target.value})} className="w-full px-3 py-2 border rounded-md" />
                    </div>
                  </div>
                </div>
              )}

              {saveError && <p role="alert" className="text-sm text-red-700 bg-red-50 rounded-lg p-3">{saveError}</p>}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" disabled={saving} onClick={() => setEditingClient(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300">Hủy</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50"><Save size={18}/> {saving ? 'Đang lưu...' : 'Lưu thông tin'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
            Bạn chưa được phân công phụ trách khách hàng nào.
          </div>
        ) : (
          clients.map(c => (
            <div key={c.id} className="bg-white/70 backdrop-blur-md p-5 rounded-xl shadow-sm border border-white/50 hover:shadow-md transition">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 pr-2">
                  <h3 className="font-bold text-gray-800 line-clamp-1" title={c.name}>{c.name}</h3>
                  <p className="text-sm text-gray-500">MST: {c.tax_code}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {c.services?.map((s: string) => (
                      <span 
                        key={s} 
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          s === 'Kế toán' ? 'bg-blue-100 text-blue-800' :
                          s === 'BHXH' ? 'bg-emerald-100 text-emerald-800' :
                          s === 'Rà soát' ? 'bg-indigo-100 text-indigo-800' :
                          s === 'Đầu tư' ? 'bg-rose-100 text-rose-800' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 transition text-xs font-semibold shrink-0">
                  Cập nhật
                </button>
              </div>
              
              <div className="space-y-2 text-sm">
                {profile?.fullName === c.accounting_person && (
                  <>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-500">PM Kế toán</span>
                      <span className="font-medium text-gray-700">{c.acc_software || '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-500">Thuế ĐT</span>
                      <span className="font-medium text-gray-700">{c.tax_user ? 'Đã có' : '-'}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-500">Hóa đơn</span>
                      <span className="font-medium text-gray-700">{c.invoice_link ? 'Đã có' : '-'}</span>
                    </div>
                    {c.accounting_fee > 0 && (
                      <div className="flex justify-between border-b pb-1 text-xs text-emerald-700">
                        <span>Phí kế toán:</span>
                        <span className="font-bold">{c.accounting_fee.toLocaleString('vi-VN')} đ/tháng</span>
                      </div>
                    )}
                    {c.insurance_fee > 0 && (
                      <div className="flex justify-between border-b pb-1 text-xs text-purple-700">
                        <span>Phí BHXH:</span>
                        <span className="font-bold">{c.insurance_fee.toLocaleString('vi-VN')} đ/tháng</span>
                      </div>
                    )}
                  </>
                )}
                {profile?.fullName === c.insurance_person && (
                  <>
                    <div className="flex justify-between border-b pb-1">
                      <span className="text-gray-500">Mã ĐV BHXH</span>
                      <span className="font-medium text-gray-700">{c.ins_code || '-'}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-gray-500">PM BHXH</span>
                      <span className="font-medium text-gray-700">{c.ins_software || '-'}</span>
                    </div>
                  </>
                )}
                {profile?.fullName === c.review_person && (
                  <div className="p-2 bg-indigo-50 border border-indigo-100 rounded text-xs text-indigo-800 font-semibold flex items-center justify-between">
                    <span>Phụ trách: Rà soát sổ sách</span>
                    <span className="text-[11px] bg-indigo-200/60 px-1.5 py-0.5 rounded">Rà soát</span>
                  </div>
                )}
                {profile?.fullName === c.investment_person && (
                  <div className="p-2 bg-rose-50 border border-rose-100 rounded text-xs text-rose-800 font-semibold flex items-center justify-between">
                    <span>Phụ trách: Đăng ký đầu tư (IRC)</span>
                    <span className="text-[11px] bg-rose-200/60 px-1.5 py-0.5 rounded">Đầu tư</span>
                  </div>
                )}

                {/* Khối thông tin nhân sự phụ trách các mảng khác của khách hàng */}
                <div className="mt-3 pt-2.5 border-t border-gray-100 text-xs space-y-1">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Nhân sự phụ trách các mảng:
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-[12px] bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">• Kế toán:</span>
                      <span className={`font-medium ${c.accounting_person === profile?.fullName ? 'text-blue-700 font-bold' : c.accounting_person ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                        {c.accounting_person || 'Chưa gán'} {c.accounting_person === profile?.fullName ? '(Bạn)' : ''}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">• BHXH:</span>
                      <span className={`font-medium ${c.insurance_person === profile?.fullName ? 'text-emerald-700 font-bold' : c.insurance_person ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                        {c.insurance_person || 'Chưa gán'} {c.insurance_person === profile?.fullName ? '(Bạn)' : ''}
                      </span>
                    </div>

                    {c.services?.includes('Rà soát') && (
                      <div className="flex justify-between items-center">
                        <span className="text-indigo-600">• Rà soát:</span>
                        <span className={`font-medium ${c.review_person === profile?.fullName ? 'text-indigo-700 font-bold' : c.review_person ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                          {c.review_person || 'Chưa gán'} {c.review_person === profile?.fullName ? '(Bạn)' : ''}
                        </span>
                      </div>
                    )}

                    {c.services?.includes('Đầu tư') && (
                      <div className="flex justify-between items-center">
                        <span className="text-rose-600">• Đầu tư:</span>
                        <span className={`font-medium ${c.investment_person === profile?.fullName ? 'text-rose-700 font-bold' : c.investment_person ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                          {c.investment_person || 'Chưa gán'} {c.investment_person === profile?.fullName ? '(Bạn)' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
