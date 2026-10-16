import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpToLine, GripVertical, Save, X } from 'lucide-react';
import { moveClient, orderClients } from '../lib/clientOrder';

interface ClientOrderModalProps {
  clients: { id: string; name: string; tax_code?: string }[];
  onSave: (ids: string[]) => void;
  onClose: () => void;
}

export function ClientOrderModal({ clients, onSave, onClose }: ClientOrderModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const dragged = useRef<string | null>(null);
  const [order, setOrder] = useState(() => clients.map(client => client.id));
  const [alphabetical, setAlphabetical] = useState(false);
  const [error, setError] = useState('');
  const clientMap = new Map(clients.map(client => [client.id, client]));

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const move = (id: string, index: number) => {
    setOrder(current => moveClient(current, id, index));
    setAlphabetical(false);
    setError('');
  };

  return <dialog ref={dialog} aria-labelledby="client-order-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90vh] rounded-xl p-0 shadow-xl backdrop:bg-black/50">
    <div className="flex items-center justify-between gap-3 p-5 border-b">
      <div><h2 id="client-order-title" className="text-lg font-bold text-gray-800">Sắp xếp khách hàng</h2><p className="mt-1 text-xs text-gray-500">Kéo thả hoặc dùng các nút mũi tên để đổi vị trí.</p></div>
      <button type="button" autoFocus aria-label="Đóng sắp xếp" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X size={20} /></button>
    </div>
    <div className="p-4 sm:p-5 space-y-3">
      <p className="text-xs text-gray-500">Thứ tự riêng của bạn được lưu trên trình duyệt này.</p>
      <button type="button" onClick={() => { setOrder(orderClients(clients, []).map(client => client.id)); setAlphabetical(true); setError(''); }} className="text-sm text-blue-700 font-semibold hover:underline">Đặt lại theo tên A–Z</button>
      <ol className="space-y-2" aria-label="Thứ tự khách hàng">
        {order.map((id, index) => {
          const client = clientMap.get(id)!;
          return <li key={id} draggable
            onDragStart={event => { dragged.current = id; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id); }}
            onDragEnd={() => { dragged.current = null; }}
            onDragOver={event => { if (dragged.current) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; } }}
            onDrop={event => { event.preventDefault(); if (dragged.current) move(dragged.current, index); dragged.current = null; }}
            className="flex items-center gap-2 sm:gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <GripVertical size={16} className="text-gray-400 shrink-0 cursor-grab" aria-hidden="true" />
            <span className="text-xs font-semibold text-gray-400 w-5 shrink-0" aria-hidden="true">{index + 1}</span>
            <div className="flex-1 min-w-0"><p className="text-xs sm:text-sm font-semibold text-gray-800 break-words">{client.name}</p><p className="text-[11px] text-gray-500 mt-1">MST: {client.tax_code}</p></div>
            <div className="flex items-center shrink-0 gap-0.5">
              <button type="button" disabled={index === 0} title="Đưa lên đầu" aria-label={`Đưa ${client.name} lên đầu`} onClick={() => move(id, 0)} className="p-2 rounded-lg hover:bg-blue-100 text-blue-700 disabled:opacity-25"><ArrowUpToLine size={16} /></button>
              <button type="button" disabled={index === 0} title="Lên một vị trí" aria-label={`Đưa ${client.name} lên một vị trí`} onClick={() => move(id, index - 1)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 disabled:opacity-25"><ArrowUp size={16} /></button>
              <button type="button" disabled={index === order.length - 1} title="Xuống một vị trí" aria-label={`Đưa ${client.name} xuống một vị trí`} onClick={() => move(id, index + 1)} className="p-2 rounded-lg hover:bg-gray-200 text-gray-600 disabled:opacity-25"><ArrowDown size={16} /></button>
            </div>
          </li>;
        })}
      </ol>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
    <div className="sticky bottom-0 bg-white p-4 sm:p-5 border-t flex justify-end gap-3">
      <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">Hủy</button>
      <button type="button" onClick={() => { try { onSave(alphabetical ? [] : order); } catch { setError('Không thể lưu thứ tự trên trình duyệt. Vui lòng thử lại.'); } }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold"><Save size={16} /> Lưu thứ tự</button>
    </div>
  </dialog>;
}
