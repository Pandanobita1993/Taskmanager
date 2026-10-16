export const labels={submitted:'Chờ kiểm tra',in_review:'Đang kiểm tra',needs_changes:'Cần bổ sung',approved:'Đã duyệt',confirmed:'Đã nhận tiền',not_received:'Chưa ghi nhận tiền'};
export const money=value=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(Number(value)||0);
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export const date=value=>value?new Date(value.length===10?value+'T00:00:00+07:00':value).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'—';
export const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const outstanding=r=>r.is_void?0:Math.max(0,Number(r.amount)-Number(r.paid||0));
export const overdue=(r,day=today())=>outstanding(r)>0 && r.due_date<day;
export function debtTotals(rows,day=today()){return rows.filter(r=>!r.is_void).reduce((x,r)=>({due:x.due+Number(r.amount),paid:x.paid+Number(r.paid||0),remaining:x.remaining+outstanding(r),overdue:x.overdue+(overdue(r,day)?outstanding(r):0)}),{due:0,paid:0,remaining:0,overdue:0});}
export function requestCounts(rows){return Object.fromEntries(Object.keys(labels).slice(0,4).map(s=>[s,rows.filter(r=>r.status===s).length]));}
export function safeLink(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
