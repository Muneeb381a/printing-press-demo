import { useState, useRef, useEffect, forwardRef } from 'react';
import { Search, X, ChevronDown, Check } from 'lucide-react';
import cn from '../../utils/cn.js';

const CategoryCombobox = forwardRef(({
  options = [], value, onChange,
  placeholder = 'Search product…', label, wrapperClassName,
}, ref) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = query.trim() ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;
  const setInputRef = (el) => { inputRef.current = el; if (typeof ref === 'function') ref(el); else if (ref) ref.current = el; };
  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => { setHighlighted(0); }, [query]);
  useEffect(() => { if (!open || !listRef.current) return; listRef.current.querySelector(`[data-idx="${highlighted}"]`)?.scrollIntoView({ block: 'nearest' }); }, [highlighted, open]);
  const select = (option) => { onChange(option.value); setQuery(''); setOpen(false); };
  const handleKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); setOpen(true); setQuery(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
    else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    else if (e.key === 'Tab') { setOpen(false); setQuery(''); }
  };
  return (
    <div className={cn('flex flex-col gap-1', wrapperClassName)} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">{label}</label>}
      <div className={cn('relative flex items-center rounded-xl border bg-white transition-all duration-150', open ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-slate-300 hover:border-slate-400')} onClick={() => { setOpen(true); setQuery(''); inputRef.current?.focus(); }}>
        <Search size={14} className="absolute start-3 text-slate-400 shrink-0 pointer-events-none z-10" />
        <input ref={setInputRef} type="text" value={open ? query : (selected?.label ?? '')} placeholder={open ? 'Type to search…' : placeholder} onChange={(e) => setQuery(e.target.value)} onFocus={() => { setOpen(true); setQuery(''); }} onKeyDown={handleKeyDown} readOnly={!open} className={cn('flex-1 ps-8 pe-8 py-3 text-sm bg-transparent outline-none', open ? 'cursor-text placeholder-slate-400' : 'cursor-pointer', selected && !open ? 'font-semibold text-slate-900' : 'text-slate-900 placeholder-slate-400')} />
        <div className="absolute end-2 flex items-center gap-0.5">
          {selected && <button type="button" tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(''); setQuery(''); setOpen(false); }} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={13} /></button>}
          <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150 pointer-events-none', open && 'rotate-180')} />
        </div>
      </div>
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden">
            <ul ref={listRef} className="max-h-52 overflow-y-auto py-1">
              {filtered.length === 0 ? <li className="px-4 py-3 text-sm text-slate-400 text-center">{query ? `"${query}" not found` : 'No products'}</li> : filtered.map((o, idx) => (
                <li key={o.value} data-idx={idx} onMouseDown={(e) => { e.preventDefault(); select(o); }} onMouseEnter={() => setHighlighted(idx)} className={cn('flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors text-sm', idx === highlighted ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                  <span className={cn('flex-1 truncate', idx === highlighted ? 'font-semibold text-slate-900' : 'font-medium text-slate-700')}>{o.label}</span>
                  {o.value === value && <Check size={13} className="text-brand-500 shrink-0" />}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
});
CategoryCombobox.displayName = 'CategoryCombobox';
export default CategoryCombobox;
