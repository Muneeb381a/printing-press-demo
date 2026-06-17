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

function f(ctx, size, weight = '400') {
  ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

function clip(ctx, text, maxW) {
  let t = String(text ?? '');
  while (ctx.measureText(t).width > maxW && t.length > 3) t = t.slice(0, -1);
  return t !== String(text ?? '') ? t + '…' : t;
}

const CAT_COLORS = [
  { accent: '#7c3aed', light: '#ede9fe', text: '#5b21b6' },
  { accent: '#2563eb', light: '#dbeafe', text: '#1d4ed8' },
  { accent: '#059669', light: '#d1fae5', text: '#065f46' },
  { accent: '#d97706', light: '#fef3c7', text: '#92400e' },
  { accent: '#db2777', light: '#fce7f3', text: '#9d174d' },
  { accent: '#0891b2', light: '#cffafe', text: '#164e63' },
];

/**
 * Generates one PNG image per category.
 * Returns an array of { name, blob }.
 *
 * @param {{ categories, itemsMap, shop }} opts
 * @returns {Promise<Array<{ name: string, blob: Blob }>>}
 */
export async function generateRateListImages({ categories, itemsMap, shop }) {
  const results = [];

  for (let ci = 0; ci < categories.length; ci++) {
    const cat      = categories[ci];
    const items    = (itemsMap[cat.id] || []);
    if (!items.length) continue;

    const blob = await drawCategoryImage(cat, items, shop, ci);
    results.push({ name: cat.name, blob });
  }
  return results;
}

async function drawCategoryImage(cat, items, shop, colorIdx) {
  const SCALE  = 2;
  const W      = 480;
  const PAD    = 24;
  const col    = CAT_COLORS[colorIdx % CAT_COLORS.length];

  const HDR_H  = 100;
  const CAT_H  = 44;
  const COL_H  = 28;
  const ITEM_H = 52;
  const FOOT_H = 40;
  const H = HDR_H + CAT_H + COL_H + items.length * ITEM_H + FOOT_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx     = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ─── White background ───────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  rr(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // ─── Header banner ──────────────────────────────────────────
  const hg = ctx.createLinearGradient(0, 0, W, HDR_H);
  hg.addColorStop(0,   '#312e81');
  hg.addColorStop(0.6, '#4338ca');
  hg.addColorStop(1,   '#6366f1');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(16, 0); ctx.lineTo(W - 16, 0);
  ctx.arcTo(W, 0, W, 16, 16);
  ctx.lineTo(W, HDR_H); ctx.lineTo(0, HDR_H); ctx.lineTo(0, 16);
  ctx.arcTo(0, 0, 16, 0, 16);
  ctx.closePath();
  ctx.fill();

  // subtle diagonal lines
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let x = -HDR_H; x < W + HDR_H; x += 20) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + HDR_H, HDR_H);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 7; ctx.stroke();
  }
  ctx.restore();

  // Shop name
  f(ctx, 20, '800');
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur  = 4;
  ctx.fillText(clip(ctx, shop?.shop_name || 'Print Shop', 220), PAD, 38);
  ctx.shadowBlur  = 0;

  // Phone
  const ph = shop?.whatsapp_phone || shop?.phone || '';
  if (ph) {
    f(ctx, 11, '400');
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(ph, PAD, 56);
  }

  // PRICE LIST badge
  const bw = 82, bh = 24, bx = W - PAD - bw, by = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  rr(ctx, bx, by, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth   = 1;
  rr(ctx, bx, by, bw, bh, 6);
  ctx.stroke();
  f(ctx, 10, '700');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('PRICE LIST', bx + bw / 2, by + 16);

  // Date top-right
  const dateStr = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  f(ctx, 10, '400');
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, W - PAD, 56);

  // Tagline / address
  if (shop?.address) {
    f(ctx, 10, '400');
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.textAlign = 'left';
    ctx.fillText(clip(ctx, shop.address, W - PAD * 2), PAD, 74);
  }

  // ─── Category header band ───────────────────────────────────
  let y = HDR_H;
  ctx.fillStyle = col.light;
  ctx.fillRect(0, y, W, CAT_H);

  // left accent bar
  ctx.fillStyle = col.accent;
  ctx.fillRect(0, y, 5, CAT_H);

  f(ctx, 15, '800');
  ctx.fillStyle = col.text;
  ctx.textAlign = 'left';
  ctx.fillText(cat.name.toUpperCase(), PAD + 8, y + CAT_H / 2 + 6);

  // item count chip
  const countTxt = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  f(ctx, 10, '700');
  const cw = ctx.measureText(countTxt).width + 16;
  ctx.fillStyle = col.accent;
  rr(ctx, W - PAD - cw, y + CAT_H / 2 - 10, cw, 20, 10);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(countTxt, W - PAD - 8, y + CAT_H / 2 + 4);

  y += CAT_H;

  // ─── Column headers ─────────────────────────────────────────
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, y, W, COL_H);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, y + COL_H); ctx.lineTo(W, y + COL_H); ctx.stroke();

  f(ctx, 9, '700');
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', PAD + 22, y + 20);
  ctx.textAlign = 'center';
  ctx.fillText('UNIT', W - 170, y + 20);
  ctx.textAlign = 'right';
  ctx.fillText('RATE (Rs)', W - PAD, y + 20);
  y += COL_H;

  // ─── Item rows ───────────────────────────────────────────────
  items.forEach((item, i) => {
    // row background
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fafafa';
    ctx.fillRect(0, y, W, ITEM_H);

    // serial
    f(ctx, 11, '600');
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y + ITEM_H / 2 + 4);

    // name
    f(ctx, 13, '700');
    ctx.fillStyle = '#1e293b';
    ctx.fillText(clip(ctx, item.name, W - PAD * 2 - 130), PAD + 22, y + 22);

    // description or notes
    const sub = item.description || item.notes || '';
    if (sub) {
      f(ctx, 10, '400');
      ctx.fillStyle = item.notes && !item.description ? '#d97706' : '#94a3b8';
      ctx.fillText(clip(ctx, sub, W - PAD * 2 - 130), PAD + 22, y + 38);
    }

    // unit pill
    f(ctx, 10, '700');
    const ut = item.unit || '';
    const uw = ctx.measureText(ut).width + 14;
    ctx.fillStyle = col.light;
    rr(ctx, W - 166 - uw / 2, y + ITEM_H / 2 - 11, uw, 22, 11);
    ctx.fill();
    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.fillText(ut, W - 166, y + ITEM_H / 2 + 4);

    // price
    f(ctx, 16, '800');
    ctx.fillStyle = col.accent;
    ctx.textAlign = 'right';
    ctx.fillText(Number(item.price).toLocaleString(), W - PAD, y + 26);

    f(ctx, 9, '400');
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('per ' + (item.unit || 'unit'), W - PAD, y + 41);

    // row bottom border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(PAD, y + ITEM_H); ctx.lineTo(W - PAD, y + ITEM_H); ctx.stroke();

    y += ITEM_H;
  });

  // ─── Footer ─────────────────────────────────────────────────
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, y, W, FOOT_H);
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

  f(ctx, 9, '400');
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('Prices subject to change without notice', PAD, y + FOOT_H / 2 + 4);
  f(ctx, 9, '600');
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(shop?.shop_name || '', W - PAD, y + FOOT_H / 2 + 4);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}
