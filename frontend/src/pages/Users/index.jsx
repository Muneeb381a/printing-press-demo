import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  KeyRound, UserX, UserCheck2, X, Eye, EyeOff,
  ShieldCheck, LogIn, UserCog, AlertCircle,
} from 'lucide-react';
import { PageHeader, Button } from '../../components/ui/index.js';
import * as api from '../../api/users.js';
import cn from '../../utils/cn.js';

// ── Create Login Modal ─────────────────────────────────────────
const CreateLoginModal = ({ employee, onClose }) => {
  const qc = useQueryClient();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.createUser({
      username:   username.trim().toLowerCase(),
      fullName:   employee.employee_name,
      password,
      employeeId: employee.employee_id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Login created for ${employee.employee_name}`);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to create login'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!username.trim()) return toast.error('Username is required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-black text-slate-900 text-base">Create Login</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Creating login for <span className="font-bold text-slate-800">{employee.employee_name}</span>
          {employee.hr_role && <span className="text-slate-400"> · {employee.hr_role}</span>}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
              Username *
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              placeholder="e.g. ali123"
              required
              autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">Lowercase letters and numbers only</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 6 characters"
                required
                className="w-full px-4 py-2.5 pe-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold cursor-pointer transition-colors disabled:opacity-60">
              {isPending ? 'Creating…' : 'Create Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Reset Password Modal ───────────────────────────────────────
const ResetModal = ({ emp, onClose }) => {
  const qc = useQueryClient();
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const { mutate, isPending } = useMutation({
    mutationFn: () => api.resetPassword(emp.user_id, password),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success(`Password reset for ${emp.username}`);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to reset password'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (password.length < 6) return toast.error('Password must be at least 6 characters');
    mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-slate-900 text-base">Reset Password</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          New password for <span className="font-bold text-slate-800">@{emp.username}</span>
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              autoFocus required
              className="w-full px-4 py-2.5 pe-10 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <button type="button" onClick={() => setShowPass(v => !v)}
              className="absolute inset-e-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold cursor-pointer transition-colors disabled:opacity-60">
              {isPending ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────
const UserManagement = () => {
  const qc = useQueryClient();
  const [createFor, setCreateFor] = useState(null);  // employee obj
  const [resetFor,  setResetFor]  = useState(null);  // row obj

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  api.getUsers,
  });
  const employees = data?.data || [];

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => api.updateUser(id, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Account status updated');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.deactivateUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      toast.success('Login deactivated');
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const withLogin    = employees.filter(e => e.user_id != null);
  const withoutLogin = employees.filter(e => e.user_id == null);

  return (
    <div className="max-w-3xl mx-auto">
      <PageHeader
        title="Employee Accounts"
        subtitle="Manage app login access for your employees"
      />

      {/* Permission info */}
      <div className="mb-5 bg-brand-50 border border-brand-100 rounded-2xl px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={18} className="text-brand-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-brand-800">Employee Permissions</p>
          <p className="text-xs text-brand-600 mt-0.5">
            Employees can create bills, view their own bills only, and mark self-attendance via GPS.
            They cannot access reports, expenses, payroll, settings, or other employees' bills.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <UserCog size={36} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-400">No employees found</p>
          <p className="text-xs text-slate-300 mt-1">Add employees in HR → Employees first</p>
        </div>
      ) : (
        <div className="space-y-3">

          {/* Employees WITH login */}
          {withLogin.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">
                Has Login Access ({withLogin.length})
              </p>
              <div className="space-y-2">
                {withLogin.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className={cn(
                      'bg-white border rounded-2xl px-4 py-3.5 shadow-sm flex items-center gap-3',
                      emp.is_active ? 'border-slate-200' : 'border-slate-100 opacity-60'
                    )}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0',
                      emp.is_active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-400'
                    )}>
                      {emp.employee_name?.[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm text-slate-900 truncate">{emp.employee_name}</p>
                        {emp.hr_role && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                            {emp.hr_role}
                          </span>
                        )}
                        {!emp.is_active && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-400">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 font-mono">@{emp.username}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setResetFor(emp)}
                        title="Reset password"
                        className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                      >
                        <KeyRound size={15} />
                      </button>

                      <button
                        onClick={() => toggleMutation.mutate({ id: emp.user_id, isActive: !emp.is_active })}
                        disabled={toggleMutation.isPending}
                        title={emp.is_active ? 'Disable login' : 'Enable login'}
                        className={cn(
                          'p-2 rounded-xl transition-colors cursor-pointer disabled:opacity-50',
                          emp.is_active
                            ? 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        )}
                      >
                        {emp.is_active ? <UserX size={15} /> : <UserCheck2 size={15} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employees WITHOUT login */}
          {withoutLogin.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1 mt-4">
                No Login Yet ({withoutLogin.length})
              </p>
              <div className="space-y-2">
                {withoutLogin.map((emp) => (
                  <div
                    key={emp.employee_id}
                    className="bg-white border border-dashed border-slate-200 rounded-2xl px-4 py-3.5 flex items-center gap-3"
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm shrink-0">
                      {emp.employee_name?.[0]?.toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-700 truncate">{emp.employee_name}</p>
                      {emp.hr_role && (
                        <p className="text-xs text-slate-400">{emp.hr_role}</p>
                      )}
                    </div>

                    {/* Create login */}
                    <button
                      onClick={() => setCreateFor(emp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      <LogIn size={13} />
                      Create Login
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No employees in HR at all */}
          {employees.length > 0 && withoutLogin.length === 0 && withLogin.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm flex items-center justify-center gap-2">
              <AlertCircle size={16} />
              All employees already have login access
            </div>
          )}
        </div>
      )}

      {createFor && (
        <CreateLoginModal employee={createFor} onClose={() => setCreateFor(null)} />
      )}
      {resetFor && (
        <ResetModal emp={resetFor} onClose={() => setResetFor(null)} />
      )}
    </div>
  );
};

export default UserManagement;
