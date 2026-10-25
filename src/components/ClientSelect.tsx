import { Children, isValidElement, useId, useRef, useState } from 'react';
import type { ReactNode, SelectHTMLAttributes } from 'react';
import { matchesClientSearch } from '../lib/clientSearch';

function optionText(node: ReactNode): string {
  return Children.toArray(node).map(child => isValidElement<{ children?: ReactNode }>(child)
    ? optionText(child.props.children) : String(child)).join(' ');
}

// Keep the native select's validation, keyboard support and existing change handlers.
export default function ClientSelect({ children, onChange, disabled, className, id, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  const [query, setQuery] = useState('');
  const generatedId = useId();
  const selectId = id || generatedId;
  const selectRef = useRef<HTMLSelectElement>(null);
  const options = Children.toArray(children).filter(isValidElement<{ value?: string; children?: ReactNode; 'data-search'?: string }>);
  const matches = options.filter(option => !option.props.value || matchesClientSearch(`${optionText(option.props.children)} ${option.props['data-search'] || ''}`, query));
  const selected = options.find(option => String(option.props.value) === String(props.value));
  const retainSelected = selected && !matches.includes(selected);
  const resultCount = matches.filter(option => option.props.value).length;
  return <span className="flex min-w-0 flex-col">
    <select {...props} id={selectId} ref={selectRef} disabled={disabled} className={className} onChange={event => { onChange?.(event); setQuery(''); }}>
      {retainSelected && <option value={selected.props.value} hidden>{selected.props.children}</option>}
      {matches}
    </select>
    {!disabled && <input type="search" value={query} autoComplete="off" aria-label={`Tìm nhanh — ${props['aria-label'] || 'khách hàng'}`} aria-controls={selectId}
      placeholder="Gõ tên hoặc MST để lọc khách…" className={`${className || ''} order-first`} onChange={event => setQuery(event.target.value)}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); selectRef.current?.focus(); } }} />}
    {query && !disabled && <span aria-hidden="true" className="mt-1 text-xs text-gray-500">{resultCount ? `${resultCount} khách phù hợp` : 'Không tìm thấy khách phù hợp'}{retainSelected ? ' · Vẫn giữ khách đang chọn' : ''}</span>}
  </span>;
}
