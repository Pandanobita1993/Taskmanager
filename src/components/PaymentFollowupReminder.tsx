import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { readCachedProfile } from '../lib/profile';
import type { FollowupPortal } from '../lib/paymentFollowups';

export function PaymentFollowupReminder() {
  const [summary, setSummary] = useState<FollowupPortal['summary'] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let fetching = false;
    const load = async () => {
      const profile = readCachedProfile();
      if (!profile.id || fetching || document.hidden) return;
      fetching = true;
      try {
        const result = await supabase.rpc('payment_followup_portal', { p_staff_id: profile.id, p_summary_only: true });
        if (!active) return;
        if (result.error) { setSummary(null); setFailed(true); }
        else { setSummary(result.data.summary); setFailed(false); }
      } catch { if (active) { setSummary(null); setFailed(true); } }
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
  if (!failed && !summary) return null;
  const needsAttention = !!summary?.attention;
  return <Link to={`/payment-followups${needsAttention ? '?filter=attention' : ''}`} className={`flex items-start gap-3 rounded-xl p-4 border text-sm ${needsAttention ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-white border-gray-200 text-gray-700'}`}>
    <BellRing size={20} className="shrink-0 mt-0.5" /><div><p className="font-semibold">BHXH & thuế{needsAttention ? ` · ${summary.attention} khoản cần kiểm tra / nhắc khách` : ''}</p><p className="text-xs mt-1">{failed ? 'Chưa tải được nhắc đóng. Mở sổ theo dõi để kiểm tra.' : `${summary!.unpaid} khoản còn chờ đóng · ${summary!.overdue} khoản quá hạn. ${needsAttention ? 'Có khoản đến ngày nhắc, sắp đến hạn hoặc đã qua ngày khách hẹn.' : 'Mở sổ theo dõi đóng phí của khách hàng.'}`}</p></div><span className="ml-auto shrink-0 font-semibold text-blue-700 text-xs">Xem →</span>
  </Link>;
}
