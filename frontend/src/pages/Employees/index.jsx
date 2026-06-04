import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  UserPlus, Edit2, Trash2, Phone, Briefcase,
  DollarSign, Calendar, Users, Search,
} from 'lucide-react';
import { PageHeader, Modal, Button, Card, ConfirmDialog } from '../../components/ui/index.js';
import { formatCurrency } from '../../utils/format.js';
import * as api from '../../api/employees.js';
import cn from '../../utils/cn.js';

const STATUS_OPTS = [
  { value: 'active',   label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

const EmployeeForm = ({ employee, onDone }) => {
  const qc   = useQueryClient();
  const isEdit = Boolean(employee);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name:     employee?.name      || '',
      phone:    employee?.phone     || '',
      role:     employee?.role      || 'Staff',
      salary:   employee?.salary    || '',
      joinDate: employee?.join_date ? employee.join_date.split('T')[0] : new Date().toISOString().split('T')[0],
      status:   employee?.status    || 'active',
    },
  });

  const mutation = useMutation({
    mutationFn: (d) => isEdit
      ? api.updateEmployee(employee.id, d)
      : api.createEmployee(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(isEdit ? 'Employee updated!' : 'Employee added!');
      onDone();
    },
    onError: (e) => toast.error(e?.response?.data?.error || e.message),
  });

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            placeholder="e.g. Ali Raza"
            {...register('name', { required: 'Name is required' })}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all',
              errors.name ? 'border-red-400' : 'border-slate-300 hover:border-slate-400'
            )}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Phone</label>
          <input placeholder="03xxxxxxxxx" {...register('phone')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Role / Designation</label>
          <input placeholder="e.g. Operator" {...register('role')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Monthly Salary (₨)</label>
          <input type="number" min="0" step="100" placeholder="0" {...register('salary', { valueAsNumber: true })}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Join Date</label>
          <input type="date" {...register('joinDate')}
            className="w-full px-3 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all" />
        </div>

        {isEdit && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Status</label>
            <select {...register('status')}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all bg-white">
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <Button type="submit" loading={mutation.isPending} className="w-full" size="lg">
        {isEdit ? 'Save Changes' : 'Add Employee'}
      </Button>
    </form>
  );
};

const EmployeesPage = () => {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);  // null | 'add' | employee obj
  const [toDelete,  setToDelete]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  api.getEmployees,
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteEmployee,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Employee deleted'); setToDelete(null); },
    onError: (e) => toast.error(e?.response?.data?.error || e.message),
  });

  const employees = (data?.data || []).filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.phone || '').includes(search) ||
    (e.role  || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = (data?.data || []).filter((e) => e.status === 'active').length;
  const inactiveCount = (data?.data || []).filter((e) => e.status === 'inactive').length;

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader
        title="Employees"
        subtitle={`${activeCount} active · ${inactiveCount} inactive`}
        action={
          <Button icon={<UserPlus size={15} />} onClick={() => setModal('add')}>
            Add Employee
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Staff',   value: data?.data?.length ?? 0, icon: Users,        color: 'text-brand-600',   bg: 'bg-brand-50' },
          { label: 'Active',        value: activeCount,              icon: Users,        color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Inactive',      value: inactiveCount,            icon: Users,        color: 'text-slate-500',   bg: 'bg-slate-100' },
          {
            label: 'Monthly Payroll',
            value: formatCurrency((data?.data || []).filter((e) => e.status === 'active').reduce((s, e) => s + Number(e.salary || 0), 0)),
            icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50',
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
              <Icon size={15} className={color} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">{label}</p>
              <p className="text-base font-black text-slate-900 leading-tight mt-0.5">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, role…"
          className="w-full ps-9 pe-4 py-2.5 text-sm rounded-xl border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Employee Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
      ) : employees.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Users size={32} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-400">
              {search ? 'No match found' : 'No employees yet'}
            </p>
            {!search && (
              <Button className="mt-4" size="sm" icon={<UserPlus size={13} />} onClick={() => setModal('add')}>
                Add First Employee
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-black text-base shrink-0">
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{emp.name}</p>
                    <p className="text-xs text-slate-500 truncate">{emp.role || 'Staff'}</p>
                  </div>
                </div>
                <span className={cn(
                  'shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full',
                  emp.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                )}>
                  {emp.status}
                </span>
              </div>

              <div className="space-y-1.5 mb-4">
                {emp.phone && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone size={11} className="text-slate-400 shrink-0" />
                    {emp.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <DollarSign size={11} className="text-slate-400 shrink-0" />
                  {formatCurrency(Number(emp.salary) || 0)} / month
                </div>
                {emp.join_date && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar size={11} className="text-slate-400 shrink-0" />
                    Joined {new Date(emp.join_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>

              <div className="flex gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setModal(emp)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => setToDelete(emp)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={Boolean(modal)}
        onClose={() => setModal(null)}
        title={modal === 'add' ? 'Add Employee' : `Edit — ${modal?.name}`}
        size="sm"
      >
        {modal && (
          <EmployeeForm
            employee={modal === 'add' ? null : modal}
            onDone={() => setModal(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        isOpen={Boolean(toDelete)}
        title="Delete Employee"
        message={`Delete "${toDelete?.name}"? Their attendance records will also be removed.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => deleteMutation.mutate(toDelete.id)}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
};

export default EmployeesPage;
