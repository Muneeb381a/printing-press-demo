import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Wallet, FileText, CheckCircle2,
  Truck, AlertTriangle, Clock, ChevronRight, Share2, Copy, CheckCheck,
} from 'lucide-react';
import { getDailyClosing } from '../../api/dashboard.js';
import { formatCurrency } from '../../utils/format.js';
import cn from '../../utils/cn.js';
import toast from 'react-hot-toast';

// ── helpers ──────────────────────────────────────────────────
const today = () => new Date().toISOString().split('T')[0];

const fmt = (n) => formatCurrency(parseFloat(n) || 0);

const METHOD_LABEL = {
  cash:          'Cash',
  bank_transfer: 'Bank Transfer',
  easypaisa:     'Easypaisa',
  jazzcash:      'JazzCash',
  cheque:        'Cheque',
};

// ── Stat Card ─────────────────────────────────────────────────
const Stat = ({ label, urdu, value, sub, icon: Icon, color, bg, border }) => (
  <div className={cn('rounded-2xl border p-5 flex flex-col gap-2', bg, border)}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>{urdu}</p>
      </div>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', bg, 'border', border)}>
        <Icon size={18} className={color} />
      </div>
    </div>
    <p className={cn('text-2xl font-black tabular-nums leading-none', color)}>{value}</p>
    {sub && <p className="text-xs text-slate-400">{sub}</p>}
  </div>
);

// ── Build WhatsApp summary text ───────────────────────────────
const buildSummaryText = (d, shop, dateStr) => {
  const net = parseFloat(d.cash_collected) - parseFloat(d.expenses_today);
  return `*${shop?.shop_name || 'Print Shop'} — روزانہ رپورٹ*
📅 ${dateStr}

💰 *آج کی وصولی:* Rs ${Number(d.cash_collected).toLocaleString()} (${d.payment_count} ادائیگیاں)
🧾 *نئے بل:* ${d.new_bills_count} بل — Rs ${Number(d.new_bills_value).toLocaleString()}
✅ *مکمل:* ${d.completed_today}  |  🚚 *ڈیلیور:* ${d.delivered_today}
💸 *اخراجات:* Rs ${Number(d.expenses_today).toLocaleString()} (${d.expense_count})
📊 *خالص آمدنی:* Rs ${Math.abs(net).toLocaleString()} ${net < 0 ? '❌' : '✅'}
⚠️ *بقایا (کل):* Rs ${Number(d.total_outstanding).toLocaleString()}
🔴 *فوری آرڈر:* ${d.urgent_pending}  |  📋 *کل آرڈر:* ${d.active_orders}`;
};

// ── Main page ─────────────────────────────────────────────────
const DailyClosing = () => {
  const navigate   = useNavigate();
  const [date, setDate] = useState(today());
  const [copied, setCopied] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['daily-closing', date],
    queryFn:  () => getDailyClosing(date),
    staleTime: 60_000,
  });

  const d = data?.data;

  const dateStr = new Date(date + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const isToday    = date === today();
  const net        = d ? parseFloat(d.cash_collected) - parseFloat(d.expenses_today) : 0;
  const netPositive = net >= 0;

  const copyReport = async () => {
    if (!d) return;
    await navigator.clipboard.writeText(buildSummaryText(d, null, dateStr));
    setCopied(true);
    toast.success('Report copied!');
    setTimeout(() => setCopied(false), 2500);
  };

  const shareReport = async () => {
    if (!d) return;
    const text = buildSummaryText(d, null, dateStr);
    if (navigator.share) {
      await navigator.share({ text, title: 'Daily Report' });
    } else {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Daily Closing</h1>
          <p className="text-sm text-slate-400 mt-0.5" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>
            روزانہ حساب کتاب
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Date picker */}
          <input
            type="date"
            value={date}
            max={today()}
            onChange={e => setDate(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
          />

          {d && (
            <>
              <button
                onClick={copyReport}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer',
                  copied ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                )}
              >
                {copied ? <CheckCheck size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={shareReport}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] transition-all cursor-pointer"
              >
                <Share2 size={13} />
                Share
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date display */}
      <div className="flex items-center gap-2">
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold',
          isToday ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
        )}>
          <Clock size={12} />
          {isToday ? 'Today — ' : ''}{dateStr}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 text-slate-400">Loading…</div>
      )}
      {isError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load report.
        </div>
      )}

      {d && (
        <>
          {/* ── 4 main stat cards ── */}
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Cash Collected"
              urdu="آج کی وصولی"
              value={fmt(d.cash_collected)}
              sub={`${d.payment_count} payment${d.payment_count != 1 ? 's' : ''}`}
              icon={Wallet}
              color="text-emerald-600"
              bg="bg-emerald-50"
              border="border-emerald-100"
            />
            <Stat
              label="New Bills"
              urdu="نئے بل"
              value={d.new_bills_count}
              sub={`Total value: ${fmt(d.new_bills_value)}`}
              icon={FileText}
              color="text-blue-600"
              bg="bg-blue-50"
              border="border-blue-100"
            />
            <Stat
              label="Expenses"
              urdu="آج کے اخراجات"
              value={fmt(d.expenses_today)}
              sub={`${d.expense_count} expense${d.expense_count != 1 ? 's' : ''}`}
              icon={TrendingDown}
              color="text-red-500"
              bg="bg-red-50"
              border="border-red-100"
            />
            <Stat
              label="Net Cash"
              urdu="خالص آمدنی"
              value={fmt(Math.abs(net))}
              sub={netPositive ? 'Profit' : 'Loss today'}
              icon={netPositive ? TrendingUp : TrendingDown}
              color={netPositive ? 'text-emerald-700' : 'text-red-600'}
              bg={netPositive ? 'bg-emerald-50' : 'bg-red-50'}
              border={netPositive ? 'border-emerald-200' : 'border-red-200'}
            />
          </div>

          {/* ── Order status strip ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Order Activity</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Completed', urdu: 'مکمل', value: d.completed_today,  icon: CheckCircle2, color: 'text-emerald-600' },
                { label: 'Delivered', urdu: 'ڈیلیور', value: d.delivered_today, icon: Truck,         color: 'text-blue-600'    },
                { label: 'Urgent',    urdu: 'فوری',  value: d.urgent_pending,  icon: AlertTriangle,  color: 'text-red-500'     },
                { label: 'Active',    urdu: 'جاری',  value: d.active_orders,   icon: Clock,          color: 'text-amber-500'   },
              ].map(({ label, urdu, value, icon: Icon, color }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Icon size={18} className={cn(color, 'shrink-0')} />
                  <div>
                    <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{label}</p>
                    <p className="text-[10px] text-slate-400" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>{urdu}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Outstanding udhar ── */}
          {parseFloat(d.total_outstanding) > 0 && (
            <div
              onClick={() => navigate('/ledger')}
              className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">Total Outstanding Udhar</p>
                <p className="text-2xl font-black text-amber-700">{fmt(d.total_outstanding)}</p>
                <p className="text-xs text-amber-500 mt-1" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>
                  کل بقایا — کھاتہ دیکھنے کے لیے کلک کریں
                </p>
              </div>
              <ChevronRight size={20} className="text-amber-400 shrink-0" />
            </div>
          )}

          {/* ── Payments today ── */}
          {d.payments?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Payments Received</p>
                  <p className="text-xs text-slate-400 mt-0.5">آج کی ادائیگیاں</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {fmt(d.cash_collected)}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {d.payments.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/bills/${p.bill_id || ''}`)}
                    className="px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.customer_name}</p>
                      <p className="text-xs text-slate-400">{p.bill_number} · {METHOD_LABEL[p.payment_method] || p.payment_method}</p>
                    </div>
                    <p className="text-sm font-bold text-emerald-600">{fmt(p.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Expenses today ── */}
          {d.expenses?.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-800">Expenses</p>
                  <p className="text-xs text-slate-400 mt-0.5">آج کے اخراجات</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-full">
                  {fmt(d.expenses_today)}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {d.expenses.map((e) => (
                  <div key={e.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{e.title}</p>
                      <p className="text-xs text-slate-400">{e.category} · {METHOD_LABEL[e.payment_method] || e.payment_method}</p>
                    </div>
                    <p className="text-sm font-bold text-red-500">{fmt(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {d.payment_count == 0 && d.new_bills_count == 0 && d.expense_count == 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
              <p className="text-sm font-semibold text-slate-400">No activity recorded for this date</p>
              <p className="text-xs text-slate-300 mt-1">آج کوئی لین دین نہیں ہوا</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DailyClosing;
