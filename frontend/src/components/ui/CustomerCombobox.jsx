import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, User, ChevronDown, UserPlus, Check, Phone, Loader } from 'lucide-react';
import cn from '../../utils/cn.js';

const CustomerCombobox = ({
  customers = [],
  value,
  onChange,
  onQuickAdd,
  error,
  required,
  label = 'Customer',
  placeholder = 'Search by name or phone…',
}) => {
  const [query,       setQuery]    = useState('');
  const [open,        setOpen]     = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [showAdd,     setShowAdd]  = useState(false);
  const [newName,     setNewName]  = useState('');
  const [newPhone,    setNewPhone] = useState('');
  const [saving,      setSaving]   = useState(false);
  const [phoneErr,    setPhoneErr] = useState('');

  const inputRef     = useRef(null);
  const listRef      = useRef(null);
  const containerRef = useRef(null);
  const nameRef      = useRef(null);

  const selected = customers.find((c) => c.value === value) ?? null;
  const filtered  = query.trim()
    ? customers.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : customers;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setHighlighted(0); }, [query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const item = listRef.current.querySelector(`[data-idx="${highlighted}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const select = useCallback((customer) => {
    onChange(customer.value);
    setQuery('');
    setOpen(false);
  }, [onChange]);

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
    setShowAdd(false);
  };

  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); return; }
    }
    if (e.key === 'ArrowDown')    { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter')   { e.preventDefault(); if (filtered[highlighted]) select(filtered[highlighted]); }
    else if (e.key === 'Escape')  { setOpen(false); setQuery(''); }
  };

  const openAddForm = () => {
    setOpen(false);
    setNewName(query);
    setNewPhone('');
    setPhoneErr('');
    setShowAdd(true);
    setQuery('');
    setTimeout(() => nameRef.current?.focus(), 30);
  };

  const cancelAdd = () => {
    setShowAdd(false);
    setNewName('');
    setNewPhone('');
    setPhoneErr('');
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const handleSave = async () => {
    if (!newName.trim()) { nameRef.current?.focus(); return; }
    if (!/^[0-9+\-\s]{7,15}$/.test(newPhone.trim())) {
      setPhoneErr('Valid phone number daalo');
      return;
    }
    setSaving(true);
    try {
      const customer = await onQuickAdd(newName.trim(), newPhone.trim());
      onChange(String(customer.id));
      setShowAdd(false);
      setNewName('');
      setNewPhone('');
    } catch (err) {
      setPhoneErr(err?.response?.data?.error || err?.message || 'Save nahi hua');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 flex-1" ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
          {label}{required && <span className="text-red-500 ms-0.5">*</span>}
        </label>
      )}

      {/* ── Trigger ── */}
      <div
        className={cn(
          'relative flex items-center rounded-xl border bg-white cursor-text transition-all duration-150',
          open
            ? 'border-brand-500 ring-2 ring-brand-500/20'
            : error
            ? 'border-red-400'
            : 'border-slate-300 hover:border-slate-400',
        )}
        onClick={() => { setShowAdd(false); setOpen(true); inputRef.current?.focus(); }}
      >
        <Search size={14} className="absolute start-3 text-slate-400 shrink-0 pointer-events-none" />

        {selected && !open ? (
          <div className="flex-1 flex items-center gap-2 ps-8 pe-8 py-3 min-w-0">
            <User size={13} className="text-brand-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-900 truncate">{selected.label}</span>
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={query}
            placeholder={selected ? selected.label : placeholder}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            className="flex-1 ps-8 pe-8 py-3 text-sm bg-transparent outline-none placeholder-slate-400"
          />
        )}

        <div className="absolute end-2 flex items-center gap-0.5">
          {selected && (
            <button type="button" onClick={clear} tabIndex={-1}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={13} />
            </button>
          )}
          <ChevronDown size={13} className={cn('text-slate-400 transition-transform duration-150', open && 'rotate-180')} />
        </div>
      </div>

      {/* ── Dropdown list ── */}
      {open && (
        <div className="relative z-50">
          <div className="absolute top-1 left-0 right-0 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-900/10 overflow-hidden">
            <ul ref={listRef} className="max-h-52 overflow-y-auto py-1" role="listbox">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-slate-400 text-center">
                  {query ? `"${query}" nahi mila` : 'Koi customer nahi'}
                </li>
              ) : (
                filtered.map((c, idx) => {
                  const [name, phone] = c.label.split(' — ');
                  return (
                    <li
                      key={c.value}
                      data-idx={idx}
                      role="option"
                      onMouseDown={(e) => { e.preventDefault(); select(c); }}
                      onMouseEnter={() => setHighlighted(idx)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
                        idx === highlighted ? 'bg-brand-50' : 'hover:bg-slate-50',
                        c.value === value && 'bg-brand-50',
                      )}
                    >
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold',
                        c.value === value ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-500',
                      )}>
                        {name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 truncate">{name}</p>
                        {phone && <p className="text-xs text-slate-400">{phone}</p>}
                      </div>
                      {c.value === value && <div className="w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                    </li>
                  );
                })
              )}
            </ul>

            {onQuickAdd && (
              <div className="border-t border-slate-100">
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); openAddForm(); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-brand-600 hover:bg-brand-50 transition-colors cursor-pointer"
                >
                  <UserPlus size={14} className="shrink-0" />
                  <span>Naya customer add karo</span>
                  {query && <span className="ms-1 text-xs font-normal text-slate-400">"{query}"</span>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Inline add form (below combobox, NOT inside dropdown) ── */}
      {showAdd && (
        <div className="mt-1 p-4 bg-brand-50 border border-brand-200 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-brand-700 flex items-center gap-1.5">
            <UserPlus size={12} />
            Naya Customer
          </p>

          <div className="relative">
            <User size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              ref={nameRef}
              type="text"
              placeholder="Naam *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') cancelAdd();
              }}
              className="w-full ps-8 pe-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all placeholder-slate-400"
            />
          </div>

          <div className="relative">
            <Phone size={13} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="tel"
              placeholder="Phone number *"
              value={newPhone}
              onChange={(e) => { setNewPhone(e.target.value); setPhoneErr(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
                if (e.key === 'Escape') cancelAdd();
              }}
              className={cn(
                'w-full ps-8 pe-3 py-2.5 text-sm rounded-xl border bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder-slate-400',
                phoneErr ? 'border-red-400 focus:ring-red-400' : 'border-slate-300 focus:ring-brand-500',
              )}
            />
            {phoneErr && <p className="text-xs text-red-500 mt-1">{phoneErr}</p>}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !newName.trim() || !newPhone.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : <Check size={14} />}
              {saving ? 'Save ho raha…' : 'Add & Select'}
            </button>
            <button
              type="button"
              onClick={cancelAdd}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
    </div>
  );
};

export default CustomerCombobox;
