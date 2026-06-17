/**
 * Draws a rounded rectangle on a canvas context.
 * Polyfills ctx.roundRect for older browsers.
 */
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

function font(ctx, size, weight = 'normal') {
  ctx.font = `${weight} ${size}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
}

/**
 * Generates a quote card PNG as a Blob.
 *
 * @param {object} opts
 * @param {Array}  opts.rows     - calculator rows
 * @param {number} opts.subtotal
 * @param {number} opts.discAmt
 * @param {number} opts.total
 * @param {object} opts.shop     - shop settings
 * @param {Function} opts.computeRow - row compute fn (returns { sqft, amt })
 * @returns {Promise<Blob>}
 */
export async function generateQuoteImage({ rows, subtotal, discAmt, total, shop, computeRow }) {
  const SCALE = 2;          // retina
  const W     = 440;        // logical width

  const validRows = rows.filter(r => computeRow(r).amt > 0);
  const PAD   = 28;
  const ITEM_H = 60;

  const headerH = 110;
  const footerH = 52;
  const sepH    = 16;
  const totalH  = 64;
  const discH   = discAmt > 0 ? 32 : 0;
  const H = headerH + validRows.length * ITEM_H + sepH + discH + totalH + footerH;

  const canvas  = document.createElement('canvas');
  canvas.width  = W * SCALE;
  canvas.height = H * SCALE;

  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ── Background ──────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0,   '#0f172a');
  bgGrad.addColorStop(1,   '#1a2744');
  ctx.fillStyle = bgGrad;
  rr(ctx, 0, 0, W, H, 20);
  ctx.fill();

  // ── Top accent stripe ────────────────────────────────────────
  const stripe = ctx.createLinearGradient(0, 0, W, 0);
  stripe.addColorStop(0,   '#6366f1');
  stripe.addColorStop(0.5, '#8b5cf6');
  stripe.addColorStop(1,   '#06b6d4');
  ctx.fillStyle = stripe;
  rr(ctx, 0, 0, W, 4, 20);
  ctx.fillRect(10, 0, W - 20, 4);

  // ── Header ───────────────────────────────────────────────────
  // Shop name
  font(ctx, 22, 'bold');
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'left';
  ctx.fillText(shop?.shop_name || 'Print Shop', PAD, 52);

  // PRICE QUOTE pill
  const pillW = 104, pillH = 26, pillX = W - PAD - pillW, pillY = 30;
  const pillG = ctx.createLinearGradient(pillX, 0, pillX + pillW, 0);
  pillG.addColorStop(0, '#6366f1');
  pillG.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = pillG;
  rr(ctx, pillX, pillY, pillW, pillH, 7);
  ctx.fill();
  font(ctx, 11, 'bold');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('PRICE QUOTE', pillX + pillW / 2, pillY + 17);

  // Date
  const date = new Date().toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' });
  font(ctx, 12);
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.fillText(date, PAD, 72);

  // Phone
  const phone = shop?.whatsapp_phone || shop?.phone;
  if (phone) {
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'right';
    font(ctx, 12);
    ctx.fillText(phone, W - PAD, 72);
  }

  // Thin header divider
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, 88);
  ctx.lineTo(W - PAD, 88);
  ctx.stroke();

  // Column headers
  font(ctx, 10, 'bold');
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';
  ctx.fillText('ITEM', PAD, 104);
  ctx.textAlign = 'right';
  ctx.fillText('AMOUNT', W - PAD, 104);

  // ── Item rows ─────────────────────────────────────────────────
  let y = headerH;

  validRows.forEach((row, i) => {
    const { sqft, linear, amt } = computeRow(row);
    const isEven = i % 2 === 0;

    // Subtle row background
    if (isEven) {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, y, W, ITEM_H);
    }

    // Mode dot
    const dotColors = { area: '#818cf8', piece: '#34d399', length: '#fbbf24' };
    ctx.fillStyle = dotColors[row.mode] || '#818cf8';
    ctx.beginPath();
    ctx.arc(PAD + 5, y + 20, 4, 0, Math.PI * 2);
    ctx.fill();

    // Description / name
    const label = row.desc || ({ area: 'Area Print', piece: 'Piece Order', length: 'Length Print' }[row.mode]);
    font(ctx, 13, 'bold');
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'left';
    // Truncate if too long
    const maxW = W - PAD * 2 - 60 - 16;
    let displayLabel = label;
    while (ctx.measureText(displayLabel).width > maxW && displayLabel.length > 8) {
      displayLabel = displayLabel.slice(0, -1);
    }
    if (displayLabel !== label) displayLabel += '…';
    ctx.fillText(displayLabel, PAD + 16, y + 23);

    // Detail line
    let detail = '';
    if (row.mode === 'area' && sqft > 0)
      detail = `${row.w}ft × ${row.h}ft × ${row.qty}pcs = ${sqft.toFixed(2)} sqft  @  Rs ${parseFloat(row.rate).toLocaleString()}/sqft`;
    else if (row.mode === 'piece')
      detail = `${row.qty} pcs  ×  Rs ${parseFloat(row.rate).toLocaleString()}/piece`;
    else if (row.mode === 'length' && linear > 0)
      detail = `${row.len}ft × ${row.qty}pcs = ${linear.toFixed(1)} ft  @  Rs ${parseFloat(row.rate).toLocaleString()}/ft`;

    font(ctx, 11);
    ctx.fillStyle = '#475569';
    ctx.textAlign = 'left';
    ctx.fillText(detail, PAD + 16, y + 42);

    // Amount
    font(ctx, 15, 'bold');
    ctx.fillStyle = '#a78bfa';
    ctx.textAlign = 'right';
    ctx.fillText(`Rs ${amt.toLocaleString()}`, W - PAD, y + 32);

    y += ITEM_H;
  });

  // ── Separator ─────────────────────────────────────────────────
  ctx.strokeStyle = '#1e3a5f';
  ctx.setLineDash([5, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 8);
  ctx.lineTo(W - PAD, y + 8);
  ctx.stroke();
  ctx.setLineDash([]);
  y += sepH;

  // ── Discount ──────────────────────────────────────────────────
  if (discAmt > 0) {
    y += 8;
    font(ctx, 12);
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('Discount', PAD, y + 12);
    font(ctx, 13, 'bold');
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'right';
    ctx.fillText(`− Rs ${discAmt.toLocaleString()}`, W - PAD, y + 12);
    y += discH;
  }

  // ── Total block ───────────────────────────────────────────────
  y += 8;
  const totalBlockH = 52;
  const totalG = ctx.createLinearGradient(PAD, y, W - PAD, y);
  totalG.addColorStop(0, 'rgba(99,102,241,0.15)');
  totalG.addColorStop(1, 'rgba(139,92,246,0.10)');
  ctx.fillStyle = totalG;
  rr(ctx, PAD, y, W - PAD * 2, totalBlockH, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(99,102,241,0.3)';
  ctx.lineWidth = 1;
  rr(ctx, PAD, y, W - PAD * 2, totalBlockH, 12);
  ctx.stroke();

  font(ctx, 12, 'bold');
  ctx.fillStyle = '#818cf8';
  ctx.textAlign = 'left';
  ctx.fillText('TOTAL', PAD + 16, y + 31);

  font(ctx, 26, 'bold');
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'right';
  ctx.fillText(`Rs ${total.toLocaleString()}`, W - PAD - 16, y + 34);

  y += totalBlockH + 8;

  // ── Footer ────────────────────────────────────────────────────
  // Footer divider
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PAD, y + 4);
  ctx.lineTo(W - PAD, y + 4);
  ctx.stroke();

  y += 16;
  font(ctx, 10);
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';
  ctx.fillText('Prices are estimates. Final may vary.', PAD, y + 14);
  ctx.textAlign = 'right';
  ctx.fillText(shop?.shop_name || '', W - PAD, y + 14);

  // Return as blob
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png', 0.95));
}
