import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign, TrendingUp, Clock, AlertCircle,
  Plus, Users, BarChart2, Boxes,
  CheckCircle, AlertTriangle, ChevronRight, ChevronDown,
  ArrowUpRight, FileText, TrendingDown,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/format.js';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge.jsx';
import { useLanguage } from '../i18n/LanguageContext.jsx';
import Banner from '../components/Banner.jsx';
import * as dashAPI     from '../api/dashboard.js';
import * as settingsAPI from '../api/settings.js';
import * as invAPI      from '../api/inventory.js';
import * as expAPI      from '../api/expenses.js';
import cn from '../utils/cn.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

const greeting = (t) => {
  const h = new Date().getHours();
  if (h < 12) return t('good_morning');
  if (h < 17) return t('good_afternoon');
  return t('good_evening');
};

const todayLabel = (lang) =>
  new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const DASH_PERIODS = [
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week',      label: 'This Week' },
  { value: 'month',     label: 'This Month' },
];

const getPeriodRange = (p) => {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  if (p === 'yesterday') { const y = new Date(today); y.setDate(today.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
  if (p === 'week')      { const s = new Date(today); s.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); return { from: fmt(s), to: fmt(today) }; }
  if (p === 'month')     return { from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], to: fmt(today) };
  return { from: fmt(today), to: fmt(today) };
};

// ─────────────────────────────────────────────────────────────
// Stat Card — large number, colored top strip, hover lift
// ─────────────────────────────────────────────────────────────

const STAT_PALETTES = {
  emerald: { strip: 'border-t-emerald-500', icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-700' },
  brand:   { strip: 'border-t-brand-500',   icon: 'bg-brand-50   text-brand-600',   value: 'text-brand-700'   },
  amber:   { strip: 'border-t-amber-500',   icon: 'bg-amber-50   text-amber-600',   value: 'text-amber-700'   },
  red:     { strip: 'border-t-red-500',     icon: 'bg-red-50     text-red-600',     value: 'text-red-700'     },
  violet:  { strip: 'border-t-violet-500',  icon: 'bg-violet-50  text-violet-600',  value: 'text-violet-700'  },
};

const DStat = ({ title, value, sub, icon: Icon, palette, loading, onClick }) => {
  const p = STAT_PALETTES[palette] || STAT_PALETTES.brand;
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full text-start bg-white rounded-2xl border border-slate-200 border-t-2 p-5',
        'shadow-sm hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        'transition-all duration-200 cursor-pointer',
        p.strip
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none pt-0.5">
          {title}
        </p>
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', p.icon)}>
          <Icon size={17} strokeWidth={2} />
        </div>
      </div>
      {loading ? (
        <div className="h-8 w-32 bg-slate-100 rounded-lg animate-pulse" />
      ) : (
        <p className={cn('text-2xl font-black tracking-tight leading-none', p.value)}>{value}</p>
      )}
      <p className="text-xs text-slate-400 mt-2.5 leading-snug">{sub}</p>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────
// Quick Action Button
// ─────────────────────────────────────────────────────────────

const QAction = ({ icon: Icon, label, sub, iconClass, onClick, primary }) => (
  <button
    onClick={onClick}
    className={cn(
      'group flex items-center gap-3 w-full text-start rounded-xl px-3.5 py-3',
      'transition-all duration-150 cursor-pointer',
      primary
        ? 'bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white shadow-sm shadow-brand-200'
        : 'bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 hover:border-slate-300'
    )}
  >
    <div className={cn(
      'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
      primary ? 'bg-white/20' : iconClass
    )}>
      <Icon size={16} className={primary ? 'text-white' : ''} strokeWidth={2} />
    </div>
    <div className="flex-1 min-w-0">
      <p className={cn('text-sm font-semibold leading-tight', primary ? 'text-white' : 'text-slate-800')}>
        {label}
      </p>
      {sub && (
        <p className={cn('text-xs mt-0.5 leading-none', primary ? 'text-white/70' : 'text-slate-400')}>
          {sub}
        </p>
      )}
    </div>
    <ChevronRight size={14} className={cn('shrink-0 transition-transform duration-150 group-hover:translate-x-0.5', primary ? 'text-white/60' : 'text-slate-300')} />
  </button>
);

// ─────────────────────────────────────────────────────────────
// Mini section header
// ─────────────────────────────────────────────────────────────

const SectionHead = ({ title, action, onAction }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</h3>
    {action && (
      <button
        onClick={onAction}
        className="text-xs font-semibold text-brand-600 hover:text-brand-800 cursor-pointer transition-colors flex items-center gap-0.5"
      >
        {action} <ArrowUpRight size={11} />
      </button>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

const Dashboard = () => {
  const navigate = useNavigate();
  const { t, lang } = useLanguage();
  const [expandedOrders, setExpandedOrders] = useState(new Set());
  const [period, setPeriod] = useState('today');

  const { from: periodFrom, to: periodTo } = getPeriodRange(period);

  const toggleOrderGroup = (customerId) =>
    setExpandedOrders(prev => {
      const next = new Set(prev);
      next.has(customerId) ? next.delete(customerId) : next.add(customerId);
      return next;
    });

  const { data: settingsData } = useQuery({
    queryKey:  ['shop-settings'],
    queryFn:   settingsAPI.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn:  dashAPI.getSummary,
  });

  const { data: pending, isLoading: loadingPending } = useQuery({
    queryKey: ['pending-orders'],
    queryFn:  () => dashAPI.getPendingOrders(10),
  });

  const { data: topProducts, isLoading: loadingTop } = useQuery({
    queryKey: ['top-products'],
    queryFn:  () => dashAPI.getTopProducts(5),
  });

  const { data: stockAlerts } = useQuery({
    queryKey:        ['stock-alerts'],
    queryFn:         invAPI.getAlerts,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: revSummary, isLoading: loadingRev } = useQuery({
    queryKey: ['dashboard-revenue', period],
    queryFn:  () => dashAPI.getRevenueSummary(periodFrom, periodTo),
    staleTime: 2 * 60 * 1000,
  });

  const { data: expSummary } = useQuery({
    queryKey: ['expense-summary-dash', period],
    queryFn:  () => expAPI.getSummary({ from: periodFrom, to: periodTo }),
    staleTime: 2 * 60 * 1000,
  });

  const shop     = settingsData?.data     ?? {};
  const s        = summary?.data          ?? {};
  const alerts   = stockAlerts?.data ?? [];
  const critical  = alerts.filter((a) => a.alert_level === 'critical');
  const pendingCount    = Number(s.pending_count)      || 0;
  const inProgCount     = Number(s.in_progress_count)  || 0;

  const rev             = revSummary?.data             ?? {};
  const periodRevenue   = parseFloat(rev.revenue       || 0);
  const periodBillCount = parseInt(rev.bill_count      || 0, 10);
  const periodExpenses  = parseFloat(expSummary?.data?.total_out || 0);
  const periodNetProfit = periodRevenue - periodExpenses;
  const periodLabel     = DASH_PERIODS.find(p => p.value === period)?.label ?? '';

  const orders   = pending?.data || [];
  const products = topProducts?.data || [];

  // Group active orders by customer
  const groupedOrders = useMemo(() => {
    const map = new Map();
    for (const bill of orders) {
      const key = bill.customer_id;
      if (!map.has(key)) {
        map.set(key, {
          customer_id:    bill.customer_id,
          customer_name:  bill.customer_name,
          customer_phone: bill.customer_phone,
          bills: [],
        });
      }
      map.get(key).bills.push(bill);
    }
    return [...map.values()];
  }, [orders]);

  // Priority counts across all active orders
  const priorityCounts = useMemo(() => {
    const counts = { urgent: 0, normal: 0, low: 0 };
    for (const bill of orders) counts[bill.priority || 'normal'] = (counts[bill.priority || 'normal'] || 0) + 1;
    return counts;
  }, [orders]);

  // Max revenue for relative bar widths in top products
  const maxRevenue = products.length ? parseFloat(products[0]?.total_revenue || 0) : 1;

  return (
    <div className="space-y-5">

      {/* ── Critical Stock Banner ─────────────────────────────── */}
      {critical.length > 0 && (
        <div
          onClick={() => navigate('/inventory')}
          className="flex items-center gap-3 px-5 py-3.5 bg-red-600 rounded-2xl cursor-pointer hover:bg-red-700 active:bg-red-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white leading-tight">
              {critical.length} item{critical.length > 1 ? 's' : ''} at critical stock level
            </p>
            <p className="text-xs text-red-200 mt-0.5">
              {critical.map((c) => c.name).join(', ')} — immediate restock needed
            </p>
          </div>
          <span className="text-xs font-bold text-white/70 group-hover:text-white flex items-center gap-1 shrink-0 transition-colors">
            Manage <ChevronRight size={13} />
          </span>
        </div>
      )}

      {/* ── Hero Banner ───────────────────────────────────────── */}
      <Banner
        shopName={shop.shop_name || 'My Print Shop'}
        tagline={shop.tagline}
        greeting={greeting(t)}
      />

      {/* ── Period Selector ───────────────────────────────────── */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm">
        {DASH_PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setPeriod(value)}
            className={cn(
              'flex-1 py-2 rounded-xl text-xs font-bold transition-all',
              period === value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Stat Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <DStat
          title={`${periodLabel} Revenue`}
          value={formatCurrency(periodRevenue)}
          sub={`${periodBillCount} bill${periodBillCount !== 1 ? 's' : ''}`}
          icon={DollarSign}
          palette="emerald"
          loading={loadingRev}
          onClick={() => navigate('/reports')}
        />
        <DStat
          title={`${periodLabel} Expenses`}
          value={formatCurrency(periodExpenses)}
          sub={`${expSummary?.data?.out_count || 0} transactions`}
          icon={TrendingDown}
          palette="red"
          loading={loadingRev}
          onClick={() => navigate('/expenses')}
        />
        <DStat
          title="Net Profit"
          value={formatCurrency(Math.abs(periodNetProfit))}
          sub={`${periodNetProfit >= 0 ? 'Profit' : 'Loss'} · ${periodLabel.toLowerCase()}`}
          icon={periodNetProfit >= 0 ? TrendingUp : TrendingDown}
          palette={periodNetProfit >= 0 ? 'emerald' : 'red'}
          loading={loadingRev}
          onClick={() => navigate('/reports')}
        />
        <DStat
          title={t('active_orders_stat')}
          value={pendingCount + inProgCount}
          sub={`${pendingCount} ${t('pending_label')} · ${inProgCount} ${t('in_progress_label')}`}
          icon={Clock}
          palette="amber"
          loading={loadingSummary}
          onClick={() => navigate('/bills')}
        />
        <DStat
          title={t('outstanding')}
          value={formatCurrency(s.total_outstanding)}
          sub={t('unpaid_all')}
          icon={AlertCircle}
          palette="red"
          loading={loadingSummary}
          onClick={() => navigate('/ledger')}
        />
      </div>

      {/* ── Main content grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* ── LEFT: Active Orders ─────────────────────────────── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Table header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center">
                <FileText size={14} className="text-brand-600" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 leading-tight">{t('active_orders')}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {priorityCounts.urgent > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-700 bg-red-50 ring-1 ring-red-200 px-1.5 py-0.5 rounded-full">
                      <span className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                      {priorityCounts.urgent} urgent
                    </span>
                  )}
                  {priorityCounts.normal > 0 && (
                    <span className="text-[10px] text-slate-400">{priorityCounts.normal} normal</span>
                  )}
                  {priorityCounts.low > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 bg-green-50 ring-1 ring-green-200 px-1.5 py-0.5 rounded-full">
                      <span className="w-1 h-1 rounded-full bg-green-500 shrink-0" />
                      {priorityCounts.low} low
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/bills')}
              className="text-xs font-bold text-brand-600 hover:text-brand-800 cursor-pointer transition-colors flex items-center gap-1"
            >
              {t('view_all')} <ArrowUpRight size={11} />
            </button>
          </div>

          {/* Orders list — grouped by customer */}
          {loadingPending ? (
            <div className="p-5 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : groupedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-300">
              <CheckCircle size={36} strokeWidth={1.5} className="mb-3 text-emerald-300" />
              <p className="text-sm font-semibold text-slate-500">{t('no_active_orders')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groupedOrders.map((group) => {
                const isExpanded   = expandedOrders.has(group.customer_id);
                const totalAmt     = group.bills.reduce((s, b) => s + parseFloat(b.total_amount    || 0), 0);
                const totalBalance = group.bills.reduce((s, b) => s + parseFloat(b.remaining_balance || 0), 0);
                const initials     = group.customer_name?.slice(0, 2).toUpperCase() || '??';
                const urgentCount  = group.bills.filter(b => b.priority === 'urgent').length;
                const hasUrgent    = urgentCount > 0;

                return (
                  <div key={group.customer_id} className={hasUrgent ? 'border-l-[3px] border-red-400' : 'border-l-[3px] border-transparent'}>

                    {/* Customer summary row */}
                    <button
                      onClick={() => toggleOrderGroup(group.customer_id)}
                      className={cn(
                        'group w-full flex items-center gap-3.5 px-5 py-3.5 transition-colors cursor-pointer text-start',
                        hasUrgent
                          ? 'bg-red-50/40 hover:bg-red-50 active:bg-red-100'
                          : 'hover:bg-slate-50 active:bg-slate-100'
                      )}
                    >
                      {/* Avatar — red for urgent customers */}
                      <div className={cn(
                        'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                        hasUrgent ? 'bg-red-100' : 'bg-brand-100'
                      )}>
                        <span className={cn('text-xs font-black', hasUrgent ? 'text-red-700' : 'text-brand-700')}>
                          {initials}
                        </span>
                      </div>

                      {/* Customer info */}
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-semibold truncate leading-tight', hasUrgent ? 'text-red-900' : 'text-slate-800')}>
                          {group.customer_name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">{group.customer_phone}</p>
                      </div>

                      {/* Urgent chip — only when has urgent bills */}
                      {hasUrgent && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shrink-0 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                          {urgentCount === 1 ? 'URGENT' : `${urgentCount} URGENT`}
                        </span>
                      )}

                      {/* Bill count */}
                      <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-full shrink-0">
                        {group.bills.length} bill{group.bills.length !== 1 ? 's' : ''}
                      </span>

                      {/* Amounts */}
                      <div className="text-end shrink-0 hidden sm:block">
                        <p className="text-sm font-bold text-slate-800">{formatCurrency(totalAmt)}</p>
                        <p className={cn('text-xs mt-0.5 font-semibold', totalBalance > 0 ? 'text-red-500' : 'text-emerald-500')}>
                          {totalBalance > 0 ? `−${formatCurrency(totalBalance)}` : `✓ ${t('paid')}`}
                        </p>
                      </div>

                      {/* Expand chevron */}
                      <div className={cn('shrink-0 transition-colors', hasUrgent ? 'text-red-300 group-hover:text-red-500' : 'text-slate-300 group-hover:text-brand-400')}>
                        {isExpanded
                          ? <ChevronDown  size={15} />
                          : <ChevronRight size={15} />
                        }
                      </div>
                    </button>

                    {/* Expanded bill rows */}
                    {isExpanded && group.bills.map((bill) => {
                      const rem        = parseFloat(bill.remaining_balance);
                      const overdue    = bill.due_date && new Date(bill.due_date) < new Date();
                      const isUrgent   = bill.priority === 'urgent';
                      return (
                        <button
                          key={bill.id}
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          className={cn(
                            'group w-full flex items-center gap-3.5 pl-16 pr-5 py-2.5 transition-colors cursor-pointer text-start border-t border-slate-100',
                            isUrgent ? 'bg-red-50/60 hover:bg-red-50' : 'bg-slate-50/70 hover:bg-brand-50/50'
                          )}
                        >
                          {/* Indent line */}
                          <div className="absolute left-12 w-px h-5 bg-slate-200 hidden" />

                          {/* Bill number chip */}
                          <span className={cn(
                            'font-mono text-xs font-bold px-2 py-1 rounded-lg shrink-0 transition-colors',
                            isUrgent
                              ? 'text-red-700 bg-red-50 border border-red-200 group-hover:border-red-400'
                              : 'text-brand-600 bg-white border border-brand-100 group-hover:border-brand-300'
                          )}>
                            {bill.bill_number}
                          </span>

                          {/* Status + priority */}
                          <StatusBadge status={bill.status} />
                          {bill.priority && bill.priority !== 'normal' && (
                            <PriorityBadge priority={bill.priority} />
                          )}

                          <div className="flex-1" />

                          {/* Amounts */}
                          <div className="text-end shrink-0 hidden sm:block">
                            <p className="text-sm font-semibold text-slate-700">{formatCurrency(bill.total_amount)}</p>
                            <p className={cn('text-xs mt-0.5', rem > 0 ? 'text-red-500 font-medium' : 'text-emerald-500')}>
                              {rem > 0 ? `−${formatCurrency(rem)}` : `✓ paid`}
                            </p>
                          </div>

                          {/* Due date */}
                          {bill.due_date ? (
                            <span className={cn(
                              'text-xs font-semibold shrink-0 hidden md:block',
                              overdue ? 'text-red-500' : 'text-slate-400'
                            )}>
                              {overdue ? '⚠ ' : ''}{formatDate(bill.due_date)}
                            </span>
                          ) : (
                            <span className="text-slate-200 text-xs shrink-0 hidden md:block">—</span>
                          )}

                          <ChevronRight size={13} className="text-slate-200 group-hover:text-brand-400 shrink-0 transition-colors" />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────── */}
        <div className="space-y-5">

          {/* Quick Actions — TOP PRIORITY */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionHead title={t('quick_actions')} />
            <div className="space-y-2">
              <QAction
                icon={Plus}
                label={shop.cta_text || t('new_bill')}
                sub={t('create_order')}
                onClick={() => navigate(shop.cta_route || '/bills/new')}
                primary
              />
              <QAction
                icon={Users}
                label={t('add_customer')}
                sub={t('register_client')}
                iconClass="bg-emerald-50 text-emerald-600"
                onClick={() => navigate('/customers')}
              />
              <QAction
                icon={BarChart2}
                label={t('view_reports')}
                sub={t('sales_analytics')}
                iconClass="bg-violet-50 text-violet-600"
                onClick={() => navigate('/reports')}
              />
              <QAction
                icon={Boxes}
                label={t('inventory')}
                sub={t('prices_categories')}
                iconClass="bg-amber-50 text-amber-600"
                onClick={() => navigate('/inventory')}
              />
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <SectionHead
              title={t('top_products')}
              action={t('view_all')}
              onAction={() => navigate('/products')}
            />

            {loadingTop ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-9 bg-slate-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-5">{t('no_sales_yet')}</p>
            ) : (
              <div className="space-y-3">
                {products.map((p, i) => {
                  const pct = maxRevenue > 0
                    ? Math.round((parseFloat(p.total_revenue) / maxRevenue) * 100)
                    : 0;
                  const medals = ['text-amber-400', 'text-slate-400', 'text-amber-600'];
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-2.5 mb-1">
                        <span className={cn('text-xs font-black w-4 text-center shrink-0', medals[i] ?? 'text-slate-300')}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate leading-tight">{p.name}</p>
                        </div>
                        <div className="text-end shrink-0">
                          <p className="text-xs font-black text-emerald-600">{formatCurrency(p.total_revenue)}</p>
                          <p className="text-[10px] text-slate-400">{p.order_count} {t('orders')}</p>
                        </div>
                      </div>
                      {/* Revenue bar */}
                      <div className="ms-6 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-500', i === 0 ? 'bg-brand-500' : 'bg-slate-300')}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stock Alerts */}
          {alerts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <SectionHead
                title={t('stock_alerts')}
                action={t('manage')}
                onAction={() => navigate('/inventory')}
              />
              <div className="space-y-2.5">
                {alerts.map((item) => {
                  const isCritical = item.alert_level === 'critical';
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl border',
                        isCritical
                          ? 'bg-red-50 border-red-100'
                          : 'bg-amber-50 border-amber-100'
                      )}
                    >
                      <div className={cn('w-2 h-2 rounded-full shrink-0', isCritical ? 'bg-red-500' : 'bg-amber-500')} />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-xs font-bold truncate', isCritical ? 'text-red-800' : 'text-amber-800')}>
                          {item.name}
                        </p>
                        <p className={cn('text-[10px] mt-0.5', isCritical ? 'text-red-500' : 'text-amber-600')}>
                          {parseFloat(item.current_stock).toLocaleString()} {item.unit} remaining
                        </p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-black uppercase tracking-wide shrink-0',
                        isCritical ? 'text-red-600' : 'text-amber-600'
                      )}>
                        {isCritical ? t('critical') : t('low')}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
