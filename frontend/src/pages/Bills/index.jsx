import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Search, SlidersHorizontal, CheckSquare, X,
  ChevronRight, ChevronDown, CheckCircle2,
} from 'lucide-react';
import {
  PageHeader, ConfirmDialog, Button, Select, Input,
} from '../../components/ui/index.js';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge.jsx';
import { formatCurrency, formatDate, STATUS_LABELS } from '../../utils/format.js';
import useDebounce from '../../hooks/useDebounce.js';
import * as api from '../../api/bills.js';
import cn from '../../utils/cn.js';
import { useAuth } from '../../auth/AuthContext.jsx';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];

const BULK_STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'delivered',   label: 'Delivered' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const COL = 'grid grid-cols-[2rem_2rem_1fr_6rem_7rem_7rem_7rem_5rem_7rem] gap-2';

// Indeterminate checkbox helper
const IndeterminateCheckbox = ({ checked, indeterminate, onChange, className }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={className}
    />
  );
};

const Bills = () => {
  const navigate   = useNavigate();
  const qc         = useQueryClient();
  const { isEmployee } = useAuth();

  const [search,             setSearch]             = useState('');
  const [statusFilter,       setStatusFilter]       = useState('');
  const [showCleared,        setShowCleared]        = useState(false);
  const [selected,           setSelected]           = useState(null);
  const [confirmOpen,        setConfirmOpen]        = useState(false);
  const [checkedIds,         setCheckedIds]         = useState(new Set());
  const [bulkStatus,         setBulkStatus]         = useState('');
  const [bulkDeleteConfirm,  setBulkDeleteConfirm]  = useState(false);
  const [expandedCustomers,  setExpandedCustomers]  = useState(new Set());

  const debouncedSearch = useDebounce(search, 350);
  const isFiltered      = !!search || !!statusFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['bills', statusFilter, debouncedSearch],
    queryFn:  () => api.getBills({
      status: statusFilter || undefined,
      search: debouncedSearch || undefined,
      limit:  200,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteBill(selected.id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill deleted');
      setConfirmOpen(false);
      setSelected(null);
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ ids, status }) => api.bulkUpdateStatus(ids, status),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success(`${res.updated} bill${res.updated !== 1 ? 's' : ''} updated`);
      setCheckedIds(new Set());
      setBulkStatus('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk update failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.bulkDeleteBills(ids),
    onSuccess:  (res) => {
      qc.invalidateQueries({ queryKey: ['bills'] });
      toast.success(`${res.deleted} bill${res.deleted !== 1 ? 's' : ''} deleted`);
      setCheckedIds(new Set());
      setBulkStatus('');
      setBulkDeleteConfirm(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Bulk delete failed'),
  });

  const bills = data?.data || [];

  // A bill is "cleared" when delivered AND fully paid
  const isCleared = (b) =>
    b.status === 'delivered' && parseFloat(b.remaining_balance || 0) <= 0;

  const clearedCount   = useMemo(() => bills.filter(isCleared).length, [bills]);
  const visibleBills   = useMemo(
    () => showCleared ? bills : bills.filter(b => !isCleared(b)),
    [bills, showCleared]
  );

  // Group bills by customer_id (order preserved from API: created_at DESC)
  const grouped = useMemo(() => {
    const map = new Map();
    for (const bill of visibleBills) {
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
  }, [visibleBills]);

  // Auto-expand all when filter is active; collapse when cleared
  useEffect(() => {
    setExpandedCustomers(
      isFiltered ? new Set(grouped.map(g => g.customer_id)) : new Set()
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFiltered]);

  const toggleCustomer = (id) =>
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleCheck = (id) =>
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleCustomerBills = (groupBills) => {
    const ids   = groupBills.map(b => b.id);
    const allOn = ids.every(id => checkedIds.has(id));
    setCheckedIds(prev => {
      const next = new Set(prev);
      allOn ? ids.forEach(id => next.delete(id)) : ids.forEach(id => next.add(id));
      return next;
    });
  };

  const allChecked  = visibleBills.length > 0 && visibleBills.every(b => checkedIds.has(b.id));
  const someChecked = checkedIds.size > 0;

  const toggleAll = () =>
    allChecked
      ? setCheckedIds(new Set())
      : setCheckedIds(new Set(visibleBills.map(b => b.id)));

  const applyBulkStatus = () => {
    if (!bulkStatus) return toast.error('Select a status to apply');
    bulkMutation.mutate({ ids: [...checkedIds], status: bulkStatus });
  };

  return (
    <div>
      <PageHeader
        title="Bills & Orders"
        subtitle={
          isFiltered
            ? `${visibleBills.length} result${visibleBills.length !== 1 ? 's' : ''} for current filter`
            : `${grouped.length} customer${grouped.length !== 1 ? 's' : ''} · ${visibleBills.length} bill${visibleBills.length !== 1 ? 's' : ''}${!showCleared && clearedCount > 0 ? ` · ${clearedCount} cleared hidden` : ''}`
        }
        action={
          <Button icon={<Plus size={16} />} onClick={() => navigate('/bills/new')}>
            New Bill
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1.5 text-gray-400">
          <SlidersHorizontal size={15} />
        </div>
        <Select
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        />
        <div className="flex-1 min-w-48 max-w-72">
          <Input
            placeholder="Search customer, phone, bill #…"
            prefix={<Search size={14} className="text-gray-400" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Cleared bills toggle */}
        <button
          onClick={() => setShowCleared(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            showCleared
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
          )}
        >
          <CheckCircle2 size={13} />
          {showCleared ? 'Hide Cleared' : `Show Cleared${clearedCount > 0 ? ` (${clearedCount})` : ''}`}
        </button>

        {isFiltered && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); }}
            className="text-xs text-gray-400 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Bulk action bar (owner only) */}
      {!isEmployee && someChecked && (
        <div className="mb-4 flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-200 rounded-xl">
          <CheckSquare size={16} className="text-indigo-600 shrink-0" />
          <span className="text-sm font-medium text-indigo-700">
            {checkedIds.size} selected
          </span>
          <div className="flex-1" />
          <Select
            options={[{ value: '', label: 'Change status to…' }, ...BULK_STATUS_OPTIONS]}
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            className="w-48"
          />
          <Button size="sm" loading={bulkMutation.isPending} onClick={applyBulkStatus}>
            Apply
          </Button>
          <Button
            size="sm" variant="ghost"
            icon={<Trash2 size={13} />}
            loading={bulkDeleteMutation.isPending}
            onClick={() => setBulkDeleteConfirm(true)}
            className="text-red-500 hover:bg-red-50 border border-red-200"
          >
            Delete
          </Button>
          <button
            onClick={() => { setCheckedIds(new Set()); setBulkStatus(''); }}
            className="p-1 rounded-lg text-indigo-400 hover:text-indigo-700 hover:bg-indigo-100 transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Grouped table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

        {/* Table header */}
        <div className={`${COL} px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-500 uppercase tracking-wide items-center`}>
          <div>
            {!isEmployee && (
              <input
                type="checkbox"
                checked={allChecked}
                onChange={toggleAll}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
              />
            )}
          </div>
          <div /> {/* chevron column */}
          <div>Customer</div>
          <div>Bills</div>
          <div>Total</div>
          <div>Balance</div>
          <div>Status</div>
          <div>Date</div>
          <div />
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            {isFiltered ? 'No bills match your search or filter.' : 'No bills yet. Create your first bill.'}
          </div>
        ) : (
          grouped.map(group => {
            const isExpanded     = expandedCustomers.has(group.customer_id);
            const allBillIds     = group.bills.map(b => b.id);
            const groupChecked   = allBillIds.every(id => checkedIds.has(id));
            const groupIndet     = !groupChecked && allBillIds.some(id => checkedIds.has(id));
            const totalAmount    = group.bills.reduce((s, b) => s + parseFloat(b.total_amount    || 0), 0);
            const totalBalance   = group.bills.reduce((s, b) => s + parseFloat(b.remaining_balance || 0), 0);
            const latestDate     = group.bills[0]?.created_at;

            // Show the "worst" (most-pending) status in summary
            const STATUS_RANK = { pending: 0, in_progress: 1, completed: 2, delivered: 3, cancelled: 4 };
            const worstStatus  = group.bills
              .map(b => b.status)
              .sort((a, b) => (STATUS_RANK[a] ?? 9) - (STATUS_RANK[b] ?? 9))[0];

            return (
              <div key={group.customer_id} className="border-b border-gray-100 last:border-b-0">

                {/* Customer summary row */}
                <div
                  className={`${COL} px-4 py-3 items-center hover:bg-gray-50/80 cursor-pointer select-none transition-colors`}
                  onClick={() => toggleCustomer(group.customer_id)}
                >
                  {/* Checkbox (owner only) */}
                  <div onClick={e => e.stopPropagation()}>
                    {!isEmployee && (
                      <IndeterminateCheckbox
                        checked={groupChecked}
                        indeterminate={groupIndet}
                        onChange={() => toggleCustomerBills(group.bills)}
                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                      />
                    )}
                  </div>

                  {/* Expand chevron */}
                  <div className="text-gray-400">
                    {isExpanded
                      ? <ChevronDown  size={15} />
                      : <ChevronRight size={15} />
                    }
                  </div>

                  {/* Customer info */}
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{group.customer_name}</p>
                    <p className="text-xs text-gray-400 font-mono">{group.customer_phone}</p>
                  </div>

                  {/* Bill count badge */}
                  <div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {group.bills.length} bill{group.bills.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="text-sm font-semibold text-gray-800">{formatCurrency(totalAmount)}</div>

                  {/* Balance */}
                  <div>
                    <span className={`text-sm font-medium ${totalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {totalBalance > 0 ? formatCurrency(totalBalance) : 'Cleared ✓'}
                    </span>
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={worstStatus} /></div>

                  {/* Date */}
                  <div className="text-xs text-gray-400">{formatDate(latestDate)}</div>

                  {/* Actions */}
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm" variant="ghost"
                      icon={<Plus size={13} />}
                      onClick={() => navigate('/bills/new')}
                      className="text-indigo-500 hover:bg-indigo-50"
                      title="New bill"
                    />
                  </div>
                </div>

                {/* Bill sub-rows (expanded) */}
                {isExpanded && group.bills.map(bill => {
                  const rem     = parseFloat(bill.remaining_balance);
                  const overdue = bill.due_date
                    && new Date(bill.due_date) < new Date()
                    && !['delivered', 'cancelled'].includes(bill.status);

                  return (
                    <div
                      key={bill.id}
                      className={`${COL} px-4 py-2 items-center border-t border-gray-100 bg-gray-50/40 hover:bg-indigo-50/20 transition-colors`}
                    >
                      {/* Checkbox (owner only) */}
                      <div>
                        {!isEmployee && (
                          <input
                            type="checkbox"
                            checked={checkedIds.has(bill.id)}
                            onChange={() => toggleCheck(bill.id)}
                            onClick={e => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                          />
                        )}
                      </div>

                      {/* Indent indicator */}
                      <div className="flex justify-center">
                        <div className="w-px h-4 bg-gray-200" />
                      </div>

                      {/* Bill number */}
                      <div className="pl-1">
                        <button
                          onClick={() => navigate(`/bills/${bill.id}`)}
                          className="font-mono text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {bill.bill_number}
                        </button>
                      </div>

                      {/* Empty bills-count column */}
                      <div />

                      {/* Total */}
                      <div className="text-sm text-gray-700">{formatCurrency(bill.total_amount)}</div>

                      {/* Balance */}
                      <div>
                        <span className={`text-sm font-medium ${rem > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {rem > 0 ? formatCurrency(rem) : 'Paid ✓'}
                        </span>
                      </div>

                      {/* Status + priority + design */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <StatusBadge status={bill.status} />
                        {bill.priority && bill.priority !== 'normal' && (
                          <PriorityBadge priority={bill.priority} />
                        )}
                        {bill.design_status && bill.design_status !== 'approved' && (
                          <span className={cn('inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border', {
                            'bg-slate-50 text-slate-500 border-slate-200':    bill.design_status === 'pending',
                            'bg-blue-50 text-blue-600 border-blue-200':       bill.design_status === 'received',
                            'bg-violet-50 text-violet-600 border-violet-200': bill.design_status === 'printing',
                          })}>
                            {bill.design_status === 'pending'  && '⏳ Design Pending'}
                            {bill.design_status === 'received' && '📁 Received'}
                            {bill.design_status === 'printing' && '🖨 Printing'}
                          </span>
                        )}
                      </div>

                      {/* Due / created date */}
                      <div className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                        {bill.due_date ? formatDate(bill.due_date) : formatDate(bill.created_at)}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 justify-end">
                        <Button
                          size="sm" variant="ghost"
                          onClick={() => navigate(`/bills/${bill.id}`)}
                        >
                          Open
                        </Button>
                        {!isEmployee && (
                          <Button
                            size="sm" variant="ghost"
                            icon={<Trash2 size={14} />}
                            onClick={() => { setSelected(bill); setConfirmOpen(true); }}
                            className="text-red-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => { setConfirmOpen(false); setSelected(null); }}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        title={`Delete ${selected?.bill_number}?`}
        message="This permanently deletes the bill and all its items. Payments already recorded will also be removed."
      />

      <ConfirmDialog
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={() => bulkDeleteMutation.mutate([...checkedIds])}
        loading={bulkDeleteMutation.isPending}
        title={`Delete ${checkedIds.size} bill${checkedIds.size !== 1 ? 's' : ''}?`}
        message="This permanently deletes all selected bills and their items. This cannot be undone."
      />
    </div>
  );
};

export default Bills;
