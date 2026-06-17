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

function Rs(n) {
  const v = parseFloat(n) || 0;
  return 'Rs ' + v.toLocaleString('en-PK', { maximumFractionDigits: 0 });
}

const PRICING = {
  sqft: 'sqft', piece: 'per piece', length: 'per ft',
  fixed: 'fixed', per_meter: 'per meter',
};

export async function generateBillImage({ bill, items = [], extraCharges = [], totalPaid = 0, shop }) {
  const SCALE = 2;
  const W     = 480;
  const PAD   = 28;

  // ─── Height ────────────────────────────────────────────────
  const HDR_H  = 100;          // purple header banner
  const INFO_H = 64;           // customer info band
  const COL_H  = 30;           // items column header
  const ITEM_H = items.length === 0 ? 0 : items.length * 58;
  const FIN_H  = 20            // gap before financials
    + 36                       // subtotal
    + (parseFloat(bill.discount_amount) > 0 ? 34 : 0)
    + (extraCharges.length > 0 ? 34 : 0)
    + 8                        // gap before total
    + 52                       // total block
    + (totalPaid > 0 ? 34 : 0)
    + (parseFloat(bill.remaining_balance) > 0 ? 34 : 0)
    + 16;
  const FOOT_H = 44;
  const H = HDR_H + INFO_H + COL_H + ITEM_H + FIN_H + FOOT_H;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;
  const ctx     = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ─── White body ────────────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  rr(ctx, 0, 0, W, H, 16);
  ctx.fill();

  // ─── Header banner (indigo gradient) ───────────────────────
  const hg = ctx.createLinearGradient(0, 0, W, HDR_H);
  hg.addColorStop(0,   '#4338ca');   // indigo-700
  hg.addColorStop(0.6, '#6366f1');   // indigo-500
  hg.addColorStop(1,   '#818cf8');   // indigo-400
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(W - 16, 0);
  ctx.arcTo(W, 0,   W,   16,  16);
  ctx.lineTo(W, HDR_H);
  ctx.lineTo(0, HDR_H);
  ctx.lineTo(0, 16);
  ctx.arcTo(0, 0,   16,  0,   16);
  ctx.closePath();
  ctx.fill();

  // subtle diagonal pattern on header
  ctx.save();
  ctx.globalAlpha = 0.06;
  for (let x = -HDR_H; x < W + HDR_H; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + HDR_H, HDR_H);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 6;
    ctx.stroke();
  }
  ctx.restore();

  // Shop name
  f(ctx, 24, '700');
  ctx.fillStyle   = '#ffffff';
  ctx.textAlign   = 'left';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur  = 4;
  ctx.fillText(clip(ctx, shop?.shop_name || 'Print Shop', 220), PAD, 44);
  ctx.shadowBlur  = 0;

  // Phone under shop name
  const ph = shop?.whatsapp_phone || shop?.phone || '';
  if (ph) {
    f(ctx, 12, '400');
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(ph, PAD, 64);
  }

  // INVOICE badge (right side)
  const bw = 82, bh = 26, bx = W - PAD - bw, by = 14;
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  rr(ctx, bx, by, bw, bh, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth   = 1;
  rr(ctx, bx, by, bw, bh, 6);
  ctx.stroke();
  f(ctx, 11, '700');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('INVOICE', bx + bw / 2, by + 17);

  // Bill number
  f(ctx, 19, '700');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(bill.bill_number, W - PAD, 64);

  // Date
  const dateStr = new Date(bill.created_at || Date.now())
    .toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  f(ctx, 11, '400');
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fillText(dateStr, W - PAD, 82);

  // ─── Customer info band ────────────────────────────────────
  let y = HDR_H;
  ctx.fillStyle = '#f8fafc';   // slate-50
  ctx.fillRect(0, y, W, INFO_H);

  // left accent bar
  ctx.fillStyle = '#6366f1';
  ctx.fillRect(0, y, 4, INFO_H);

  // "BILL TO" label
  f(ctx, 9, '700');
  ctx.fillStyle = '#6366f1';
  ctx.textAlign = 'left';
  ctx.fillText('BILL TO', PAD + 8, y + 18);

  // Customer name
  f(ctx, 15, '700');
  ctx.fillStyle = '#1e293b';
  ctx.fillText(clip(ctx, bill.customer_name || '—', W / 2 - PAD), PAD + 8, y + 37);

  // Address
  if (bill.customer_address) {
    f(ctx, 11, '400');
    ctx.fillStyle = '#64748b';
    ctx.fillText(clip(ctx, bill.customer_address, W / 2 - PAD), PAD + 8, y + 53);
  }

  // Customer phone (right)
  if (bill.customer_phone) {
    f(ctx, 13, '600');
    ctx.fillStyle = '#334155';
    ctx.textAlign = 'right';
    ctx.fillText(bill.customer_phone, W - PAD, y + 37);
  }

  // Status badge
  const STATUS_COLOR = {
    pending:     { bg: '#fef3c7', text: '#92400e' },
    in_progress: { bg: '#dbeafe', text: '#1e40af' },
    completed:   { bg: '#d1fae5', text: '#065f46' },
    delivered:   { bg: '#d1fae5', text: '#065f46' },
    cancelled:   { bg: '#fee2e2', text: '#991b1b' },
  };
  const sc = STATUS_COLOR[bill.status] || { bg: '#f1f5f9', text: '#475569' };
  const statusText = (bill.status || 'pending').replace('_', ' ').toUpperCase();
  f(ctx, 10, '700');
  ctx.textAlign = 'right';
  const sw = ctx.measureText(statusText).width + 16;
  const sx = W - PAD - sw, sy = y + 44;
  ctx.fillStyle = sc.bg;
  rr(ctx, sx, sy, sw, 20, 4);
  ctx.fill();
  ctx.fillStyle = sc.text;
  ctx.fillText(statusText, W - PAD - 8, sy + 14);

  // Divider
  y += INFO_H;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();

  // ─── Items column header ───────────────────────────────────
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, y, W, COL_H);

  f(ctx, 9, '700');
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', PAD, y + 20);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT', W - PAD, y + 20);
  y += COL_H;

  // ─── Item rows ─────────────────────────────────────────────
  items.forEach((item, i) => {
    const rowH = 58;

    // alternate row bg
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#fafafa';
    ctx.fillRect(0, y, W, rowH);

    // left mode dot
    const dotColor = {
      sqft: '#6366f1', piece: '#10b981', length: '#f59e0b',
      fixed: '#8b5cf6', per_meter: '#06b6d4',
    }[item.pricing_model] || '#94a3b8';
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(PAD - 8, y + 20, 4, 0, Math.PI * 2);
    ctx.fill();

    // serial number
    f(ctx, 11, '600');
    ctx.fillStyle = '#cbd5e1';
    ctx.textAlign = 'left';
    ctx.fillText(String(i + 1).padStart(2, '0'), PAD, y + 22);

    // item name
    const name = item.description || item.product_name || 'Item';
    f(ctx, 14, '600');
    ctx.fillStyle = '#1e293b';
    ctx.fillText(clip(ctx, name, W - PAD * 2 - 90), PAD + 22, y + 22);

    // detail line
    const pm = PRICING[item.pricing_model] || item.pricing_model || '';
    let detail = `${item.quantity ?? 1} pcs  ·  ${pm}`;
    if (item.width && item.height) detail += `  ·  ${item.width} × ${item.height} ft`;
    if (item.sqft)                 detail += `  ·  ${parseFloat(item.sqft).toFixed(1)} sqft`;
    f(ctx, 10, '400');
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(clip(ctx, detail, W - PAD * 2 - 90), PAD + 22, y + 38);

    // unit price
    f(ctx, 10, '400');
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText(`@ ${Rs(item.unit_price)}`, W - PAD, y + 38);

    // amount
    f(ctx, 15, '700');
    ctx.fillStyle = '#4338ca';
    ctx.fillText(Rs(item.item_total), W - PAD, y + 22);

    // bottom border
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, y + rowH - 1); ctx.lineTo(W - PAD, y + rowH - 1); ctx.stroke();

    y += rowH;
  });

  // ─── Financials section ────────────────────────────────────
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, y, W, FIN_H + FOOT_H);

  // dashed separator
  y += 20;
  ctx.strokeStyle = '#cbd5e1';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 16;

  const finRow = (label, value, labelColor = '#64748b', valueColor = '#1e293b', bold = false) => {
    f(ctx, 13, '400');
    ctx.fillStyle   = labelColor;
    ctx.textAlign   = 'left';
    ctx.fillText(label, PAD, y + 14);
    f(ctx, 13, bold ? '700' : '600');
    ctx.fillStyle   = valueColor;
    ctx.textAlign   = 'right';
    ctx.fillText(value, W - PAD, y + 14);
    y += 34;
  };

  finRow('Subtotal', Rs(bill.subtotal), '#94a3b8', '#475569');

  if (parseFloat(bill.discount_amount) > 0) {
    const dl = bill.discount_type === 'percentage'
      ? `Discount (${bill.discount_value}%)`
      : 'Discount';
    finRow(dl, `− ${Rs(bill.discount_amount)}`, '#64748b', '#16a34a');
  }

  if (extraCharges.length > 0) {
    finRow(`Extra charges (${extraCharges.length})`, `+ ${Rs(bill.extra_charges)}`, '#64748b', '#d97706');
  }

  // Total block
  y += 4;
  const TBH = 52;
  const tg  = ctx.createLinearGradient(PAD, y, W - PAD, y);
  tg.addColorStop(0, '#4338ca');
  tg.addColorStop(1, '#6366f1');
  ctx.fillStyle = tg;
  rr(ctx, PAD, y, W - PAD * 2, TBH, 10);
  ctx.fill();

  f(ctx, 12, '700');
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', PAD + 16, y + 32);

  f(ctx, 24, '700');
  ctx.fillStyle   = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur  = 6;
  ctx.textAlign   = 'right';
  ctx.fillText(Rs(bill.total_amount), W - PAD - 16, y + 35);
  ctx.shadowBlur  = 0;

  y += TBH + 8;

  if (totalPaid > 0)
    finRow('Amount paid', Rs(totalPaid), '#64748b', '#16a34a');

  if (parseFloat(bill.remaining_balance) > 0) {
    // remaining balance box
    ctx.fillStyle = '#fff5f5';
    rr(ctx, PAD, y, W - PAD * 2, 30, 6);
    ctx.fill();
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth   = 1;
    rr(ctx, PAD, y, W - PAD * 2, 30, 6);
    ctx.stroke();

    f(ctx, 12, '700');
    ctx.fillStyle = '#dc2626';
    ctx.textAlign = 'left';
    ctx.fillText('Balance Due', PAD + 12, y + 20);
    ctx.textAlign = 'right';
    ctx.fillText(Rs(bill.remaining_balance), W - PAD - 12, y + 20);
    y += 42;
  }

  // ─── Footer ────────────────────────────────────────────────
  y += 10;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  y += 14;

  f(ctx, 10, '400');
  ctx.fillStyle = '#94a3b8';
  ctx.textAlign = 'center';
  ctx.fillText('Thank you for your business!', W / 2, y + 12);

  // shop name bottom right
  f(ctx, 9, '600');
  ctx.fillStyle = '#cbd5e1';
  ctx.textAlign = 'right';
  ctx.fillText(shop?.shop_name || '', W - PAD, y + 12);

  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}
