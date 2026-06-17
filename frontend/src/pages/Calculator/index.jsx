import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, X, Save, ChevronDown, Search, User,
  MessageCircle, Zap, RotateCcw, Grid2X2, Layers, Ruler,
  ArrowRight, ImageDown,
} from 'lucide-react';
import { generateQuoteImage } from '../../utils/generateQuoteImage.js';
import * as custAPI     from '../../api/customers.js';
import * as billAPI     from '../../api/bills.js';
import * as rateAPI     from '../../api/rateList.js';
import * as settingsAPI from '../../api/settings.js';
import { formatCurrency } from '../../utils/format.js';
import cn from '../../utils/cn.js';

// ── persistence ───────────────────────────────────────────────
const DRAFT_KEY = 'calc_draft_v3';
const loadLS = (fallback) => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') ?? fallback; } catch { return fallback; } };
const saveLS = (val) => localStorage.setItem(DRAFT_KEY, JSON.stringify(val));

// ── pricing modes ─────────────────────────────────────────────
const MODES = [
  {
    id:    'area',
    label: 'Area',
    sub:   'W × H × Qty',
    icon:  Grid2X2,
    color: {
      pill:    'bg-violet-600 text-white',
      pillOff: 'text-slate-400 hover:text-violet-600 hover:bg-violet-50',
      result:  'text-violet-700',
      badge:   'bg-violet-50 text-violet-700 border-violet-100',
      border:  'border-l-violet-400',
      dot:     'bg-violet-400',
    },
  },
  {
    id:    'piece',
    label: 'Piece',
    sub:   'Qty × Rate',
    icon:  Layers,
    color: {
      pill:    'bg-emerald-600 text-white',
      pillOff: 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50',
      result:  'text-emerald-700',
      badge:   'bg-emerald-50 text-emerald-700 border-emerald-100',
      border:  'border-l-emerald-400',
      dot:     'bg-emerald-400',
    },
  },
  {
    id:    'length',
    label: 'Length',
    sub:   'L × Qty × Rate',
    icon:  Ruler,
    color: {
      pill:    'bg-amber-500 text-white',
      pillOff: 'text-slate-400 hover:text-amber-600 hover:bg-amber-50',
      result:  'text-amber-700',
      badge:   'bg-amber-50 text-amber-700 border-amber-100',
      border:  'border-l-amber-400',
      dot:     'bg-amber-400',
    },
  },
];

// ── blank row ─────────────────────────────────────────────────
const blank = () => ({
  id:   crypto.randomUUID(),
  mode: 'area',
  desc: '',
  w: '', h: '', qty: '1', len: '',   // area & length inputs
  rate: '',
});

// ── compute ───────────────────────────────────────────────────
const compute = (row) => {
  const w    = parseFloat(row.w)    || 0;
  const h    = parseFloat(row.h)    || 0;
  const qty  = parseFloat(row.qty)  || 1;
  const rate = parseFloat(row.rate) || 0;
  const len  = parseFloat(row.len)  || 0;

  if (row.mode === 'area') {
    const sqft = w && h ? parseFloat((w * h * qty).toFixed(3)) : 0;
    return { sqft, linear: 0, amt: parseFloat((sqft * rate).toFixed(2)) };
  }
  if (row.mode === 'piece') {
    return { sqft: 0, linear: 0, amt: parseFloat((qty * rate).toFixed(2)) };
  }
  // length
  const linear = len ? parseFloat((len * qty).toFixed(3)) : 0;
  return { sqft: 0, linear, amt: parseFloat((linear * rate).toFixed(2)) };
};

// ── number input field ────────────────────────────────────────
const NumField = ({ label, unit, inputRef, value, onChange, onEnter, placeholder, w = 'w-16' }) => (
  <div className="flex flex-col items-center gap-0.5">
    {label && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</span>}
    <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/70 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-400 rounded-xl px-2.5 py-2 transition-all">
      <input
        ref={inputRef}
        type="number" min="0" step="any"
        value={value}
        onChange={onChange}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={placeholder || '0'}
        className={cn('bg-transparent border-0 outline-none text-center text-sm font-bold text-slate-800 placeholder:text-slate-300 tabular-nums', w)}
      />
      {unit && <span className="text-[10px] text-slate-400 font-semibold shrink-0">{unit}</span>}
    </div>
  </div>
);

// ── single item card ──────────────────────────────────────────
const ItemCard = ({ row, idx, onUpdate, onRemove, onNextRow }) => {
  const { sqft, linear, amt } = compute(row);
  const mode  = MODES.find(m => m.id === row.mode) || MODES[0];
  const color = mode.color;

  const wRef    = useRef(null);
  const hRef    = useRef(null);
  const qtyRef  = useRef(null);
  const rateRef = useRef(null);
  const lenRef  = useRef(null);
  const descRef = useRef(null);

  // expose rateRef so parent can call focus
  useEffect(() => { if (onNextRow?.exposeRef) onNextRow.exposeRef(rateRef); }, []);

  const upd = (k, v) => onUpdate(row.id, { [k]: v });
  const go  = (ref) => setTimeout(() => ref?.current?.focus(), 0);

  return (
    <div className={cn(
      'bg-white rounded-2xl shadow-sm border border-slate-200 border-l-4 transition-all',
      amt > 0 ? color.border : 'border-l-slate-200',
      'hover:shadow-md'
    )}>
      <div className="p-5">

        {/* ── Top: mode tabs + amount + delete ── */}
        <div className="flex items-center gap-3 mb-4">
          {/* Row number */}
          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">
            {idx + 1}
          </span>

          {/* Mode selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {MODES.map(m => {
              const MIcon = m.icon;
              const active = row.mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => upd('mode', m.id)}
                  title={`${m.label} — ${m.sub}`}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                    active ? m.color.pill + ' shadow-sm' : m.color.pillOff
                  )}
                >
                  <MIcon size={11} />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="ml-auto text-right shrink-0">
            {amt > 0 ? (
              <div>
                <span className={cn('text-2xl font-black tabular-nums', color.result)}>
                  {amt.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 ml-1">Rs</span>
              </div>
            ) : (
              <span className="text-sm text-slate-200 font-medium">—</span>
            )}
          </div>

          {/* Delete */}
          <button
            onClick={() => onRemove(row.id)}
            className="p-1.5 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer shrink-0"
            tabIndex={-1}
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* ── Input fields (per mode) ── */}
        <div className="flex items-end gap-2 flex-wrap">

          {/* AREA mode */}
          {row.mode === 'area' && (
            <>
              <NumField label="Width" unit="ft" inputRef={wRef}
                value={row.w} onChange={e => upd('w', e.target.value)} onEnter={() => go(hRef)} />
              <Op>×</Op>
              <NumField label="Height" unit="ft" inputRef={hRef}
                value={row.h} onChange={e => upd('h', e.target.value)} onEnter={() => go(qtyRef)} />
              <Op>×</Op>
              <NumField label="Qty" unit="pcs" inputRef={qtyRef} w="w-10"
                value={row.qty} onChange={e => upd('qty', e.target.value)} onEnter={() => go(rateRef)} />

              {sqft > 0 && (
                <>
                  <Op>=</Op>
                  <div className={cn('flex flex-col items-center gap-0.5')}>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                    <span className={cn('px-3 py-2 rounded-xl text-sm font-black border', color.badge)}>
                      {sqft.toFixed(2)} <span className="text-[10px] font-semibold">sqft</span>
                    </span>
                  </div>
                  <Op>×</Op>
                </>
              )}
              {!sqft && <Op>=</Op>}

              <NumField label="Rate" unit="/sqft" inputRef={rateRef} w="w-16"
                value={row.rate} onChange={e => upd('rate', e.target.value)}
                onEnter={() => { go(descRef); onNextRow?.(); }} />
            </>
          )}

          {/* PIECE mode */}
          {row.mode === 'piece' && (
            <>
              <NumField label="Quantity" unit="pcs" inputRef={qtyRef} w="w-20"
                value={row.qty} onChange={e => upd('qty', e.target.value)} onEnter={() => go(rateRef)} />
              <Op>×</Op>
              <NumField label="Rate" unit="/pc" inputRef={rateRef} w="w-16"
                value={row.rate} onChange={e => upd('rate', e.target.value)}
                onEnter={() => { go(descRef); onNextRow?.(); }} />
            </>
          )}

          {/* LENGTH mode */}
          {row.mode === 'length' && (
            <>
              <NumField label="Length" unit="ft" inputRef={lenRef}
                value={row.len} onChange={e => upd('len', e.target.value)} onEnter={() => go(qtyRef)} />
              <Op>×</Op>
              <NumField label="Qty" unit="pcs" inputRef={qtyRef} w="w-10"
                value={row.qty} onChange={e => upd('qty', e.target.value)} onEnter={() => go(rateRef)} />
              {linear > 0 && (
                <>
                  <Op>=</Op>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total</span>
                    <span className={cn('px-3 py-2 rounded-xl text-sm font-black border', color.badge)}>
                      {linear.toFixed(1)} <span className="text-[10px] font-semibold">ft</span>
                    </span>
                  </div>
                  <Op>×</Op>
                </>
              )}
              {!linear && <Op>=</Op>}
              <NumField label="Rate" unit="/ft" inputRef={rateRef} w="w-16"
                value={row.rate} onChange={e => upd('rate', e.target.value)}
                onEnter={() => { go(descRef); onNextRow?.(); }} />
            </>
          )}
        </div>

        {/* ── Description ── */}
        <input
          ref={descRef}
          value={row.desc}
          onChange={e => upd('desc', e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onNextRow?.()}
          placeholder="Description (optional) — e.g. Flex Banner, Front Wall"
          className="mt-3 w-full text-xs text-slate-500 placeholder:text-slate-300 bg-transparent border-0 outline-none border-b border-dashed border-slate-200 focus:border-slate-400 pb-1 transition-colors"
        />
      </div>
    </div>
  );
};

// small operator symbol
const Op = ({ children }) => (
  <span className="text-slate-300 font-bold text-base self-end mb-2.5 shrink-0">{children}</span>
);

// ── Quick Rate chip ───────────────────────────────────────────
const RateChip = ({ item, onApply }) => (
  <button
    onClick={() => onApply(item)}
    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 hover:border-violet-300 hover:bg-violet-50 rounded-xl text-xs font-semibold text-slate-600 hover:text-violet-700 transition-all cursor-pointer shadow-sm whitespace-nowrap"
  >
    <span className="font-black text-slate-800">{Number(item.price).toLocaleString()}</span>
    <span className="text-slate-400">/{item.unit}</span>
    <span className="text-slate-500 truncate max-w-20">{item.name}</span>
  </button>
);

// ── WhatsApp quote ────────────────────────────────────────────
const WaModal = ({ rows, discAmt, total, shop, onClose }) => {
  const shopName = shop?.shop_name || 'Our Shop';
  const phone    = shop?.whatsapp_phone || shop?.phone || '';

  const lines = [`*${shopName} — Price Quote* 📋`, ''];
  rows.forEach((row, i) => {
    const { sqft, linear, amt } = compute(row);
    if (!amt) return;
    const modeLabel = { area: 'Area', piece: 'Piece', length: 'Length' }[row.mode];
    lines.push(`${i + 1}. ${row.desc || modeLabel + ' Item'}`);
    if (row.mode === 'area' && sqft)
      lines.push(`   ${row.w}ft × ${row.h}ft × ${row.qty}pcs = ${sqft.toFixed(2)} sqft @ Rs ${row.rate}/sqft`);
    else if (row.mode === 'piece')
      lines.push(`   ${row.qty} pcs × Rs ${row.rate}/pc`);
    else if (row.mode === 'length' && linear)
      lines.push(`   ${row.len}ft × ${row.qty}pcs = ${linear.toFixed(1)} ft @ Rs ${row.rate}/ft`);
    lines.push(`   *→ Rs ${amt.toLocaleString()}*`);
    lines.push('');
  });
  if (discAmt > 0) lines.push(`Discount: −Rs ${discAmt.toLocaleString()}`);
  lines.push(`*Total: Rs ${total.toLocaleString()}*`);
  if (phone) lines.push('', `📞 ${phone}`);
  lines.push('_Prices are estimates. Final may vary._');

  const msg    = lines.join('\n');
  const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 flex items-center justify-center">
              <MessageCircle size={15} className="text-[#25D366]" />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">Share Quote</p>
              <p className="text-xs text-slate-400">Opens WhatsApp with formatted message</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={15} /></button>
        </div>
        <div className="p-5">
          <textarea readOnly value={msg} className="w-full h-48 px-3 py-2.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none" />
        </div>
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Close</button>
          <a href={waLink} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl shadow-sm"
          >
            <MessageCircle size={14} /> Open WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Customer select step ──────────────────────────────────────
const CustomerStep = ({ onSelect, onClose }) => {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const { data } = useQuery({
    queryKey: ['cust-calc', q],
    queryFn:  () => custAPI.getCustomers({ search: q || undefined, limit: 30 }),
    staleTime: 10_000,
  });
  const customers = data?.data || [];
  return (
    <div className="p-5">
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search by name or phone…"
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400" />
      </div>
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {customers.length === 0
          ? <p className="text-sm text-center text-slate-400 py-8">No customers found</p>
          : customers.map(c => (
            <button key={c.id} onClick={() => onSelect(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-brand-50 text-start cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-700">{c.name?.slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-700 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 font-mono">{c.phone}</p>
              </div>
              <ArrowRight size={13} className="text-slate-300 group-hover:text-brand-400 shrink-0" />
            </button>
          ))}
      </div>
    </div>
  );
};

// ── Save Bill modal ───────────────────────────────────────────
const SaveModal = ({ total, discAmt, itemCount, saving, onConfirm, onClose }) => {
  const [step, setStep] = useState('customer');
  const [customer, setCustomer] = useState(null);
  const [advance, setAdvance]   = useState('');
  const [method,  setMethod]    = useState('cash');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Save as Bill</h3>
            <p className="text-xs text-slate-400 mt-0.5">{itemCount} items · {formatCurrency(total)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={15} /></button>
        </div>

        {step === 'customer' ? (
          <CustomerStep onSelect={c => { setCustomer(c); setStep('payment'); }} onClose={onClose} />
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 px-3.5 py-3 bg-brand-50 border border-brand-100 rounded-xl">
              <div className="w-9 h-9 rounded-full bg-brand-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-brand-800">{customer.name?.slice(0,2).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800">{customer.name}</p>
                <p className="text-xs text-slate-500 font-mono">{customer.phone}</p>
              </div>
              <button onClick={() => setStep('customer')} className="text-xs text-brand-600 font-bold cursor-pointer">Change</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Advance</label>
              <input type="number" min="0" value={advance} onChange={e => setAdvance(e.target.value)} placeholder="0 (optional)"
                className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Payment Method</label>
              <div className="flex gap-2">
                {['cash', 'bank_transfer', 'cheque'].map(m => (
                  <button key={m} onClick={() => setMethod(m)}
                    className={cn(
                      'flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer capitalize',
                      method === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300'
                    )}
                  >{m.replace('_', ' ')}</button>
                ))}
              </div>
            </div>

            <button onClick={() => onConfirm(customer, parseFloat(advance) || 0, method)} disabled={saving}
              className="w-full py-3 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 disabled:opacity-50 cursor-pointer">
              {saving ? 'Creating…' : `Create Bill — ${formatCurrency(total)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Calculator ───────────────────────────────────────────
export default function Calculator() {
  const navigate = useNavigate();

  const [rows, setRows] = useState(() => {
    const d = loadLS(null);
    return d?.rows?.length ? d.rows : [blank()];
  });
  const [discType, setDiscType] = useState(() => loadLS({})?.discType || 'pct');
  const [discVal,  setDiscVal]  = useState(() => loadLS({})?.discVal  || '');
  const [saveOpen,   setSaveOpen]   = useState(false);
  const [waOpen,     setWaOpen]     = useState(false);
  const [imgLoading, setImgLoading] = useState(false);

  // Draft persistence
  useEffect(() => { saveLS({ rows, discType, discVal }); }, [rows, discType, discVal]);

  // Rate list
  const { data: rateData } = useQuery({
    queryKey: ['rate-items-all'],
    queryFn:  rateAPI.getAllItems,
    staleTime: 60_000,
  });
  const { data: rateCatData } = useQuery({
    queryKey: ['rate-categories'],
    queryFn:  rateAPI.getCategories,
    staleTime: 60_000,
  });
  const rateItems = rateData?.data  || [];
  const rateCats  = rateCatData?.data || [];

  // Group rate items by category
  const rateByCategory = useMemo(() => {
    const map = new Map();
    for (const cat of rateCats) map.set(cat.id, { name: cat.name, items: [] });
    for (const item of rateItems) {
      if (map.has(item.category_id)) map.get(item.category_id).items.push(item);
    }
    return [...map.values()].filter(c => c.items.length > 0);
  }, [rateItems, rateCats]);

  // Settings
  const { data: settingsData } = useQuery({
    queryKey: ['shop-settings'],
    queryFn:  settingsAPI.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  const shop = settingsData?.data ?? {};

  // Totals
  const subtotal   = useMemo(() => rows.reduce((s, r) => s + compute(r).amt, 0), [rows]);
  const discAmt    = useMemo(() => {
    const dv = parseFloat(discVal) || 0;
    return discType === 'pct' ? parseFloat(((subtotal * dv) / 100).toFixed(2)) : Math.min(dv, subtotal);
  }, [subtotal, discType, discVal]);
  const total      = Math.max(0, subtotal - discAmt);
  const totalSqft  = useMemo(() => rows.reduce((s, r) => s + compute(r).sqft, 0), [rows]);
  const validCount = rows.filter(r => compute(r).amt > 0).length;

  // Row callbacks
  const addRow = useCallback((mode = 'area') => {
    setRows(prev => [...prev, { ...blank(), mode }]);
  }, []);

  const updateRow = useCallback((id, patch) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }, []);

  const removeRow = useCallback((id) => {
    setRows(prev => {
      const next = prev.filter(r => r.id !== id);
      return next.length ? next : [blank()];
    });
  }, []);

  const applyRate = useCallback((rateItem) => {
    const unitMode = rateItem.unit === 'sqft' ? 'area' : rateItem.unit === 'ft' ? 'length' : 'piece';
    const target   = rows.find(r => !r.rate) || rows[rows.length - 1];
    updateRow(target.id, {
      rate: String(rateItem.price),
      mode: unitMode,
      desc: target.desc || rateItem.name,
    });
  }, [rows, updateRow]);

  const clearAll = () => { setRows([blank()]); setDiscVal(''); };

  const shareImage = async () => {
    if (!validCount) return toast.error('Add items first');
    setImgLoading(true);
    try {
      const blob = await generateQuoteImage({
        rows, subtotal, discAmt, total, shop, computeRow: compute,
      });
      const file = new File([blob], 'quote.png', { type: 'image/png' });

      // Web Share API — works natively on mobile (shares directly to WhatsApp/etc.)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `${shop?.shop_name || 'Price Quote'}` });
        return;
      }

      // Desktop fallback — download the image
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `quote-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded — attach it in WhatsApp');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not generate image');
    } finally {
      setImgLoading(false);
    }
  };

  // Save mutation
  const saveMut = useMutation({
    mutationFn: ({ customer, advance, method }) => billAPI.completeBill({
      customerId: customer.id,
      items: rows.filter(r => compute(r).amt > 0).map(r => {
        const { amt } = compute(r);
        return {
          categoryId:  null,
          description: r.desc || ({ area: 'Area Item', piece: 'Piece Item', length: 'Length Item' }[r.mode]),
          width:       parseFloat(r.w)   || null,
          height:      parseFloat(r.h)   || null,
          quantity:    parseInt(r.qty)   || 1,
          amount:      amt,
          designFee:   0,
          urgentFee:   0,
        };
      }),
      discountType:  discAmt > 0 ? (discType === 'pct' ? 'percentage' : 'fixed') : 'fixed',
      discountValue: discAmt > 0 ? parseFloat(discVal) || 0 : 0,
      advance,
      paymentMethod: method,
    }),
    onSuccess: (res) => {
      toast.success(`Bill ${res.data.bill.bill_number} created!`);
      clearAll();
      navigate(`/bills/${res.data.bill.id}`);
    },
    onError: (e) => toast.error(e.response?.data?.error || e.message || 'Failed'),
  });

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ══════════════════════════════════════
          CALCULATOR DISPLAY
      ══════════════════════════════════════ */}
      <div className="bg-linear-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/40">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-1">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[3px]">Print Calculator</p>
          </div>
          <button onClick={clearAll} title="Clear all"
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">
            <RotateCcw size={12} /> Clear
          </button>
        </div>

        {/* Number display */}
        <div className="px-6 py-4">
          {/* Breakdown items mini-tape */}
          {validCount > 0 && (
            <div className="space-y-1 mb-4 max-h-28 overflow-y-auto">
              {rows.filter(r => compute(r).amt > 0).map((r, i) => {
                const { amt } = compute(r);
                const m = MODES.find(m => m.id === r.mode);
                return (
                  <div key={r.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full', m?.color.dot)} />
                      <span className="text-xs text-slate-500 truncate max-w-45">
                        {r.desc || m?.label + ' item'}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 tabular-nums">
                      Rs {amt.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Main total */}
          <div className="text-right">
            {discAmt > 0 && (
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="text-sm text-slate-600 tabular-nums line-through">Rs {subtotal.toLocaleString()}</span>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg">
                  −Rs {discAmt.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex items-end justify-end gap-2 leading-none">
              <span className="text-2xl font-black text-slate-600 mb-1">Rs</span>
              <span className={cn(
                'font-black tabular-nums text-white transition-all',
                total >= 100000 ? 'text-4xl' : 'text-5xl'
              )}>
                {total > 0 ? total.toLocaleString() : '0'}
              </span>
            </div>
            {totalSqft > 0 && (
              <p className="text-xs text-slate-600 mt-1 tabular-nums">
                {totalSqft.toFixed(2)} sqft · {validCount} item{validCount !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-linear-to-r from-transparent via-slate-700 to-transparent mx-6" />

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-0">
          <button
            onClick={() => { if (!validCount) return toast.error('Add items first'); setWaOpen(true); }}
            className="flex flex-col items-center justify-center gap-1 py-3.5 text-xs font-bold text-slate-400 hover:text-[#4ade80] hover:bg-white/5 transition-all cursor-pointer border-r border-slate-700/50"
          >
            <MessageCircle size={16} />
            <span>Text</span>
          </button>
          <button
            onClick={shareImage}
            disabled={imgLoading}
            className="flex flex-col items-center justify-center gap-1 py-3.5 text-xs font-bold text-slate-400 hover:text-violet-300 hover:bg-white/5 transition-all cursor-pointer border-r border-slate-700/50 disabled:opacity-40"
          >
            {imgLoading
              ? <span className="w-4 h-4 border-2 border-slate-500 border-t-violet-400 rounded-full animate-spin" />
              : <ImageDown size={16} />
            }
            <span>Image</span>
          </button>
          <button
            onClick={() => { if (!validCount) return toast.error('Add items first'); setSaveOpen(true); }}
            className="flex flex-col items-center justify-center gap-1 py-3.5 text-xs font-bold text-slate-400 hover:text-brand-300 hover:bg-white/5 transition-all cursor-pointer"
          >
            <Save size={16} />
            <span>Bill</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════
          QUICK RATES
      ══════════════════════════════════════ */}
      {rateByCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-amber-500" />
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Quick Rates</p>
            <p className="text-[10px] text-slate-400 ml-1">Click to apply to a row</p>
          </div>
          <div className="space-y-2.5">
            {rateByCategory.map(cat => (
              <div key={cat.name}>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{cat.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {cat.items.map(item => (
                    <RateChip key={item.id} item={item} onApply={applyRate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          ITEM CARDS
      ══════════════════════════════════════ */}
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <ItemCard
            key={row.id}
            row={row}
            idx={idx}
            onUpdate={updateRow}
            onRemove={removeRow}
            onNextRow={() => {
              const i = rows.findIndex(r => r.id === row.id);
              if (i === rows.length - 1) addRow(row.mode);
            }}
          />
        ))}
      </div>

      {/* ── Add row buttons ── */}
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => {
          const MIcon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => addRow(m.id)}
              className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer group"
            >
              <MIcon size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600">+ {m.label}</span>
              <span className="text-[9px] text-slate-300">{m.sub}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════
          DISCOUNT
      ══════════════════════════════════════ */}
      {subtotal > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-600 shrink-0">Discount</span>
            <div className="flex bg-slate-100 rounded-xl p-0.5">
              {[['pct', '%'], ['fixed', 'Rs']].map(([val, label]) => (
                <button key={val} onClick={() => setDiscType(val)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer',
                    discType === val ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'
                  )}>{label}</button>
              ))}
            </div>
            <input
              type="number" min="0" step="any" value={discVal}
              onChange={e => setDiscVal(e.target.value)} placeholder="0"
              className="flex-1 px-3 py-2 text-sm text-right border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
            {discAmt > 0 && (
              <span className="text-sm font-black text-emerald-600 tabular-nums shrink-0">−{formatCurrency(discAmt)}</span>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {waOpen   && <WaModal rows={rows} discAmt={discAmt} total={total} shop={shop} onClose={() => setWaOpen(false)} />}
      {saveOpen && (
        <SaveModal
          total={total} discAmt={discAmt} itemCount={validCount} saving={saveMut.isPending}
          onConfirm={(customer, advance, method) => saveMut.mutate({ customer, advance, method })}
          onClose={() => setSaveOpen(false)}
        />
      )}
    </div>
  );
}
