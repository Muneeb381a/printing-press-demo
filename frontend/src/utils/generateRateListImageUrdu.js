// ── Urdu Rate List Image Generator ──────────────────────────────
// RTL layout · Noto Nastaliq Urdu font · uses name_ur when available

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.arcTo(x + w, y,     x + w, y + rad,     rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  ctx.lineTo(x + rad, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - rad, rad);
  ctx.lineTo(x,     y + rad);
  ctx.arcTo(x,     y,     x + rad, y,          rad);
  ctx.closePath();
}

let urduFontLoaded = false;
async function ensureUrduFont() {
  if (urduFontLoaded) return;
  if (!document.getElementById('urdu-nastaliq-css')) {
    const link = document.createElement('link');
    link.id   = 'urdu-nastaliq-css';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&display=swap';
    document.head.appendChild(link);
  }
  await document.fonts.ready;
  urduFontLoaded = true;
}

const UF = '"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Urdu Typesetting","Traditional Arabic",serif';
const LF = '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';

const fu  = (ctx, sz, w = '400') => { ctx.font = `${w} ${sz}px ${UF}`; };
const fl  = (ctx, sz, w = '400') => { ctx.font = `${w} ${sz}px ${LF}`; };

function clip(ctx, text, maxW) {
  let t = String(text ?? '');
  while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -1);
  return t !== String(text ?? '') ? t + '…' : t;
}

const COLS = [
  { accent: '#6d28d9', mid: '#7c3aed', light: '#f5f3ff', chip: '#ede9fe', chipText: '#5b21b6' },
  { accent: '#1d4ed8', mid: '#2563eb', light: '#eff6ff', chip: '#dbeafe', chipText: '#1e40af' },
  { accent: '#047857', mid: '#059669', light: '#f0fdf4', chip: '#d1fae5', chipText: '#065f46' },
  { accent: '#b45309', mid: '#d97706', light: '#fffbeb', chip: '#fef3c7', chipText: '#92400e' },
  { accent: '#be185d', mid: '#db2777', light: '#fdf2f8', chip: '#fce7f3', chipText: '#9d174d' },
  { accent: '#0e7490', mid: '#0891b2', light: '#ecfeff', chip: '#cffafe', chipText: '#164e63' },
];

/**
 * Returns Array<{ name: string, blob: Blob }> — one image per category
 */
export async function generateRateListImagesUrdu({ categories, itemsMap, shop }) {
  await ensureUrduFont();
  const results = [];
  for (let ci = 0; ci < categories.length; ci++) {
    const cat   = categories[ci];
    const items = itemsMap[cat.id] || [];
    if (!items.length) continue;
    results.push({ name: cat.name, blob: await drawCard(cat, items, shop, ci) });
  }
  return results;
}

async function drawCard(cat, items, shop, ci) {
  const SCALE  = 2;
  const W      = 500;
  const PAD    = 26;
  const col    = COLS[ci % COLS.length];

  const HDR_H  = 116;
  const CAT_H  = 48;
  const COL_H  = 30;
  const ITEM_H = 68;   // tall enough for Nastaliq
  const FOOT_H = 42;
  const H = HDR_H + CAT_H + COL_H + items.length * ITEM_H + FOOT_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx     = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.direction = 'rtl';

  // ── white card ─────────────────────────────────────────────
  ctx.fillStyle = '#fff';
  rr(ctx, 0, 0, W, H, 18);
  ctx.fill();

  // ── header gradient ────────────────────────────────────────
  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, col.accent);
  hg.addColorStop(1, col.mid);
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(18, 0); ctx.lineTo(W - 18, 0);
  ctx.arcTo(W, 0, W, 18, 18); ctx.lineTo(W, HDR_H);
  ctx.lineTo(0, HDR_H); ctx.lineTo(0, 18);
  ctx.arcTo(0, 0, 18, 0, 18); ctx.closePath();
  ctx.fill();

  // decorative circle top-left
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(-10, -10, 90, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.07;
  ctx.beginPath(); ctx.arc(W + 10, HDR_H + 10, 80, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // ── shop name (RTL — right side) ───────────────────────────
  fu(ctx, 22, '700');
  ctx.fillStyle   = '#fff';
  ctx.textAlign   = 'right';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur  = 5;
  ctx.fillText(clip(ctx, shop?.shop_name || 'پرنٹ شاپ', 230), W - PAD, 42);
  ctx.shadowBlur  = 0;

  // phone below shop name
  const ph = shop?.whatsapp_phone || shop?.phone || '';
  if (ph) {
    fl(ctx, 11, '400');
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.textAlign = 'right';
    ctx.fillText(ph, W - PAD, 62);
  }

  // address
  if (shop?.address) {
    fu(ctx, 10, '400');
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'right';
    ctx.fillText(clip(ctx, shop.address, 230), W - PAD, 80);
  }

  // ── "ریٹ لسٹ" badge (left side) ───────────────────────────
  const bLabel = 'ریٹ لسٹ';
  fu(ctx, 12, '700');
  ctx.textAlign = 'left';
  const bw = ctx.measureText(bLabel).width + 22;
  const bh = 28, bx = PAD, by = 24;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, bx, by, bw, bh, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.40)';
  ctx.lineWidth   = 1;
  rr(ctx, bx, by, bw, bh, 7);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.fillText(bLabel, bx + 11, by + 20);

  // date
  const ds = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  fl(ctx, 10, '400');
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'left';
  ctx.fillText(ds, PAD, 68);

  // ── divider line inside header ─────────────────────────────
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(PAD, HDR_H - 10); ctx.lineTo(W - PAD, HDR_H - 10); ctx.stroke();

  // ── category band ──────────────────────────────────────────
  let y = HDR_H;
  ctx.fillStyle = col.light;
  ctx.fillRect(0, y, W, CAT_H);

  // right accent bar (RTL — prominent side)
  ctx.fillStyle = col.accent;
  ctx.fillRect(W - 5, y, 5, CAT_H);

  // category name — RTL right-anchored
  fu(ctx, 15, '700');
  ctx.fillStyle = col.accent;
  ctx.textAlign = 'right';
  ctx.fillText(clip(ctx, cat.name, W - PAD * 2 - 70), W - PAD - 10, y + 31);

  // item count chip — left
  const ct = `${items.length} آئٹم`;
  fu(ctx, 10, '700');
  ctx.textAlign = 'left';
  const cw = ctx.measureText(ct).width + 18;
  ctx.fillStyle = col.chip;
  rr(ctx, PAD, y + CAT_H / 2 - 12, cw, 24, 12);
  ctx.fill();
  ctx.fillStyle = col.chipText;
  ctx.fillText(ct, PAD + 9, y + CAT_H / 2 + 5);
  y += CAT_H;

  // ── column headers ─────────────────────────────────────────
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, y, W, COL_H);
  ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y + COL_H); ctx.lineTo(W, y + COL_H); ctx.stroke();

  fu(ctx, 10, '600');
  ctx.fillStyle = '#94a3b8';

  ctx.textAlign = 'right';
  ctx.fillText('خدمت / آئٹم', W - PAD, y + 21);

  ctx.textAlign = 'center';
  ctx.fillText('یونٹ', W * 0.38, y + 21);

  ctx.textAlign = 'left';
  ctx.fillText('ریٹ (Rs)', PAD, y + 21);

  y += COL_H;

  // ── item rows ──────────────────────────────────────────────
  items.forEach((item, i) => {
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : col.light;
    ctx.fillRect(0, y, W, ITEM_H);

    // serial (left, small, Latin)
    fl(ctx, 10, '600');
    ctx.fillStyle = '#d1d5db';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y + 24);

    // item name — Urdu if available, else English — right side
    const displayName = item.name_ur || item.name || '';
    const isUrdu      = !!item.name_ur;
    if (isUrdu) {
      fu(ctx, 14, '700');
    } else {
      fl(ctx, 13, '700');
    }
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'right';
    ctx.fillText(clip(ctx, displayName, W - PAD * 2 - 120), W - PAD, y + 26);

    // description / notes — below name
    const sub = item.description || item.notes || '';
    if (sub) {
      const isNotes = item.notes && !item.description;
      fu(ctx, 9, '400');
      ctx.fillStyle = isNotes ? '#d97706' : '#94a3b8';
      ctx.textAlign = 'right';
      ctx.fillText(clip(ctx, sub, W - PAD * 2 - 100), W - PAD, y + 47);
    }

    // unit pill — center
    const ut = item.unit || '';
    fl(ctx, 10, '700');
    ctx.textAlign = 'center';
    const uw = Math.max(ctx.measureText(ut).width + 16, 36);
    const ux = W * 0.38;
    ctx.fillStyle = col.chip;
    rr(ctx, ux - uw / 2, y + ITEM_H / 2 - 12, uw, 24, 12);
    ctx.fill();
    ctx.fillStyle = col.chipText;
    ctx.fillText(ut, ux, y + ITEM_H / 2 + 5);

    // price — left side, large
    fl(ctx, 18, '800');
    ctx.fillStyle = col.accent;
    ctx.textAlign = 'left';
    ctx.fillText(Number(item.price).toLocaleString(), PAD + 18, y + 28);

    // "فی X" label
    fu(ctx, 9, '400');
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'left';
    ctx.fillText('فی ' + ut, PAD + 18, y + 47);

    // row separator
    ctx.strokeStyle = '#f1f5f9'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y + ITEM_H); ctx.lineTo(W - PAD, y + ITEM_H); ctx.stroke();

    y += ITEM_H;
  });

  // ── footer ─────────────────────────────────────────────────
  // gradient footer band
  const fg = ctx.createLinearGradient(0, y, W, y + FOOT_H);
  fg.addColorStop(0, col.light);
  fg.addColorStop(1, '#f8fafc');
  ctx.fillStyle = fg;
  ctx.fillRect(0, y, W, FOOT_H);
  ctx.strokeStyle = col.chip; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

  // accent dot row
  const dotY = y + FOOT_H / 2;
  [col.accent, col.mid, col.chip].forEach((c, di) => {
    ctx.fillStyle = c;
    ctx.globalAlpha = di === 2 ? 0.5 : 0.8;
    ctx.beginPath(); ctx.arc(W / 2 - 10 + di * 10, dotY, 3, 0, Math.PI * 2); ctx.fill();
  });
  ctx.globalAlpha = 1;

  fu(ctx, 9, '400');
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'right';
  ctx.fillText('قیمتیں بغیر اطلاع تبدیل ہو سکتی ہیں', W - PAD, y + FOOT_H - 10);

  fu(ctx, 9, '600');
  ctx.fillStyle = col.accent;
  ctx.textAlign = 'left';
  ctx.fillText(clip(ctx, shop?.shop_name || '', 130), PAD, y + FOOT_H - 10);

  return new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
}
