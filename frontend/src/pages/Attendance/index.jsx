import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, CalendarDays, BarChart2,
  CheckCircle2, XCircle, Clock, Plane, Save,
} from 'lucide-react';
import { PageHeader, Button } from '../../components/ui/index.js';
import * as api from '../../api/attendance.js';
import cn from '../../utils/cn.js';

// ── Status config ──────────────────────────────────────────────
const STATUSES = [
  { value: 'present',  label: 'Present',  short: 'P',  icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50',  ring: 'ring-emerald-400', activeBg: 'bg-emerald-500 text-white' },
  { value: 'absent',   label: 'Absent',   short: 'A',  icon: XCircle,      color: 'text-red-500',     bg: 'bg-red-50',      ring: 'ring-red-400',     activeBg: 'bg-red-500 text-white'     },
  { value: 'half_day', label: 'Half Day', short: 'H',  icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',    ring: 'ring-amber-400',   activeBg: 'bg-amber-500 text-white'   },
  { value: 'leave',    label: 'Leave',    short: 'L',  icon: Plane,        color: 'text-blue-500',    bg: 'bg-blue-50',     ring: 'ring-blue-400',    activeBg: 'bg-blue-500 text-white'    },
];

const statusCfg = (s) => STATUSES.find((x) => x.value === s) ?? STATUSES[0];

const fmt = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const isoDate = (d) => d.toISOString().split('T')[0];
const today   = () => isoDate(new Date());

// ── Daily View ─────────────────────────────────────────────────
const DailyView = () => {
  const qc   = useQueryClient();
  const [date,   setDate]   = useState(today());
  const [draft,  setDraft]  = useState({});   // { employeeId: status }
  const [dirty,  setDirty]  = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-day', date],
    queryFn:  () => api.getByDate(date),
    onSuccess: () => { setDraft({}); setDirty(false); },
  });

  const employees = data?.data || [];

  const changeDate = (offset) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setDate(isoDate(d));
    setDraft({});
    setDirty(false);
  };

  const mark = (employeeId, status) => {
    setDraft((p) => ({ ...p, [employeeId]: status }));
    setDirty(true);
  };

  const getStatus = (emp) => draft[emp.employee_id] ?? emp.status;

  const saveMutation = useMutation({
    mutationFn: () => {
      const records = employees.map((emp) => ({
        employeeId: emp.employee_id,
        date,
        status: getStatus(emp) || 'present',
      }));
      return api.markBulk(records);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance-day', date] });
      qc.invalidateQueries({ queryKey: ['attendance-monthly'] });
      setDraft({});
      setDirty(false);
      toast.success('Attendance save ho gayi!');
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message),
  });

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, half_day: 0, leave: 0, unmarked: 0 };
    employees.forEach((emp) => {
      const s = getStatus(emp);
      if (!s) c.unmarked++;
      else c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [employees, draft]);

  return (
    <div className="space-y-5">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <button onClick={() => changeDate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-bold text-slate-900 text-sm sm:text-base">{fmt(date)}</p>
          {date === today() && (
            <span className="text-xs font-semibold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">Today</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(1)}
            disabled={date >= today()}
            className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500 hover:text-slate-800 cursor-pointer">
            <ChevronRight size={18} />
          </button>
          <input
            type="date" value={date} max={today()}
            onChange={(e) => { setDate(e.target.value); setDraft({}); setDirty(false); }}
            className="text-xs border border-slate-300 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <div key={s.value} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold', s.bg, s.color)}>
            <s.icon size={12} />
            {s.label}: {counts[s.value] || 0}
          </div>
        ))}
        {counts.unmarked > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
            Not marked: {counts.unmarked}
          </div>
        )}
      </div>

      {/* Employee List */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No active employees found. Add employees first.
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => {
            const currentStatus = getStatus(emp);
            return (
              <div key={emp.employee_id}
                className={cn(
                  'bg-white border rounded-2xl px-4 py-3 flex items-center gap-4 transition-all',
                  dirty && draft[emp.employee_id] ? 'border-brand-200 shadow-sm' : 'border-slate-200',
                )}>
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-black text-sm shrink-0">
                  {emp.employee_name?.[0]?.toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{emp.employee_name}</p>
                  <p className="text-xs text-slate-400 truncate">{emp.role || 'Staff'}</p>
                </div>
                {/* Status Buttons */}
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => mark(emp.employee_id, s.value)}
                      title={s.label}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                        currentStatus === s.value
                          ? `${s.activeBg} border-transparent shadow-sm`
                          : `${s.bg} ${s.color} border-transparent hover:ring-2 hover:${s.ring}`,
                      )}
                    >
                      {s.short}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {employees.length > 0 && (
        <div className="sticky bottom-4 flex justify-end">
          <Button
            icon={<Save size={15} />}
            loading={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn('shadow-lg transition-all', dirty ? 'opacity-100' : 'opacity-70')}
          >
            {dirty ? 'Save Attendance' : 'Save (All Marked)'}
          </Button>
        </div>
      )}
    </div>
  );
};

// ── Monthly Report ─────────────────────────────────────────────
const MonthlyView = () => {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-monthly', year, month],
    queryFn:  () => api.getMonthly(year, month),
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const summary     = data?.data?.summary  || [];
  const records     = data?.data?.records  || [];

  // Build lookup: employeeId+day → status
  const lookup = {};
  records.forEach((r) => {
    const day = new Date(r.date + 'T00:00:00').getDate();
    lookup[`${r.employee_id}-${day}`] = r.status;
  });

  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const nextMonth = () => {
    const n = new Date(); if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth()+1)) return;
    if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1);
  };

  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  return (
    <div className="space-y-5">
      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <p className="font-bold text-slate-900">{MONTH_NAMES[month-1]} {year}</p>
        <button onClick={nextMonth} disabled={isCurrentOrFuture}
          className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500 cursor-pointer">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.map((emp) => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-black text-sm shrink-0">
                  {emp.name[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">{emp.name}</p>
                  <p className="text-xs text-slate-400">{emp.role || 'Staff'}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 text-center">
                {STATUSES.map((s) => (
                  <div key={s.value} className={cn('rounded-xl py-2 px-1', s.bg)}>
                    <p className={cn('text-lg font-black', s.color)}>{emp[s.value] || 0}</p>
                    <p className={cn('text-[10px] font-semibold', s.color)}>{s.short}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Calendar Grid */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : summary.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-400 text-sm">
          No attendance data for this month
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 sticky left-0 bg-white min-w-[140px]">
                    Employee
                  </th>
                  {days.map((d) => {
                    const dow = new Date(year, month-1, d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th key={d} className={cn('px-1 py-3 font-semibold text-center min-w-[28px]', isWeekend ? 'text-red-400' : 'text-slate-500')}>
                        {d}
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 font-semibold text-slate-600 text-center min-w-[60px]">P</th>
                  <th className="px-3 py-3 font-semibold text-slate-600 text-center min-w-[60px]">A</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((emp, idx) => (
                  <tr key={emp.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                    <td className={cn('px-4 py-2.5 font-semibold text-slate-800 sticky left-0 truncate max-w-[140px]', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50')}>
                      {emp.name}
                    </td>
                    {days.map((d) => {
                      const st  = lookup[`${emp.id}-${d}`];
                      const cfg = st ? statusCfg(st) : null;
                      const dow = new Date(year, month-1, d).getDay();
                      const isWeekend = dow === 0 || dow === 6;
                      return (
                        <td key={d} className={cn('text-center py-2', isWeekend && 'bg-red-50/30')}>
                          {cfg ? (
                            <span className={cn('inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold', cfg.activeBg)}>
                              {cfg.short}
                            </span>
                          ) : (
                            <span className="text-slate-200">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-bold text-emerald-600">{emp.present || 0}</td>
                    <td className="text-center py-2 font-bold text-red-500">{emp.absent   || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const AttendancePage = () => {
  const [view, setView] = useState('daily');

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Attendance"
        subtitle="Mark daily attendance and view monthly reports"
        action={
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setView('daily')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                view === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <CalendarDays size={14} /> Daily
            </button>
            <button
              type="button"
              onClick={() => setView('monthly')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                view === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <BarChart2 size={14} /> Monthly
            </button>
          </div>
        }
      />

      {view === 'daily'   ? <DailyView   /> : <MonthlyView />}
    </div>
  );
};

export default AttendancePage;
