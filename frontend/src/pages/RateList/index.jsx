import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus, Pencil, Trash2, Printer, MessageCircle, ChevronRight,
  Tag, List, X, Check, Loader2, ImageDown,
} from 'lucide-react';
import * as api from '../../api/rateList.js';
import * as settingsAPI from '../../api/settings.js';
import cn from '../../utils/cn.js';
import { generateRateListImages } from '../../utils/generateRateListImage.js';
import { generateRateListImagesUrdu } from '../../utils/generateRateListImageUrdu.js';

// ── helpers ──────────────────────────────────────────────────
const formatPhone = (raw = '') => {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('92')) return d;
  if (d.startsWith('0'))  return '92' + d.slice(1);
  if (d.startsWith('3'))  return '92' + d;
  return '92' + d;
};

const UNIT_OPTIONS = ['sqft', 'piece', 'meter', 'yard', 'roll', 'sheet', 'set', 'kg', 'ft'];

// ── Inline text field ─────────────────────────────────────────
const Field = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const Input = ({ className, ...props }) => (
  <input
    className={cn(
      'w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white',
      'focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent',
      'placeholder:text-slate-300',
      className
    )}
    {...props}
  />
);

// ── Category form modal ───────────────────────────────────────
const CategoryModal = ({ initial, onSave, onClose, loading }) => {
  const [name, setName] = useState(initial?.name || '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">{initial ? 'Edit Category' : 'New Category'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={16} /></button>
        </div>
        <Field label="Category Name" required>
          <Input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Flex Printing"
            onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim())}
          />
        </Field>
        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
          <button
            disabled={!name.trim() || loading}
            onClick={() => onSave(name.trim())}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {initial ? 'Save' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Item form modal ───────────────────────────────────────────
const ItemModal = ({ initial, onSave, onClose, loading }) => {
  const [form, setForm] = useState({
    name:        initial?.name        || '',
    name_ur:     initial?.name_ur     || '',
    description: initial?.description || '',
    unit:        initial?.unit        || 'sqft',
    price:       initial?.price       ?? '',
    min_order:   initial?.min_order   || '',
    notes:       initial?.notes       || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-slate-900">{initial ? 'Edit Item' : 'Add Item'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={16} /></button>
        </div>

        <div className="space-y-3">
          <Field label="Item / Service Name (English)" required>
            <Input autoFocus value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Star Flex Print" />
          </Field>

          <Field label="اردو نام (Urdu Name)">
            <input
              dir="rtl"
              value={form.name_ur}
              onChange={e => set('name_ur', e.target.value)}
              placeholder="مثال: اسٹار فلیکس پرنٹ"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-emerald-50/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 text-right"
              style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', fontSize: '14px' }}
            />
          </Field>

          <Field label="Description">
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details (material, finish…)" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit" required>
              <select
                value={form.unit}
                onChange={e => set('unit', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="Price (Rs)" required>
              <Input
                type="number" min="0" step="0.5"
                value={form.price}
                onChange={e => set('price', e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Min Order">
              <Input value={form.min_order} onChange={e => set('min_order', e.target.value)} placeholder="e.g. 2x2 ft" />
            </Field>
            <Field label="Notes">
              <Input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any note" />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 mt-5 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
          <button
            disabled={!form.name.trim() || form.price === '' || loading}
            onClick={() => onSave(form)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl disabled:opacity-50 cursor-pointer"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {initial ? 'Save' : 'Add Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── WhatsApp share modal ──────────────────────────────────────
const WaModal = ({ categories, itemsMap, shop, onClose }) => {
  const phone = shop?.whatsapp_phone || shop?.phone || '';
  const shopName = shop?.shop_name || 'Our Shop';

  const lines = [];
  lines.push(`*${shopName} — Rate List* 📋`);
  lines.push(`📅 ${new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  lines.push('');

  for (const cat of categories) {
    const items = itemsMap[cat.id] || [];
    if (!items.length) continue;
    lines.push(`*${cat.name}*`);
    for (const item of items) {
      let line = `  • ${item.name}: *Rs ${Number(item.price).toLocaleString()}/${item.unit}*`;
      if (item.min_order) line += ` (min: ${item.min_order})`;
      if (item.description) line += ` — ${item.description}`;
      lines.push(line);
    }
    lines.push('');
  }

  if (phone) lines.push(`📞 Orders & Queries: ${phone}`);
  lines.push('_Prices subject to change without notice._');

  const message = lines.join('\n');
  const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle size={18} className="text-[#25D366]" />
            <h3 className="font-bold text-slate-900">Share Rate List on WhatsApp</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 cursor-pointer"><X size={16} /></button>
        </div>

        <p className="text-xs text-slate-500 mb-3">This message will open in WhatsApp. You can edit it before sending.</p>

        <textarea
          readOnly
          value={message}
          className="w-full h-52 px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-xl bg-slate-50 resize-none focus:outline-none"
        />

        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Close</button>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl"
          >
            <MessageCircle size={14} />
            Open WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
export default function RateList() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [selectedCat, setSelectedCat] = useState(null);
  const [catModal,    setCatModal]    = useState(null); // null | 'new' | category object
  const [itemModal,   setItemModal]   = useState(null); // null | 'new' | item object
  const [waOpen,      setWaOpen]      = useState(false);
  const [imgLoading,     setImgLoading]     = useState(false);
  const [imgUrduLoading, setImgUrduLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'cat'|'item', id, catId? }

  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['rate-categories'],
    queryFn:  api.getCategories,
    onSuccess: (d) => { if (!selectedCat && d?.data?.length) setSelectedCat(d.data[0]); },
  });
  const categories = catData?.data || [];

  const { data: itemsAllData } = useQuery({
    queryKey: ['rate-items-all'],
    queryFn:  api.getAllItems,
  });
  const allItems = itemsAllData?.data || [];
  // group items by category_id for WA modal
  const itemsMap = allItems.reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = [];
    acc[item.category_id].push(item);
    return acc;
  }, {});

  const { data: itemsData } = useQuery({
    queryKey: ['rate-items', selectedCat?.id],
    queryFn:  () => api.getItemsByCategory(selectedCat.id),
    enabled:  !!selectedCat,
  });
  const items = itemsData?.data || [];

  const { data: settingsData } = useQuery({
    queryKey: ['shop-settings'],
    queryFn:  settingsAPI.getSettings,
    staleTime: 5 * 60 * 1000,
  });
  const shop = settingsData?.data ?? {};

  const invalidateCats  = () => { qc.invalidateQueries({ queryKey: ['rate-categories'] }); qc.invalidateQueries({ queryKey: ['rate-items-all'] }); };
  const invalidateItems = () => { qc.invalidateQueries({ queryKey: ['rate-items', selectedCat?.id] }); qc.invalidateQueries({ queryKey: ['rate-items-all'] }); };

  // Category mutations
  const createCat = useMutation({
    mutationFn: (name) => api.createCategory(name),
    onSuccess: (d) => { invalidateCats(); setCatModal(null); setSelectedCat(d.data.data); toast.success('Category added'); },
    onError: () => toast.error('Failed to add category'),
  });
  const editCat = useMutation({
    mutationFn: ({ id, name }) => api.updateCategory(id, name),
    onSuccess: () => { invalidateCats(); setCatModal(null); toast.success('Category updated'); },
    onError: () => toast.error('Failed to update category'),
  });
  const deleteCat = useMutation({
    mutationFn: (id) => api.deleteCategory(id),
    onSuccess: () => { invalidateCats(); setSelectedCat(null); setDeleteConfirm(null); toast.success('Category deleted'); },
    onError: () => toast.error('Failed to delete category'),
  });

  // Item mutations
  const createItem = useMutation({
    mutationFn: (data) => api.createItem(selectedCat.id, data),
    onSuccess: () => { invalidateItems(); setItemModal(null); toast.success('Item added'); },
    onError: () => toast.error('Failed to add item'),
  });
  const editItem = useMutation({
    mutationFn: ({ itemId, data }) => api.updateItem(selectedCat.id, itemId, data),
    onSuccess: () => { invalidateItems(); setItemModal(null); toast.success('Item updated'); },
    onError: () => toast.error('Failed to update item'),
  });
  const deleteItem = useMutation({
    mutationFn: ({ catId, itemId }) => api.deleteItem(catId, itemId),
    onSuccess: () => { invalidateItems(); setDeleteConfirm(null); toast.success('Item removed'); },
    onError: () => toast.error('Failed to remove item'),
  });

  const shareImages = async () => {
    if (!allItems.length) return toast.error('No items to share');
    setImgLoading(true);
    try {
      const imgs = await generateRateListImages({ categories, itemsMap, shop });
      if (!imgs.length) { toast.error('Nothing to generate'); return; }

      // On mobile: share all as files if Web Share API supports it
      const files = imgs.map((img, i) =>
        new File([img.blob], `rate-list-${i + 1}-${img.name}.png`, { type: 'image/png' })
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `${shop?.shop_name || 'Price List'} — Rate List` });
        return;
      }

      // Desktop: download all
      imgs.forEach((img) => {
        const url = URL.createObjectURL(img.blob);
        const a   = document.createElement('a');
        a.href = url; a.download = `rate-list-${img.name}.png`; a.click();
        URL.revokeObjectURL(url);
      });
      toast.success(`${imgs.length} image${imgs.length > 1 ? 's' : ''} downloaded`);
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not generate images');
    } finally { setImgLoading(false); }
  };

  const shareUrduImages = async () => {
    if (!allItems.length) return toast.error('No items to share');
    setImgUrduLoading(true);
    try {
      const imgs = await generateRateListImagesUrdu({ categories, itemsMap, shop });
      if (!imgs.length) { toast.error('Nothing to generate'); return; }
      const files = imgs.map((img, i) =>
        new File([img.blob], `rate-list-urdu-${i + 1}.png`, { type: 'image/png' })
      );
      if (navigator.canShare?.({ files })) {
        await navigator.share({ files, title: `${shop?.shop_name || ''} — ریٹ لسٹ` });
        return;
      }
      imgs.forEach((img, i) => {
        const url = URL.createObjectURL(img.blob);
        const a   = document.createElement('a');
        a.href = url; a.download = `rate-list-urdu-${i + 1}-${img.name}.png`; a.click();
        URL.revokeObjectURL(url);
      });
      toast.success(`${imgs.length} اردو تصویر${imgs.length > 1 ? 'یں' : ''} ڈاؤنلوڈ ہو گئی`);
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not generate Urdu images');
    } finally { setImgUrduLoading(false); }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rate List</h1>
          <p className="text-sm text-slate-400 mt-0.5">Manage your service pricing — print or share with customers</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setWaOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-[#25D366] hover:bg-[#1ebe5d] rounded-xl shadow-sm cursor-pointer"
          >
            <MessageCircle size={15} />
            WhatsApp Text
          </button>
          <button
            onClick={shareImages}
            disabled={imgLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-700/50 hover:bg-indigo-900/70 hover:text-indigo-200 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all"
          >
            {imgLoading
              ? <span className="w-4 h-4 border-2 border-indigo-700 border-t-indigo-300 rounded-full animate-spin" />
              : <ImageDown size={15} />
            }
            Image (EN)
          </button>
          <button
            onClick={shareUrduImages}
            disabled={imgUrduLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/50 hover:bg-emerald-900/70 hover:text-emerald-200 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 transition-all"
          >
            {imgUrduLoading
              ? <span className="w-4 h-4 border-2 border-emerald-700 border-t-emerald-300 rounded-full animate-spin" />
              : <ImageDown size={15} />
            }
            تصویر (اردو)
          </button>
          <button
            onClick={() => window.open('/rate-list/print', '_blank')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-sm cursor-pointer"
          >
            <Printer size={15} />
            Print / PDF
          </button>
        </div>
      </div>

      {/* ── Two-panel layout ── */}
      <div className="grid grid-cols-[240px_1fr] gap-5 items-start">

        {/* LEFT — Category sidebar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Tag size={14} className="text-brand-500" />
              Categories
            </div>
            <button
              onClick={() => setCatModal('new')}
              className="w-6 h-6 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-600 flex items-center justify-center cursor-pointer transition-colors"
              title="Add category"
            >
              <Plus size={13} />
            </button>
          </div>

          {catLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className="h-9 bg-slate-100 rounded-xl animate-pulse" />)}
            </div>
          ) : categories.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              <Tag size={24} className="mx-auto mb-2 opacity-30" />
              No categories yet
            </div>
          ) : (
            <div className="p-2 space-y-0.5">
              {categories.map(cat => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCat(cat)}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all',
                    selectedCat?.id === cat.id
                      ? 'bg-brand-600 text-white'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span className="text-sm font-medium truncate">{cat.name}</span>
                  <div className={cn(
                    'flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                    selectedCat?.id === cat.id && 'opacity-100'
                  )}>
                    <button
                      onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                      className={cn(
                        'p-1 rounded-lg cursor-pointer',
                        selectedCat?.id === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-slate-200 text-slate-400'
                      )}
                    ><Pencil size={12} /></button>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm({ type: 'cat', id: cat.id }); }}
                      className={cn(
                        'p-1 rounded-lg cursor-pointer',
                        selectedCat?.id === cat.id ? 'hover:bg-white/20 text-white' : 'hover:bg-red-50 text-red-400'
                      )}
                    ><Trash2 size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-2 border-t border-slate-100">
            <button
              onClick={() => setCatModal('new')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors cursor-pointer"
            >
              <Plus size={13} /> Add Category
            </button>
          </div>
        </div>

        {/* RIGHT — Items panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {!selectedCat ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-300">
              <List size={36} strokeWidth={1.5} className="mb-3" />
              <p className="text-sm font-medium text-slate-400">Select a category to manage items</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900">{selectedCat.name}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">{items.length} service{items.length !== 1 ? 's' : ''} listed</p>
                </div>
                <button
                  onClick={() => setItemModal('new')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl cursor-pointer"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                  <List size={32} strokeWidth={1.5} className="mb-2" />
                  <p className="text-sm font-medium text-slate-400">No items yet — add your first service</p>
                  <button
                    onClick={() => setItemModal('new')}
                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl cursor-pointer"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {/* Header row */}
                  <div className="grid grid-cols-[1fr_120px_100px_80px_90px] gap-3 px-5 py-2.5 bg-slate-50">
                    {['Service / Item', 'Description', 'Unit', 'Price (Rs)', ''].map((h, i) => (
                      <span key={i} className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{h}</span>
                    ))}
                  </div>

                  {items.map(item => (
                    <div key={item.id} className="group grid grid-cols-[1fr_120px_100px_80px_90px] gap-3 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                        {item.name_ur  && <p className="text-xs text-emerald-600 mt-0.5" style={{ fontFamily: '"Noto Nastaliq Urdu","Urdu Typesetting",serif', direction: 'rtl' }}>{item.name_ur}</p>}
                        {item.min_order && <p className="text-xs text-slate-400 mt-0.5">Min: {item.min_order}</p>}
                        {item.notes    && <p className="text-xs text-amber-600 mt-0.5 italic">{item.notes}</p>}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{item.description || '—'}</div>
                      <div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
                          per {item.unit}
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {Number(item.price).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setItemModal(item)}
                          className="p-1.5 rounded-lg hover:bg-brand-50 text-slate-400 hover:text-brand-600 cursor-pointer"
                        ><Pencil size={13} /></button>
                        <button
                          onClick={() => setDeleteConfirm({ type: 'item', id: item.id, catId: selectedCat.id })}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 cursor-pointer"
                        ><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {catModal && (
        <CategoryModal
          initial={catModal === 'new' ? null : catModal}
          loading={createCat.isPending || editCat.isPending}
          onClose={() => setCatModal(null)}
          onSave={(name) => {
            if (catModal === 'new') createCat.mutate(name);
            else editCat.mutate({ id: catModal.id, name });
          }}
        />
      )}

      {itemModal && (
        <ItemModal
          initial={itemModal === 'new' ? null : itemModal}
          loading={createItem.isPending || editItem.isPending}
          onClose={() => setItemModal(null)}
          onSave={(data) => {
            if (itemModal === 'new') createItem.mutate(data);
            else editItem.mutate({ itemId: itemModal.id, data });
          }}
        />
      )}

      {waOpen && (
        <WaModal
          categories={categories}
          itemsMap={itemsMap}
          shop={shop}
          onClose={() => setWaOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">
              {deleteConfirm.type === 'cat' ? 'Delete Category?' : 'Remove Item?'}
            </h3>
            <p className="text-sm text-slate-400 mb-5">
              {deleteConfirm.type === 'cat'
                ? 'This will also delete all items in this category.'
                : 'This item will be removed from the rate list.'}
            </p>
            <div className="flex gap-2 justify-center">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
              <button
                onClick={() => {
                  if (deleteConfirm.type === 'cat') deleteCat.mutate(deleteConfirm.id);
                  else deleteItem.mutate({ catId: deleteConfirm.catId, itemId: deleteConfirm.id });
                }}
                disabled={deleteCat.isPending || deleteItem.isPending}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50 cursor-pointer"
              >
                {deleteCat.isPending || deleteItem.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
