import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cn from '../../utils/cn.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Printer, Plus, CreditCard, RefreshCw, Truck, AlertTriangle, MessageCircle, Receipt, ImageDown,
  FileImage, CheckCircle2, Clock, Pencil, Printer as PrinterIcon, PartyPopper, Send, FilePenLine,
} from 'lucide-react';

// ── Design Status Card ────────────────────────────────────────
const DESIGN_STEPS = [
  { key: 'pending',  label: 'Pending',  urdu: 'ڈیزائن نہیں ملی',  icon: Clock,          color: 'text-slate-400',  ring: 'ring-slate-300',  bg: 'bg-slate-50'  },
  { key: 'received', label: 'Received', urdu: 'ڈیزائن مل گئی',    icon: FileImage,      color: 'text-blue-500',   ring: 'ring-blue-300',   bg: 'bg-blue-50'   },
  { key: 'approved', label: 'Approved', urdu: 'منظور شدہ',         icon: CheckCircle2,   color: 'text-emerald-500',ring: 'ring-emerald-300',bg: 'bg-emerald-50'},
  { key: 'printing', label: 'Printing', urdu: 'پرنٹنگ جاری ہے',   icon: PrinterIcon,    color: 'text-violet-500', ring: 'ring-violet-300', bg: 'bg-violet-50' },
];

const DesignStatusCard = ({ bill, mutation }) => {
  const [notes, setNotes] = useState(bill.design_notes || '');
  const [editNotes, setEditNotes] = useState(false);
  const current = bill.design_status || 'pending';
  const currentStep = DESIGN_STEPS.find(s => s.key === current) || DESIGN_STEPS[0];
  const Icon = currentStep.icon;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon size={16} className={currentStep.color} />
          <span className="text-sm font-bold text-gray-800">Design / File Status</span>
        </div>
        <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full', currentStep.bg, currentStep.color)}>
          {currentStep.label}
        </span>
      </div>

      {/* Step buttons */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {DESIGN_STEPS.map((step) => {
          const S = step.icon;
          const active = current === step.key;
          return (
            <button
              key={step.key}
              onClick={() => mutation.mutate({ design_status: step.key, design_notes: notes || null })}
              disabled={mutation.isPending}
              className={cn(
                'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer',
                active
                  ? cn('ring-2 border-transparent', step.ring, step.bg, step.color)
                  : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 bg-white'
              )}
            >
              <S size={16} />
              <span>{step.label}</span>
              <span className="text-[10px] font-normal opacity-70" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>
                {step.urdu}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notes */}
      <div className="flex items-center gap-2">
        {editNotes ? (
          <>
            <input
              autoFocus
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Design notes (e.g. file format, colour mode…)"
              className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <button
              onClick={() => { mutation.mutate({ design_status: current, design_notes: notes || null }); setEditNotes(false); }}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 px-2 py-1.5 rounded-lg hover:bg-indigo-50 cursor-pointer"
            >Save</button>
            <button onClick={() => { setNotes(bill.design_notes || ''); setEditNotes(false); }} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer px-1">✕</button>
          </>
        ) : (
          <button onClick={() => setEditNotes(true)} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
            <Pencil size={11} />
            {bill.design_notes ? <span className="text-gray-600 font-medium">{bill.design_notes}</span> : <span>Add design notes…</span>}
          </button>
        )}
      </div>
    </div>
  );
};
import { generateBillImage } from '../../utils/generateBillImage.js';
import {
  PageSpinner, Card, CardHeader, Table, Button, Select,
} from '../../components/ui/index.js';
import { StatusBadge, PriorityBadge } from '../../components/ui/Badge.jsx';
import { formatCurrency, formatDate, formatDateTime, PRICING_MODEL_LABELS } from '../../utils/format.js';
import * as billApi from '../../api/bills.js';
import AddPaymentModal      from './AddPaymentModal.jsx';
import WhatsAppModal        from './WhatsAppModal.jsx';
import PaymentReceiptModal  from './PaymentReceiptModal.jsx';

// ── Phone normaliser ─────────────────────────────────────────
const toWaPhone = (raw = '') => {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('92')) return d;
  if (d.startsWith('0'))  return '92' + d.slice(1);
  if (d.startsWith('3'))  return '92' + d;
  return '92' + d;
};

const buildReadyMessage = (bill, shop) => {
  const name      = bill.customer_name  || 'Customer';
  const billNo    = bill.bill_number    || '';
  const remaining = parseFloat(bill.remaining_balance) || 0;
  const total     = parseFloat(bill.total_amount)      || 0;
  const shopName  = shop?.shop_name || 'Our Shop';
  const phone     = shop?.whatsapp_phone || shop?.phone || '';

  const amountLine = remaining > 0
    ? `بقایا رقم: *Rs ${remaining.toLocaleString()}*`
    : `کل رقم: *Rs ${total.toLocaleString()}* ✅ مکمل ادا شدہ`;

  return (
`السلام علیکم *${name}* صاحب! 🎉

آپ کا آرڈر تیار ہے ✅
بل نمبر: *${billNo}*
${amountLine}

براہ کرم جلد آ کر اپنا آرڈر لے جائیں۔

شکریہ 🙏
*${shopName}*${phone ? `\n📞 ${phone}` : ''}`
  );
};

// ── Order Ready Banner ────────────────────────────────────────
const OrderReadyBanner = ({ bill, shop, onDismiss }) => {
  const phone   = bill.customer_phone?.trim();
  const message = buildReadyMessage(bill, shop);
  const waLink  = phone
    ? `https://wa.me/${toWaPhone(phone)}?text=${encodeURIComponent(message)}`
    : null;

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="relative rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 flex items-start gap-4 shadow-sm">
      {/* icon */}
      <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
        <PartyPopper size={18} className="text-emerald-600" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-emerald-800">آرڈر تیار ہے! Order is Ready</p>
        <p className="text-xs text-emerald-600 mt-0.5">
          {phone ? `Notify ${bill.customer_name} on WhatsApp` : 'No phone number on file — add it in customer profile'}
        </p>

        {/* Message preview */}
        <div className="mt-3 bg-white/70 rounded-xl px-3 py-2.5 text-xs text-gray-600 whitespace-pre-line leading-relaxed border border-emerald-100 max-h-32 overflow-y-auto" dir="rtl" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', fontSize: '13px' }}>
          {message}
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {waLink && (
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] shadow-sm transition-all"
            >
              <Send size={13} />
              Send on WhatsApp
            </a>
          )}
          <button
            onClick={copy}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer',
              copied
                ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
            )}
          >
            {copied ? <CheckCircle2 size={12} /> : <MessageCircle size={12} />}
            {copied ? 'Copied!' : 'Copy Message'}
          </button>
        </div>
      </div>

      {/* dismiss */}
      <button onClick={onDismiss} className="shrink-0 p-1 rounded-lg text-emerald-400 hover:text-emerald-700 hover:bg-emerald-100 cursor-pointer transition-colors">
        ✕
      </button>
    </div>
  );
};

const STATUS_OPTIONS = [
  { value: 'pending',     label: 'Pending'      },
  { value: 'in_progress', label: 'In Progress'  },
  { value: 'completed',   label: 'Completed'    },
  { value: 'delivered',   label: 'Delivered'    },
  { value: 'cancelled',   label: 'Cancelled'    },
];

const BillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc       = useQueryClient();

  const [payModal,       setPayModal]       = useState(false);
  const [waModal,        setWaModal]        = useState(false);
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [imgLoading,     setImgLoading]     = useState(false);
  const [showReadyBanner, setShowReadyBanner] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bill', id],
    queryFn:  () => billApi.getBill(id),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['bill', id] });
    qc.invalidateQueries({ queryKey: ['bills'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status) => billApi.updateStatus(id, status),
    onSuccess:  (_data, status) => {
      invalidate();
      if (status === 'completed') {
        setShowReadyBanner(true);
        toast.success('Order marked as completed!');
      } else {
        toast.success('Status updated');
        setShowReadyBanner(false);
      }
    },
  });

  const priorityMutation = useMutation({
    mutationFn: (priority) => billApi.updatePriority(id, priority),
    onSuccess:  () => { invalidate(); toast.success('Priority updated'); },
  });

  const designMutation = useMutation({
    mutationFn: ({ design_status, design_notes }) => billApi.updateDesignStatus(id, design_status, design_notes),
    onSuccess:  () => { invalidate(); toast.success('Design status updated'); },
  });

  const deliverMutation = useMutation({
    mutationFn: () => billApi.markDelivered(id),
    onSuccess:  () => { invalidate(); toast.success('Marked as delivered'); },
  });

  if (isLoading) return <PageSpinner />;
  if (!data?.data?.bill) return (
    <div className="text-center py-16 text-gray-400">
      <p>Bill not found.</p>
      <Button variant="ghost" className="mt-4" onClick={() => navigate('/bills')}>Go back</Button>
    </div>
  );

  const { bill, items = [], extraCharges = [], payments = [] } = data.data;
  const totalPaid   = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);

  // Sqft stats — only items with sqft > 0 AND count_in_sqft = true (flex/banners, not cards/stamps)
  const areaItems    = items.filter((it) => parseFloat(it.sqft || 0) > 0 && it.count_in_sqft !== false);
  const totalSqft    = parseFloat(areaItems.reduce((s, it) => s + parseFloat(it.sqft || 0), 0).toFixed(3));
  const areaSubtotal = areaItems.reduce((s, it) => s + parseFloat(it.item_total || 0), 0);
  const ratePerSqft  = totalSqft > 0 ? parseFloat((areaSubtotal / totalSqft).toFixed(2)) : 0;
  const canDeliver  = !['delivered', 'cancelled'].includes(bill.status);
  const canAddPayment = (parseFloat(bill.remaining_balance) || 0) > 0 && bill.status !== 'cancelled';
  const isOverdue   = bill.due_date
    && new Date(bill.due_date) < new Date()
    && !['delivered', 'cancelled'].includes(bill.status);

  const shareImage = async () => {
    setImgLoading(true);
    try {
      const shopData = qc.getQueryData(['shop-settings']);
      const blob = await generateBillImage({ bill, items, extraCharges, totalPaid, shop: shopData });
      const file = new File([blob], `bill-${bill.bill_number}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Bill ${bill.bill_number}` });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url; a.download = `bill-${bill.bill_number}.png`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Image downloaded — attach it in WhatsApp');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not generate image');
    } finally { setImgLoading(false); }
  };

  // ── Item columns ──────────────────────────────────────────
  const itemCols = [
    {
      key: 'product_name', header: 'Item',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.description || row.product_name}</p>
          <p className="text-xs text-gray-400">{PRICING_MODEL_LABELS[row.pricing_model]}</p>
          {row.item_notes && (
            <p className="text-xs text-amber-600 mt-0.5 italic">↳ {row.item_notes}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity', header: 'Qty',
      render: (row) => (
        <div className="text-sm">
          <span>{row.quantity}</span>
          {row.width && row.height && (
            <p className="text-xs text-gray-400">{row.width} × {row.height} ft</p>
          )}
        </div>
      ),
    },
    {
      key: 'area', header: 'Area',
      render: (row) => {
        const sqft = parseFloat(row.sqft || 0);
        if (sqft > 0 && row.count_in_sqft !== false) {
          return (
            <div className="text-sm font-semibold text-indigo-700">
              {sqft}
              <span className="text-xs font-normal text-indigo-400 ml-0.5">sqft</span>
            </div>
          );
        }
        if (sqft > 0) {
          return <span className="text-xs text-gray-400">{sqft} sqft</span>;
        }
        return <span className="text-gray-300">—</span>;
      },
    },
    {
      key: 'unit_price', header: 'Rate',
      render: (row) => {
        const sqft  = parseFloat(row.sqft || 0);
        const qty   = parseInt(row.quantity, 10) || 1;
        const total = parseFloat(row.item_total || 0);
        if (sqft > 0) return <span className="font-medium">{formatCurrency(parseFloat((total / sqft).toFixed(2)))}</span>;
        if (qty > 1)  return <span className="font-medium">{formatCurrency(parseFloat(row.unit_price || 0))}</span>;
        return <span className="font-medium">{formatCurrency(total)}</span>;
      },
    },
    {
      key: 'line_total', header: 'Total',
      render: (row) => {
        const df    = parseFloat(row.design_fee || 0);
        const uf    = parseFloat(row.urgent_fee || 0);
        const total = parseFloat(row.item_total) + df + uf;
        return (
          <div>
            <span className="font-bold text-indigo-700">{formatCurrency(total)}</span>
            {(df > 0 || uf > 0) && (
              <p className="text-[10px] text-amber-600 mt-0.5">
                {df > 0 && `Design +${formatCurrency(df)}`}
                {df > 0 && uf > 0 && ' · '}
                {uf > 0 && `Urgent +${formatCurrency(uf)}`}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  // ── Payment columns ───────────────────────────────────────
  const payCols = [
    { key: 'payment_date',    header: 'Date',      render: (r) => formatDateTime(r.payment_date) },
    { key: 'amount',          header: 'Amount',    render: (r) => <span className="font-semibold text-green-600">{formatCurrency(r.amount)}</span> },
    { key: 'payment_method',  header: 'Method',    render: (r) => r.payment_method.replace('_', ' ').toUpperCase() },
    { key: 'reference_number',header: 'Reference', render: (r) => r.reference_number || '—' },
    { key: 'notes',           header: 'Notes',     render: (r) => r.notes || '—' },
    {
      key: 'receipt', header: '',
      render: (r) => (
        <Button
          size="sm" variant="ghost"
          icon={<Receipt size={13} />}
          onClick={() => setReceiptPayment(r)}
          title="Print Receipt"
        />
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* ── Overdue banner ── */}
      {isOverdue && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700">
          <AlertTriangle size={16} className="shrink-0" />
          <span className="text-sm font-medium">
            This bill was due on {formatDate(bill.due_date)} and has not been delivered yet.
          </span>
        </div>
      )}

      {/* ── Order Ready Notification ── */}
      {(bill.status === 'completed' || showReadyBanner) && (
        <OrderReadyBanner
          bill={bill}
          shop={qc.getQueryData(['shop-settings'])}
          onDismiss={() => setShowReadyBanner(false)}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/bills')}>
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">{bill.bill_number}</h1>
            <StatusBadge status={bill.status} />
            <PriorityBadge priority={bill.priority || 'normal'} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {bill.customer_name} · {bill.customer_phone}
            {bill.customer_address && ` · ${bill.customer_address}`}
          </p>
          <div className="flex items-center gap-4 mt-0.5">
            <p className="text-xs text-gray-400">Created {formatDateTime(bill.created_at)}</p>
            {bill.delivered_at && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Delivered {formatDateTime(bill.delivered_at)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-end">
          {bill.status !== 'cancelled' && (
            <Button
              variant="secondary" size="sm"
              icon={<FilePenLine size={14} />}
              onClick={() => navigate(`/bills/${id}/edit`)}
            >
              Edit
            </Button>
          )}
          <Button
            variant="secondary" size="sm"
            icon={<Printer size={14} />}
            onClick={() => window.open(`/bills/${id}/print`, '_blank')}
          >
            Print
          </Button>
          <button
            type="button"
            onClick={() => setWaModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] active:bg-[#17a852] shadow-sm hover:shadow-md hover:shadow-[#25D366]/25 transition-all duration-150 cursor-pointer"
          >
            <MessageCircle size={13} />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={shareImage}
            disabled={imgLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 hover:bg-indigo-900/60 hover:text-indigo-200 transition-all duration-150 cursor-pointer disabled:opacity-50"
          >
            {imgLoading
              ? <span className="w-3 h-3 border-2 border-indigo-700 border-t-indigo-300 rounded-full animate-spin" />
              : <ImageDown size={13} />
            }
            Image
          </button>
          {canAddPayment && (
            <Button size="sm" icon={<CreditCard size={14} />} onClick={() => setPayModal(true)}>
              Add Payment
            </Button>
          )}
          {canDeliver && (
            <Button
              size="sm"
              icon={<Truck size={14} />}
              loading={deliverMutation.isPending}
              onClick={() => deliverMutation.mutate()}
              className="bg-green-600 hover:bg-green-700 text-white border-transparent"
            >
              Mark Delivered
            </Button>
          )}
        </div>
      </div>

      {/* ── Status + priority + due date row ── */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <RefreshCw size={14} />
            <span>Status</span>
          </div>
          <Select
            options={STATUS_OPTIONS}
            value={bill.status}
            onChange={(e) => statusMutation.mutate(e.target.value)}
            className="w-44"
          />
          {statusMutation.isPending && (
            <span className="text-xs text-gray-400">Saving…</span>
          )}

          {/* Priority */}
          <div className="flex items-center gap-2 ms-4 ps-4 border-l border-gray-200">
            <span className="text-sm font-medium text-gray-700">Priority</span>
            <div className="flex gap-1">
              {[
                { value: 'urgent', dot: 'bg-red-500',   active: 'ring-2 ring-red-400   bg-red-50   text-red-700'   },
                { value: 'normal', dot: 'bg-slate-400', active: 'ring-2 ring-slate-300 bg-slate-50 text-slate-600' },
                { value: 'low',    dot: 'bg-green-500', active: 'ring-2 ring-green-400 bg-green-50 text-green-700' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => priorityMutation.mutate(opt.value)}
                  disabled={priorityMutation.isPending}
                  className={cn(
                    'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer',
                    (bill.priority || 'normal') === opt.value
                      ? opt.active
                      : 'bg-white border border-gray-200 text-gray-400 hover:border-gray-300'
                  )}
                >
                  <span className={cn('w-1.5 h-1.5 rounded-full', opt.dot)} />
                  {opt.value}
                </button>
              ))}
            </div>
          </div>
          {bill.due_date && (
            <div className={`ml-auto text-sm ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
              Due: <span className="font-medium">{formatDate(bill.due_date)}</span>
              {isOverdue && ' — OVERDUE'}
            </div>
          )}
        </div>

        {bill.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Notes</p>
            <p className="text-sm text-gray-700 mt-1">{bill.notes}</p>
          </div>
        )}
      </Card>

      {/* ── Design Status ── */}
      <DesignStatusCard bill={bill} mutation={designMutation} />

      {/* ── Items ── */}
      <Card padding={false}>
        <div className="px-5 pt-5 pb-3">
          <CardHeader
            title="Bill Items"
            subtitle={`${items.length} item${items.length !== 1 ? 's' : ''}`}
          />
        </div>
        <Table columns={itemCols} data={items} emptyMessage="No items" />
      </Card>

      {/* ── Financials ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Totals */}
        <Card>
          <CardHeader title="Financial Summary" />

          {/* Sqft summary strip — only when area items exist */}
          {totalSqft > 0 && (
            <div className="mb-4 flex items-center justify-between gap-2 px-4 py-3 bg-amber-50 rounded-xl border border-amber-100">
              <div>
                <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Total Area</p>
                <p className="text-lg font-bold text-amber-900">{totalSqft} <span className="text-sm font-medium">sqft</span></p>
              </div>
              {ratePerSqft > 0 && (
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide">Avg Rate / sqft</p>
                  <p className="text-lg font-bold text-amber-900">{formatCurrency(ratePerSqft)} <span className="text-sm font-medium text-amber-600">/sqft</span></p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 text-sm">
            {[
              { label: 'Subtotal',     value: formatCurrency(bill.subtotal),          color: '' },
              ...(parseFloat(bill.discount_amount) > 0 ? [{
                label: `Discount (${bill.discount_type === 'percentage' ? `${bill.discount_value}%` : 'fixed'})`,
                value: `- ${formatCurrency(bill.discount_amount)}`,
                color: 'text-green-600',
              }] : []),
              ...(extraCharges.length > 0 ? [{
                label: `Extra Charges (${extraCharges.length})`,
                value: `+ ${formatCurrency(bill.extra_charges)}`,
                color: 'text-amber-600',
              }] : []),
              { label: 'Total Amount', value: formatCurrency(bill.total_amount),      color: 'font-bold' },
              { label: 'Total Paid',   value: formatCurrency(totalPaid),              color: 'text-green-600' },
              {
                label: 'Remaining',
                value: formatCurrency(bill.remaining_balance),
                color: parseFloat(bill.remaining_balance) > 0
                  ? 'text-red-600 font-bold'
                  : 'text-green-600 font-bold',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                <span className="text-gray-500">{label}</span>
                <span className={color}>{value}</span>
              </div>
            ))}
          </div>

          {extraCharges.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Extra Charges</p>
              {extraCharges.map((ec) => (
                <div key={ec.id} className="flex justify-between text-sm text-gray-600 py-0.5">
                  <span>{ec.label}</span>
                  <span className="font-medium">{formatCurrency(ec.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payments */}
        <Card padding={false}>
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <CardHeader
              title="Payment History"
              subtitle={`${payments.length} payment${payments.length !== 1 ? 's' : ''} · ${formatCurrency(totalPaid)} received`}
            />
            {canAddPayment && (
              <Button size="sm" variant="secondary" icon={<Plus size={12} />} onClick={() => setPayModal(true)}>
                Pay
              </Button>
            )}
          </div>
          {payments.length > 0 ? (
            <Table columns={payCols} data={payments} />
          ) : (
            <div className="px-5 pb-5 text-center text-gray-400 text-sm py-6">
              {bill.status === 'cancelled'
                ? 'Bill cancelled — no payments'
                : 'No payments recorded yet'}
            </div>
          )}
        </Card>
      </div>

      <AddPaymentModal
        isOpen={payModal}
        onClose={() => setPayModal(false)}
        bill={bill}
      />

      <WhatsAppModal
        isOpen={waModal}
        onClose={() => setWaModal(false)}
        bill={bill}
        billId={id}
      />

      {receiptPayment && (
        <PaymentReceiptModal
          payment={receiptPayment}
          bill={bill}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
};

export default BillDetail;
