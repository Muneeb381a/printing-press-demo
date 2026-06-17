import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ChevronLeft, ChevronRight, CalendarDays, BarChart2,
  CheckCircle2, XCircle, Clock, Plane, Save, Users,
  CheckCheck, ChevronsUpDown, MapPin, Loader2,
} from 'lucide-react';
import { PageHeader, Button } from '../../components/ui/index.js';
import * as api from '../../api/attendance.js';
import cn from '../../utils/cn.js';
import { useAuth } from '../../auth/AuthContext.jsx';

// ── Status config ──────────────────────────────────────────────
const STATUSES = [
  {
    value: 'present',  label: 'Present',  short: 'P',
    icon: CheckCircle2,
    color:    'text-emerald-700',
    bg:       'bg-emerald-50',
    border:   'border-emerald-200',
    activeBg: 'bg-emerald-500',
    activeText: 'text-white',
    strip:    'bg-emerald-500',
    pill:     'bg-emerald-100 text-emerald-700',
  },
  {
    value: 'absent',   label: 'Absent',   short: 'A',
    icon: XCircle,
    color:    'text-red-600',
    bg:       'bg-red-50',
    border:   'border-red-200',
    activeBg: 'bg-red-500',
    activeText: 'text-white',
    strip:    'bg-red-500',
    pill:     'bg-red-100 text-red-700',
  },
  {
    value: 'half_day', label: 'Half Day', short: 'H',
    icon: Clock,
    color:    'text-amber-700',
    bg:       'bg-amber-50',
    border:   'border-amber-200',
    activeBg: 'bg-amber-500',
    activeText: 'text-white',
    strip:    'bg-amber-500',
    pill:     'bg-amber-100 text-amber-700',
  },
  {
    value: 'leave',    label: 'Leave',    short: 'L',
    icon: Plane,
    color:    'text-blue-600',
    bg:       'bg-blue-50',
    border:   'border-blue-200',
    activeBg: 'bg-blue-500',
    activeText: 'text-white',
    strip:    'bg-blue-500',
    pill:     'bg-blue-100 text-blue-700',
  },
];

const statusCfg = (s) => STATUSES.find((x) => x.value === s);

const fmt = (dateStr) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

const isoDate = (d) => d.toISOString().split('T')[0];
const today   = () => isoDate(new Date());

// ── Daily View ─────────────────────────────────────────────────
const DailyView = () => {
  const qc = useQueryClient();
  const [date,     setDate]     = useState(today());
  const [draft,    setDraft]    = useState({});   // bulk draft only (from markAll)
  const [dirty,    setDirty]    = useState(false);
  const [savingId, setSavingId] = useState(null); // employee_id currently auto-saving

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-day', date],
    queryFn:  () => api.getByDate(date),
  });

  const employees = data?.data || [];

  const changeDate = (offset) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setDate(isoDate(d));
    setDraft({});
    setDirty(false);
  };

  // Single employee — auto-save immediately
  const mark = async (employeeId, status) => {
    if (savingId === employeeId) return; // already saving this employee
    setSavingId(employeeId);
    try {
      await api.markOne({ employeeId, date, status });
      qc.setQueryData(['attendance-day', date], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((emp) =>
            emp.employee_id === employeeId ? { ...emp, status } : emp
          ),
        };
      });
      qc.invalidateQueries({ queryKey: ['attendance-monthly'] });
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message);
    } finally {
      setSavingId(null);
    }
  };

  // Bulk — mark all in draft, requires Save button
  const markAll = (status) => {
    const all = {};
    employees.forEach((emp) => { all[emp.employee_id] = status; });
    setDraft(all);
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
      else    c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [employees, draft]);

  const allMarked = counts.unmarked === 0 && employees.length > 0;

  return (
    <div className="space-y-4">

      {/* ── Date Navigator ── */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm">
        <button onClick={() => changeDate(-1)}
          className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 cursor-pointer shrink-0">
          <ChevronLeft size={18} />
        </button>

        <div className="flex-1 text-center">
          <p className="font-bold text-slate-900 text-sm sm:text-base leading-tight">{fmt(date)}</p>
          {date === today() && (
            <span className="inline-block text-[11px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full mt-0.5">Today</span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {date !== today() && (
            <button onClick={() => { setDate(today()); setDraft({}); setDirty(false); }}
              className="text-xs font-semibold text-brand-600 hover:text-brand-800 px-2.5 py-1.5 rounded-lg hover:bg-brand-50 transition-colors cursor-pointer">
              Today
            </button>
          )}
          <button onClick={() => changeDate(1)}
            disabled={date >= today()}
            className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500 cursor-pointer">
            <ChevronRight size={18} />
          </button>
          <input
            type="date" value={date} max={today()}
            onChange={(e) => { setDate(e.target.value); setDraft({}); setDirty(false); }}
            className="text-xs border border-slate-200 rounded-xl px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          />
        </div>
      </div>

      {/* ── Summary + Bulk Actions ── */}
      {employees.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          {/* Summary chips */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Summary</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <div key={s.value} className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold', s.pill)}>
                  <s.icon size={11} />
                  {s.label}: <span>{counts[s.value] || 0}</span>
                </div>
              ))}
              {counts.unmarked > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                  Unmarked: {counts.unmarked}
                </div>
              )}
            </div>
          </div>

          {/* Bulk mark actions */}
          <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mark All As</p>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => markAll(s.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:shadow-sm',
                    s.bg, s.color, s.border,
                  )}
                >
                  <s.icon size={11} /> All {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Employee List ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <Users size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No active employees found</p>
          <p className="text-xs text-slate-300 mt-1">Add employees first from the Employees section</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => {
            const currentStatus = getStatus(emp);
            const cfg           = statusCfg(currentStatus);
            const isSaving      = savingId === emp.employee_id;
            const isModified    = draft[emp.employee_id] !== undefined;

            return (
              <div
                key={emp.employee_id}
                className={cn(
                  'bg-white border rounded-2xl overflow-hidden transition-all duration-150',
                  cfg ? 'border-l-4' : 'border-slate-200',
                  isSaving ? 'opacity-75' : '',
                  isModified ? 'shadow-md' : 'shadow-sm',
                )}
                style={cfg ? { borderLeftColor: cfg.strip.replace('bg-', '') } : {}}
              >
                <div className={cn('flex items-center gap-3 px-4 py-3', cfg ? `${cfg.bg}/30` : '')}>

                  {/* Color strip */}
                  {cfg && <div className={cn('w-1 self-stretch rounded-full shrink-0', cfg.strip)} />}

                  {/* Avatar */}
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 relative',
                    cfg ? `${cfg.bg} ${cfg.color}` : 'bg-slate-100 text-slate-400',
                  )}>
                    {isSaving
                      ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      : emp.employee_name?.[0]?.toUpperCase()
                    }
                  </div>

                  {/* Name + role + status badge */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm leading-tight truncate">{emp.employee_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-slate-400 truncate">{emp.role || 'Staff'}</p>
                      {isSaving ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400 animate-pulse">
                          Saving…
                        </span>
                      ) : cfg ? (
                        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', cfg.pill)}>
                          {cfg.label}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          Not Marked
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {STATUSES.map((s) => {
                      const active = currentStatus === s.value;
                      return (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => mark(emp.employee_id, s.value)}
                          disabled={isSaving}
                          title={s.label}
                          className={cn(
                            'w-9 h-9 rounded-xl text-xs font-black transition-all duration-150 border-2 flex items-center justify-center',
                            isSaving ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                            active
                              ? `${s.activeBg} ${s.activeText} border-transparent shadow-md scale-105`
                              : `${s.bg} ${s.color} border-transparent hover:border-current hover:scale-105`,
                          )}
                        >
                          {s.short}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky Save — only for bulk markAll ── */}
      {dirty && employees.length > 0 && (
        <div className="sticky bottom-4 flex justify-end pt-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className={cn(
              'flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm shadow-xl transition-all cursor-pointer',
              dirty
                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-600/30'
                : allMarked
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                : 'bg-slate-700 hover:bg-slate-800 text-white shadow-slate-700/20',
            )}
          >
            {saveMutation.isPending ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : allMarked ? (
              <CheckCheck size={16} />
            ) : (
              <Save size={16} />
            )}
            {saveMutation.isPending
              ? 'Saving…'
              : dirty
              ? `Save Attendance`
              : allMarked
              ? 'Save (All Marked)'
              : 'Save'}
          </button>
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

  const lookup = {};
  records.forEach((r) => {
    const day = new Date(r.date + 'T00:00:00').getDate();
    lookup[`${r.employee_id}-${day}`] = r.status;
  });

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const prevMonth = () => { if (month === 1) { setYear(y => y-1); setMonth(12); } else setMonth(m => m-1); };
  const nextMonth = () => {
    const n = new Date();
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth()+1)) return;
    if (month === 12) { setYear(y => y+1); setMonth(1); } else setMonth(m => m+1);
  };
  const isCurrentOrFuture = year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);

  return (
    <div className="space-y-4">

      {/* ── Month Navigator ── */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-4 shadow-sm">
        <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500 cursor-pointer">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-bold text-slate-900 text-base">{MONTH_NAMES[month-1]} {year}</p>
          {!isCurrentOrFuture && (
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth()+1); }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-800 mt-0.5 cursor-pointer">
              Go to current month
            </button>
          )}
        </div>
        <button onClick={nextMonth} disabled={isCurrentOrFuture}
          className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-slate-500 cursor-pointer">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {summary.map((emp) => (
            <div key={emp.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-black text-sm shrink-0">
                  {emp.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900 truncate">{emp.name}</p>
                  <p className="text-xs text-slate-400">{emp.role || 'Staff'}</p>
                </div>
                {/* Attendance % */}
                {(() => {
                  const total = (emp.present||0) + (emp.absent||0) + (emp.half_day||0) + (emp.leave||0);
                  const pct   = total > 0 ? Math.round(((emp.present||0) + (emp.half_day||0)*0.5) / total * 100) : 0;
                  return (
                    <div className={cn('text-sm font-black px-2 py-1 rounded-xl shrink-0', pct >= 80 ? 'bg-emerald-50 text-emerald-700' : pct >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600')}>
                      {pct}%
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {STATUSES.map((s) => (
                  <div key={s.value} className={cn('rounded-xl py-2 px-1 text-center', s.bg)}>
                    <p className={cn('text-base font-black leading-tight', s.color)}>{emp[s.value] || 0}</p>
                    <p className={cn('text-[10px] font-bold mt-0.5', s.color)}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Calendar Grid ── */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : summary.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <ChevronsUpDown size={32} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No attendance data for this month</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-4 py-3 font-bold text-slate-600 sticky left-0 bg-slate-50 min-w-[140px] z-10">
                    Employee
                  </th>
                  {days.map((d) => {
                    const dow = new Date(year, month-1, d).getDay();
                    const isWeekend = dow === 0 || dow === 6;
                    return (
                      <th key={d} className={cn(
                        'px-1 py-3 font-bold text-center min-w-[26px]',
                        isWeekend ? 'text-red-400 bg-red-50/50' : 'text-slate-500',
                      )}>
                        {d}
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 font-bold text-emerald-600 text-center min-w-[48px] border-l border-slate-100">P</th>
                  <th className="px-3 py-3 font-bold text-red-500   text-center min-w-[48px]">A</th>
                  <th className="px-3 py-3 font-bold text-amber-600 text-center min-w-[48px]">H</th>
                  <th className="px-3 py-3 font-bold text-blue-500  text-center min-w-[48px]">L</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((emp, idx) => (
                  <tr key={emp.id} className={cn('border-b border-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                    <td className={cn(
                      'px-4 py-2.5 font-semibold text-slate-800 sticky left-0 z-10 truncate max-w-[140px]',
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50',
                    )}>
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
                            <span className={cn(
                              'inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-black',
                              cfg.activeBg, cfg.activeText,
                            )}>
                              {cfg.short}
                            </span>
                          ) : (
                            <span className="text-slate-200 text-base leading-none">·</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 font-black text-emerald-600 border-l border-slate-100">{emp.present   || 0}</td>
                    <td className="text-center py-2 font-black text-red-500">  {emp.absent    || 0}</td>
                    <td className="text-center py-2 font-black text-amber-600">{emp.half_day  || 0}</td>
                    <td className="text-center py-2 font-black text-blue-500"> {emp.leave     || 0}</td>
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

// ── Employee: geo-fenced self-mark ────────────────────────────
const EmployeeAttendance = ({ user }) => {
  const [status,   setStatus]   = useState(null); // null | 'locating' | 'sending' | 'done' | 'error'
  const [message,  setMessage]  = useState('');

  const today = new Date().toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleMark = () => {
    if (!navigator.geolocation) {
      setStatus('error');
      setMessage('Location is not supported by your browser.');
      return;
    }
    setStatus('locating');
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setStatus('sending');
        try {
          const res = await api.markSelf(pos.coords.latitude, pos.coords.longitude);
          setStatus('done');
          setMessage(res.message || 'Attendance marked successfully!');
          toast.success('Attendance marked!');
        } catch (err) {
          setStatus('error');
          setMessage(err.response?.data?.error || 'Failed to mark attendance. Try again.');
        }
      },
      (err) => {
        setStatus('error');
        setMessage(
          err.code === 1
            ? 'Location permission denied. Please allow location access and try again.'
            : 'Could not get your location. Please try again.'
        );
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  return (
    <div className="max-w-sm mx-auto">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center space-y-6">

        {/* Date */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Today</p>
          <p className="text-base font-bold text-slate-900 leading-tight">{today}</p>
        </div>

        {/* Status icon */}
        <div className={cn(
          'w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300',
          status === 'done'    ? 'bg-emerald-100' :
          status === 'error'   ? 'bg-red-100' :
          status === 'locating' || status === 'sending' ? 'bg-brand-100' :
          'bg-slate-100'
        )}>
          {status === 'locating' || status === 'sending' ? (
            <Loader2 size={40} className="text-brand-600 animate-spin" />
          ) : status === 'done' ? (
            <CheckCircle2 size={40} className="text-emerald-600" />
          ) : status === 'error' ? (
            <XCircle size={40} className="text-red-500" />
          ) : (
            <MapPin size={40} className="text-slate-400" />
          )}
        </div>

        {/* User greeting */}
        <p className="text-sm text-slate-500">
          Hello, <span className="font-bold text-slate-800">{user?.fullName || user?.username}</span>
        </p>

        {/* Status message */}
        {message && (
          <p className={cn(
            'text-sm font-semibold px-4 py-3 rounded-xl',
            status === 'done'  ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
          )}>
            {message}
          </p>
        )}

        {/* Mark button */}
        {status !== 'done' && (
          <button
            type="button"
            onClick={handleMark}
            disabled={status === 'locating' || status === 'sending'}
            className={cn(
              'w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl',
              'font-bold text-base transition-all duration-150 cursor-pointer',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              status === 'error'
                ? 'bg-slate-700 hover:bg-slate-800 text-white'
                : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/25 active:scale-[0.98]'
            )}
          >
            {status === 'locating' ? (
              <><Loader2 size={18} className="animate-spin" /> Getting location…</>
            ) : status === 'sending' ? (
              <><Loader2 size={18} className="animate-spin" /> Marking attendance…</>
            ) : status === 'error' ? (
              <><MapPin size={18} /> Try Again</>
            ) : (
              <><MapPin size={18} /> Mark My Attendance</>
            )}
          </button>
        )}

        {status === 'done' && (
          <button
            type="button"
            onClick={() => { setStatus(null); setMessage(''); }}
            className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
          >
            Mark Again
          </button>
        )}

        <p className="text-[11px] text-slate-300 leading-relaxed">
          Your GPS location is used only to verify you are at the shop.
          It is not stored or shared.
        </p>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const AttendancePage = () => {
  const [view, setView] = useState('daily');
  const { isEmployee, user } = useAuth();

  // Employees only see the self-mark panel
  if (isEmployee) {
    return (
      <div className="max-w-4xl mx-auto">
        <PageHeader
          title="Attendance"
          subtitle="Mark your attendance for today"
        />
        <EmployeeAttendance user={user} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
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
                view === 'daily' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <CalendarDays size={14} /> Daily
            </button>
            <button
              type="button"
              onClick={() => setView('monthly')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all cursor-pointer',
                view === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <BarChart2 size={14} /> Monthly
            </button>
          </div>
        }
      />

      {view === 'daily' ? <DailyView /> : <MonthlyView />}
    </div>
  );
};

export default AttendancePage;
