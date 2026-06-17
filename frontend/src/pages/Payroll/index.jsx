import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, Calculator, CheckCircle2,
  Clock, Wallet, Users, TrendingDown, Banknote,
  Printer, BadgeCheck, RefreshCw, Edit3, X, Check,
} from 'lucide-react';
import { Button, PageHeader, Modal } from '../../components/ui/index.js';
import Badge from '../../components/ui/Badge.jsx';
import { formatCurrency } from '../../utils/format.js';
import cn from '../../utils/cn.js';
import * as api from '../../api/payroll.js';
import SalarySlip from './SalarySlip.jsx';

// ── Month helpers ─────────────────────────────────────────────────

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const today = () => {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
};

// ── Stat Card ─────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color = 'brand', large }) => {
  const colors = {
    brand:  'from-brand-500  to-brand-700  text-white',
    emerald:'from-emerald-500 to-emerald-700 text-white',
    red:    'from-red-500    to-red-700    text-white',
    amber:  'from-amber-400  to-amber-600  text-white',
    slate:  'bg-white border border-slate-200 text-slate-700',
  };
  const isFlat = color === 'slate';
  return (
    <div className={cn(
      'rounded-2xl p-5 flex items-center gap-4 shadow-sm',
      isFlat ? colors.slate : `bg-gradient-to-br ${colors[color]} shadow-lg`
    )}>
      <div className={cn(
        'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
        isFlat ? 'bg-slate-100' : 'bg-white/20'
      )}>
        <Icon size={22} className={isFlat ? 'text-slate-600' : 'text-white'} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold tracking-wide uppercase mb-0.5',
          isFlat ? 'text-slate-400' : 'text-white/70')}>{label}</p>
        <p className={cn('font-bold truncate', large ? 'text-2xl' : 'text-xl',
          isFlat ? 'text-slate-800' : 'text-white')}>{value}</p>
        {sub && <p className={cn('text-xs mt-0.5', isFlat ? 'text-slate-400' : 'text-white/60')}>{sub}</p>}
      </div>
    </div>
  );
};

// ── Attendance Chips ──────────────────────────────────────────────

const AttChip = ({ label, value, color }) => (
  <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold', color)}>
    {label}: {value}
  </span>
);

// ── Inline Bonus Editor ───────────────────────────────────────────

const BonusEditor = ({ record, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(record.bonus || 0));

  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => api.updateRecord(record.id, { bonus: parseFloat(val) || 0, notes: record.notes }),
    onSuccess: (res) => {
      qc.setQueryData(['payroll', record.year, record.month], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((r) => r.id === res.data.id ? { ...r, ...res.data } : r),
        };
      });
      toast.success('Bonus updated');
      setEditing(false);
      onSave?.();
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed to save'),
  });

  if (!editing) {
    return (
      <button
        onClick={() => { setVal(String(record.bonus || 0)); setEditing(true); }}
        className="flex items-center gap-1 text-sm text-slate-700 hover:text-brand-600 group"
      >
        <span className="font-mono font-semibold">
          {parseFloat(record.bonus || 0) > 0
            ? <span className="text-emerald-600">+{formatCurrency(record.bonus)}</span>
            : <span className="text-slate-400 text-xs">Add bonus</span>
          }
        </span>
        <Edit3 size={11} className="text-slate-300 group-hover:text-brand-500 transition-colors" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        min="0"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-24 px-2 py-1 border border-brand-400 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') mutation.mutate();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
      >
        <Check size={12} />
      </button>
      <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200">
        <X size={12} />
      </button>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────

const Payroll = () => {
  const now = today();
  const [year,  setYear]  = useState(now.year);
  const [month, setMonth] = useState(now.month);
  const [slipRecord, setSlipRecord] = useState(null);
  const qc = useQueryClient();

  const queryKey = ['payroll', year, month];

  const { data: res, isLoading, isFetching } = useQuery({
    queryKey,
    queryFn: () => api.getByMonth(year, month),
    staleTime: 30_000,
  });

  const records      = res?.data || [];
  const workingDays  = res?.workingDays || 0;
  const hasRecords   = records.length > 0;

  const calcMutation = useMutation({
    mutationFn: () => api.calculate(year, month),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, res);
      toast.success(`Payroll calculated for ${MONTH_NAMES[month-1]} ${year}`);
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Calculation failed'),
  });

  const payMutation = useMutation({
    mutationFn: (id) => api.markPaid(id),
    onSuccess: (res) => {
      qc.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((r) => r.id === res.data.id ? { ...r, ...res.data } : r),
        };
      });
      toast.success('Salary marked as paid');
    },
    onError: (err) => toast.error(err?.response?.data?.error || 'Failed'),
  });

  // ── Navigation ────────────────────────────────────────────────

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };
    if (next.y > now.year || (next.y === now.year && next.m > now.month)) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };
  const isCurrentMonth = year === now.year && month === now.month;

  // ── Summary Stats ─────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalGross     = records.reduce((s, r) => s + parseFloat(r.gross_salary || 0), 0);
    const totalDeduction = records.reduce((s, r) => s + parseFloat(r.deduction    || 0), 0);
    const totalBonus     = records.reduce((s, r) => s + parseFloat(r.bonus        || 0), 0);
    const totalNet       = records.reduce((s, r) => s + parseFloat(r.net_salary   || 0), 0);
    const paidCount      = records.filter((r) => r.status === 'paid').length;
    const pendingCount   = records.filter((r) => r.status === 'draft').length;
    return { totalGross, totalDeduction, totalBonus, totalNet, paidCount, pendingCount };
  }, [records]);

  // ── Render ────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payroll"
        subtitle={`${MONTH_NAMES[month-1]} ${year} — ${workingDays} working days (Fri off)`}
        action={
          <div className="flex items-center gap-2">
            {/* Month navigator */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
              <button
                onClick={prevMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 text-sm font-semibold text-slate-700 min-w-[130px] text-center">
                {MONTH_NAMES[month-1]} {year}
              </span>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            <Button
              icon={hasRecords
                ? <RefreshCw size={15} className={calcMutation.isPending ? 'animate-spin' : ''} />
                : <Calculator size={15} />}
              onClick={() => calcMutation.mutate()}
              loading={calcMutation.isPending}
              variant={hasRecords ? 'secondary' : 'primary'}
            >
              {hasRecords ? 'Recalculate' : 'Calculate Payroll'}
            </Button>
          </div>
        }
      />

      {/* ── Stats Row ── */}
      {hasRecords && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users}      label="Employees"       value={records.length}            sub={`${stats.paidCount} paid · ${stats.pendingCount} pending`} color="slate" />
          <StatCard icon={Wallet}     label="Gross Payroll"   value={formatCurrency(stats.totalGross)}     sub="Before deductions" color="brand" />
          <StatCard icon={TrendingDown} label="Total Deductions" value={formatCurrency(stats.totalDeduction)} sub={`+ ${formatCurrency(stats.totalBonus)} bonus`} color="red" />
          <StatCard icon={Banknote}   label="Net Payable"     value={formatCurrency(stats.totalNet)}       sub="Amount to disburse" color="emerald" large />
        </div>
      )}

      {/* ── Empty state ── */}
      {!isLoading && !hasRecords && (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-50 flex items-center justify-center">
            <Calculator size={28} className="text-brand-500" />
          </div>
          <h3 className="text-slate-800 font-semibold text-lg mb-1">No payroll for {MONTH_NAMES[month-1]} {year}</h3>
          <p className="text-slate-400 text-sm mb-6">
            Click "Calculate Payroll" to generate salary records from attendance data.
          </p>
          <Button icon={<Calculator size={15} />} onClick={() => calcMutation.mutate()} loading={calcMutation.isPending}>
            Calculate Payroll
          </Button>
        </div>
      )}

      {/* ── Payroll Table ── */}
      {hasRecords && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Salary Breakdown</h2>
            {isFetching && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Attendance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Deduction</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Bonus</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Salary</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((rec) => {
                  const isPaid      = rec.status === 'paid';
                  const hasDeduct   = parseFloat(rec.deduction || 0) > 0;
                  const absent      = parseFloat(rec.absent_days  || 0);
                  const halfDay     = parseFloat(rec.half_days    || 0);
                  const present     = parseFloat(rec.present_days || 0);
                  const leave       = parseFloat(rec.leave_days   || 0);

                  return (
                    <tr
                      key={rec.id}
                      className={cn(
                        'group hover:bg-slate-50/60 transition-colors',
                        isPaid && 'bg-emerald-50/30'
                      )}
                    >
                      {/* Employee */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0',
                            isPaid
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-brand-100 text-brand-700'
                          )}>
                            {(rec.employee_name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{rec.employee_name}</p>
                            <p className="text-xs text-slate-400">{rec.employee_role}</p>
                          </div>
                        </div>
                      </td>

                      {/* Attendance chips */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          <AttChip label="P" value={present}  color="bg-emerald-50 text-emerald-700" />
                          {absent   > 0 && <AttChip label="A" value={absent}   color="bg-red-50 text-red-700" />}
                          {halfDay  > 0 && <AttChip label="H" value={halfDay}  color="bg-amber-50 text-amber-700" />}
                          {leave    > 0 && <AttChip label="L" value={leave}    color="bg-blue-50 text-blue-700" />}
                          <span className="text-[10px] text-slate-300 ml-1 self-center">/{rec.working_days}d</span>
                        </div>
                      </td>

                      {/* Daily rate */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono text-slate-600 text-xs">
                          {formatCurrency(rec.daily_rate)}
                        </span>
                      </td>

                      {/* Gross */}
                      <td className="px-4 py-4 text-right">
                        <span className="font-mono font-semibold text-slate-700">
                          {formatCurrency(rec.gross_salary)}
                        </span>
                      </td>

                      {/* Deduction */}
                      <td className="px-4 py-4 text-right">
                        {hasDeduct ? (
                          <span className="font-mono font-semibold text-red-600">
                            −{formatCurrency(rec.deduction)}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Bonus (editable) */}
                      <td className="px-4 py-4 text-right">
                        {!isPaid
                          ? <div className="flex justify-end"><BonusEditor record={rec} /></div>
                          : parseFloat(rec.bonus || 0) > 0
                            ? <span className="font-mono font-semibold text-emerald-600">+{formatCurrency(rec.bonus)}</span>
                            : <span className="text-slate-300 text-xs">—</span>
                        }
                      </td>

                      {/* Net salary */}
                      <td className="px-4 py-4 text-right">
                        <span className={cn(
                          'font-mono font-bold text-base',
                          isPaid ? 'text-emerald-700' : 'text-slate-900'
                        )}>
                          {formatCurrency(rec.net_salary)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        {isPaid ? (
                          <Badge variant="green">
                            <BadgeCheck size={10} className="mr-1" />Paid
                          </Badge>
                        ) : (
                          <Badge variant="amber">Pending</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSlipRecord(rec)}
                            className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Print Salary Slip"
                          >
                            <Printer size={15} />
                          </button>
                          {!isPaid && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Mark ${rec.employee_name}'s salary as paid?`)) {
                                  payMutation.mutate(rec.id);
                                }
                              }}
                              disabled={payMutation.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={13} />
                              Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer totals */}
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-5 py-3 font-semibold text-slate-600 text-sm" colSpan={3}>
                    Total ({records.length} employees)
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-slate-800">
                    {formatCurrency(stats.totalGross)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-red-600">
                    {stats.totalDeduction > 0 ? `−${formatCurrency(stats.totalDeduction)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-emerald-600">
                    {stats.totalBonus > 0 ? `+${formatCurrency(stats.totalBonus)}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-bold font-mono text-brand-700 text-base">
                    {formatCurrency(stats.totalNet)}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-center">
                    <span className="text-xs text-slate-400">
                      {stats.paidCount}/{records.length} paid
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      {hasRecords && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-400 px-1">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>P = Present (paid)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400"></span>A = Absent (full day deduction)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400"></span>H = Half Day (50% deduction)</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400"></span>L = Leave (paid)</span>
          <span className="flex items-center gap-1.5"><Clock size={10} />Friday = weekly off (not counted)</span>
        </div>
      )}

      {/* ── Salary Slip Modal ── */}
      <Modal
        isOpen={!!slipRecord}
        onClose={() => setSlipRecord(null)}
        title="Salary Slip"
        size="lg"
      >
        {slipRecord && (
          <SalarySlip
            record={slipRecord}
            onClose={() => setSlipRecord(null)}
          />
        )}
      </Modal>
    </div>
  );
};

export default Payroll;
