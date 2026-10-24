import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import { paymentFollowupUrgency } from '../lib/paymentFollowups';
import type { FollowupPortal } from '../lib/paymentFollowups';

export function PaymentFollowupReminder() {
  const [portal, setPortal] = useState<FollowupPortal | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let fetching = false;
    const load = async () => {
      const profile = readCachedProfile();
      if (!profile.id || fetching || document.hidden) return;
      fetching = true;
      try {
        const results = await Promise.allSettled([
          supabase.rpc('payment_followup_portal', { p_staff_id: profile.id }),
          supabase.rpc('bhxh_followup_portal', { p_staff_id: profile.id }),
        ]);
        if (!active) return;
        const [tax, bhxh] = results.map(result => result.status === 'fulfilled' ? result.value : null);
        if (!tax || !bhxh || tax.error || bhxh.error) { setPortal(null); setFailed(true); }
        else {
          setPortal({ ...tax.data, records: [...tax.data.records.filter((row: { kind: string }) => row.kind !== 'bhxh'), ...bhxh.data.records] });
          setFailed(false);
        }
      } catch { if (active) { setPortal(null); setFailed(true); } }
      finally { fetching = false; }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60000);
    window.addEventListener('focus', load);
    document.addEventListener('visibilitychange', load);
    window.addEventListener('taskflow-payment-followups-changed', load);
    window.addEventListener('taskflow-profile-changed', load);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener('focus', load); document.removeEventListener('visibilitychange', load); window.removeEventListener('taskflow-payment-followups-changed', load); window.removeEventListener('taskflow-profile-changed', load); };
  }, []);
  if (!failed && !portal) return null;
  return <div className="grid sm:grid-cols-2 gap-3">{(['bhxh', 'tax'] as const).map(scope => {
    const records = (portal?.records || []).filter(row => (scope === 'bhxh' ? row.kind === 'bhxh' : row.kind !== 'bhxh') && row.status !== 'paid' && row.status !== 'cancelled');
    const attention = portal ? records.filter(row => paymentFollowupUrgency(row, portal.today)).length : 0;
    const overdue = portal ? records.filter(row => row.due_on < portal.today).length : 0;
    const label = scope === 'bhxh' ? 'BHXH' : 'Thuế';
    const url = scope === 'bhxh' ? '/insurance?tab=reminders' : '/tax-followups';
    return <Link key={scope} to={`${url}${attention ? `${url.includes('?') ? '&' : '?'}filter=attention` : ''}`} className={`flex items-start gap-3 rounded-xl p-4 border text-sm ${attention ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-gray-200 text-gray-700'}`}><BellRing size={20} className="shrink-0 mt-0.5" /><div><p className="font-semibold">{label}{attention ? ` · ${attention} khoản cần kiểm tra / nhắc khách` : ''}</p><p className="text-xs mt-1">{failed ? 'Chưa tải được nhắc đóng. Mở sổ theo dõi để kiểm tra.' : `${records.length} khoản còn chờ đóng · ${overdue} khoản quá hạn.`}</p></div><span className="ml-auto shrink-0 font-semibold text-blue-700 text-xs">Xem →</span></Link>;
  })}</div>;
}
