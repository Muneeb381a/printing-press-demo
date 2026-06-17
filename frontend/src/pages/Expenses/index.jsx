import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit2, Search, TrendingDown, TrendingUp,
  ArrowDownCircle, ArrowUpCircle, Tag, Scale, Wallet,
} from 'lucide-react';
import {
  PageHeader, Table, Button, Input, Select,
  Modal, ConfirmDialog,
} from '../../components/ui/index.js';
import Badge from '../../components/ui/Badge.jsx';
import { formatCurrency, formatDate } from '../../utils/format.js';
import useDebounce from '../../hooks/useDebounce.js';
import cn from '../../utils/cn.js';
import * as api from '../../api/expenses.js';

// ── Constants ─────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Rent',          label: 'Rent' },
  { value: 'Utilities',     label: 'Utilities' },
  { value: 'Salaries',      label: 'Salaries' },
  { value: 'Materials',     label: 'Materials' },
  { value: 'Equipment',     label: 'Equipment' },
  { value: 'Maintenance',   label: 'Maintenance' },
  { value: 'Marketing',     label: 'Marketing' },
  { value: 'Transport',     label: 'Transport' },
  { value: 'Sales Receipt', label: 'Sales Receipt' },
  { value: 'Refund',        label: 'Refund' },
  { value: 'Miscellaneous', label: 'Miscellaneous' },
];

const PAYMENT_OPTIONS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'online',        label: 'Online' },
];

const FORM_CATEGORIES = CATEGORY_OPTIONS.slice(1);

const TYPE_FILTER = [
  { value: '',    label: 'All' },
  { value: 'IN',  label: 'Money In' },
  { value: 'OUT', label: 'Money Out' },
];

const DATE_PERIODS = [
  { value: 'all',       label: 'All Time' },
  { value: 'today',     label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week',      label: 'This Week' },
  { value: 'month',     label: 'This Month' },
];

const getPeriodRange = (p) => {
  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  if (p === 'today')     return { from: fmt(today), to: fmt(today) };
  if (p === 'yesterday') { const y = new Date(today); y.setDate(today.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
  if (p === 'week')      { const s = new Date(today); s.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)); return { from: fmt(s), to: fmt(today) }; }
  if (p === 'month')     return { from: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0], to: fmt(today) };
  return { from: null, to: null };
};

// ── Type Toggle ───────────────────────────────────────────────────

const TypeToggle = ({ value, onChange }) => (
  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
    {[
      { v: 'OUT', label: 'Money Out (خرچ)', icon: ArrowDownCircle, active: 'bg-red-500 text-white shadow-sm', inactive: 'text-slate-500 hover:text-red-600' },
      { v: 'IN',  label: 'Money In (آمد)',  icon: ArrowUpCircle,   active: 'bg-emerald-500 text-white shadow-sm', inactive: 'text-slate-500 hover:text-emerald-600' },
    ].map(({ v, label, icon: Icon, active, inactive }) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        className={cn(
          'flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all duration-150',
          value === v ? active : inactive
        )}
      >
        <Icon size={16} />
        {label}
      </button>
    ))}
  </div>
);

// ── Expense Form Modal ─────────────────────────────────────────────

const ExpenseModal = ({ expense, onClose }) => {
  const qc     = useQueryClient();
  const isEdit = Boolean(expense);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    defaultValues: {
      type:          expense?.type          || 'OUT',
      title:         expense?.title         || '',
      amount:        expense?.amount        || '',
      category:      expense?.category      || '',
      paymentMethod: expense?.payment_method || 'cash',
      expenseDate:   expense?.expense_date
        ? expense.expense_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: expense?.notes || '',
    },
  });

  const currentType = watch('type');

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? api.updateExpense(expense.id, data) : api.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-summary'] });
      toast.success(isEdit ? 'Record updated' : (currentType === 'IN' ? 'Income recorded' : 'Expense recorded'));
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to save'),
  });

  const isIn = currentType === 'IN';

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit Record' : isIn ? 'Record Income' : 'Record Expense'}
    >
      <form onSubmit={handleSubmit(mutation.mutate)} className="space-y-4">

        {/* IN / OUT Toggle */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Transaction Type
          </label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <TypeToggle value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        {/* Hint strip */}
        <div className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium',
          isIn
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        )}>
          {isIn
            ? <><ArrowUpCircle size={13} /> Money received / income — will be shown in green</>
            : <><ArrowDownCircle size={13} /> Money spent / expense — will be shown in red</>}
        </div>

        <Input
          label={isIn ? 'Income Title *' : 'Expense Title *'}
          placeholder={isIn ? 'e.g. Customer Payment, Sale Receipt' : 'e.g. Electricity Bill, Rent'}
          {...register('title', { required: 'Title is required' })}
          error={errors.title?.message}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Amount (PKR) *"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register('amount', {
              required: 'Amount is required',
              min: { value: 0, message: 'Must be positive' },
            })}
            error={errors.amount?.message}
          />
          <Input
            label="Date"
            type="date"
            {...register('expenseDate')}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Category"
            options={FORM_CATEGORIES}
            {...register('category')}
          />
          <Select
            label="Payment Method"
            options={PAYMENT_OPTIONS}
            {...register('paymentMethod')}
          />
        </div>

        <Input
          label="Notes"
          placeholder="Optional description"
          {...register('notes')}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            className={isIn
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : undefined}
          >
            {isEdit ? 'Save Changes' : isIn ? 'Record Income' : 'Record Expense'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ── Summary Stat Card ──────────────────────────────────────────────

const SummaryCard = ({ icon: Icon, label, value, sub, variant }) => {
  const variants = {
    red:     { wrap: 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-red-200',     icon: 'bg-white/20 text-white' },
    emerald: { wrap: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-emerald-200', icon: 'bg-white/20 text-white' },
    blue:    { wrap: 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-200',   icon: 'bg-white/20 text-white' },
    slate:   { wrap: 'bg-white border border-slate-200 text-slate-800',                          icon: 'bg-slate-100 text-slate-600' },
  };
  const v = variants[variant] || variants.slate;

  return (
    <div className={cn('rounded-2xl p-5 flex items-center gap-4 shadow-sm', v.wrap)}>
      <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', v.icon)}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className={cn('text-xs font-semibold uppercase tracking-wide mb-0.5',
          variant === 'slate' ? 'text-slate-400' : 'text-white/70')}>{label}</p>
        <p className="text-xl font-bold truncate">{value}</p>
        {sub && <p className={cn('text-xs mt-0.5', variant === 'slate' ? 'text-slate-400' : 'text-white/60')}>{sub}</p>}
      </div>
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────

const Expenses = () => {
  const qc = useQueryClient();

  const [search,    setSearch]    = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editing,    setEditing]    = useState(null);
  const [confirmId,  setConfirmId]  = useState(null);
  const [datePeriod, setDatePeriod] = useState('all');

  const debouncedSearch = useDebounce(search, 350);
  const { from, to } = getPeriodRange(datePeriod);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', typeFilter, catFilter, debouncedSearch, datePeriod],
    queryFn:  () => api.getExpenses({
      type:     typeFilter || undefined,
      category: catFilter  || undefined,
      search:   debouncedSearch || undefined,
      from:     from || undefined,
      to:       to   || undefined,
      limit:    200,
    }),
  });

  const { data: summaryData } = useQuery({
    queryKey: ['expense-summary', datePeriod],
    queryFn:  () => api.getSummary({ from: from || undefined, to: to || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteExpense(confirmId),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-summary'] });
      toast.success('Record deleted');
      setConfirmId(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const expenses = data?.data || [];
  const s        = summaryData?.data || {};
  const net      = parseFloat(s.net_balance || 0);

  const isFiltered = !!search || !!catFilter || !!typeFilter || datePeriod !== 'all';

  // ── Table columns ──────────────────────────────────────────────

  const columns = [
    {
      key: 'expense_date', header: 'Date',
      render: (row) => (
        <span className="text-sm text-slate-500 whitespace-nowrap">{formatDate(row.expense_date)}</span>
      ),
    },
    {
      key: 'type', header: 'Type',
      render: (row) => row.type === 'IN' ? (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
          <ArrowUpCircle size={11} /> IN
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
          <ArrowDownCircle size={11} /> OUT
        </span>
      ),
    },
    {
      key: 'title', header: 'Title',
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.title}</p>
          {row.notes && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{row.notes}</p>}
        </div>
      ),
    },
    {
      key: 'category', header: 'Category',
      render: (row) => row.category
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium"><Tag size={10} />{row.category}</span>
        : <span className="text-slate-300 text-xs">—</span>,
    },
    {
      key: 'payment_method', header: 'Payment',
      render: (row) => (
        <span className="text-xs text-slate-400 capitalize">{row.payment_method?.replace('_', ' ')}</span>
      ),
    },
    {
      key: 'amount', header: 'Amount',
      render: (row) => (
        <span className={cn(
          'font-bold font-mono text-sm',
          row.type === 'IN' ? 'text-emerald-600' : 'text-red-600'
        )}>
          {row.type === 'IN' ? '+' : '−'}{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button
            size="sm" variant="ghost"
            icon={<Edit2 size={13} />}
            onClick={() => { setEditing(row); setModalOpen(true); }}
          />
          <Button
            size="sm" variant="ghost"
            icon={<Trash2 size={13} />}
            onClick={() => setConfirmId(row.id)}
            className="text-red-400 hover:bg-red-50 hover:text-red-600"
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income & Expenses"
        subtitle={
          isFiltered
            ? `${expenses.length} result${expenses.length !== 1 ? 's' : ''}`
            : `${expenses.length} record${expenses.length !== 1 ? 's' : ''} total`
        }
        action={
          <Button icon={<Plus size={16} />} onClick={() => { setEditing(null); setModalOpen(true); }}>
            Add Record
          </Button>
        }
      />

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          label="Total IN"
          value={formatCurrency(s.total_in || 0)}
          sub={`${s.in_count || 0} transactions`}
          variant="emerald"
        />
        <SummaryCard
          icon={TrendingDown}
          label="Total OUT"
          value={formatCurrency(s.total_out || 0)}
          sub={`${s.out_count || 0} transactions`}
          variant="red"
        />
        <SummaryCard
          icon={Scale}
          label="Net Balance"
          value={formatCurrency(Math.abs(net))}
          sub={net >= 0 ? 'You are ahead' : 'More spent than received'}
          variant={net >= 0 ? 'blue' : 'slate'}
        />
        <SummaryCard
          icon={Wallet}
          label={datePeriod === 'all' ? 'This Month' : (DATE_PERIODS.find(d => d.value === datePeriod)?.label ?? '') + ' Count'}
          value={datePeriod === 'all'
            ? formatCurrency(s.this_month_out || 0)
            : `${s.total_count || 0} records`}
          sub={datePeriod === 'all'
            ? `IN: ${formatCurrency(s.this_month_in || 0)}`
            : `${s.in_count || 0} in · ${s.out_count || 0} out`}
          variant="slate"
        />
      </div>

      {/* ── Date Period Tabs ── */}
      <div className="flex items-center gap-1 p-1.5 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        {DATE_PERIODS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setDatePeriod(value)}
            className={cn(
              'flex-1 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
              datePeriod === value
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
          {TYPE_FILTER.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTypeFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                typeFilter === value
                  ? value === 'IN'  ? 'bg-emerald-500 text-white shadow-sm'
                  : value === 'OUT' ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Select
          options={CATEGORY_OPTIONS}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="w-44"
        />

        <div className="flex-1 min-w-48 max-w-72">
          <Input
            placeholder="Search title or notes…"
            prefix={<Search size={14} className="text-slate-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isFiltered && (
          <button
            onClick={() => { setSearch(''); setCatFilter(''); setTypeFilter(''); setDatePeriod('all'); }}
            className="text-xs text-slate-400 hover:text-slate-700 underline whitespace-nowrap"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <Table
          columns={columns}
          data={expenses}
          loading={isLoading}
          emptyMessage={
            isFiltered ? 'No records match your filter.' : 'No records yet. Click "Add Record" to start.'
          }
        />

        {/* Running net at bottom */}
        {expenses.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {expenses.length} record{expenses.length !== 1 ? 's' : ''}
              {typeFilter ? ` (${typeFilter} only)` : ''}
            </span>
            <div className="flex items-center gap-4 text-sm font-semibold font-mono">
              <span className="text-emerald-600">
                +{formatCurrency(expenses.filter(r => r.type === 'IN').reduce((s, r) => s + parseFloat(r.amount), 0))}
              </span>
              <span className="text-red-600">
                −{formatCurrency(expenses.filter(r => r.type === 'OUT').reduce((s, r) => s + parseFloat(r.amount), 0))}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modalOpen && (
        <ExpenseModal
          expense={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
        />
      )}

      <ConfirmDialog
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title="Delete Record?"
        message="This record will be permanently removed."
      />
    </div>
  );
};

export default Expenses;
