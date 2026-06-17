import { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Printer, Download, MessageCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/format.js';
import { Button } from '../../components/ui/index.js';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Phone → WhatsApp format (Pakistani numbers) ──────────────────
const toWaPhone = (raw = '') => {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0'))  return '92' + digits.slice(1);
  return '92' + digits;
};

// ── Capture the slip div as a PNG blob ───────────────────────────
const captureSlip = async (el) => {
  const canvas = await html2canvas(el, {
    scale:           2,
    useCORS:         true,
    backgroundColor: '#ffffff',
    logging:         false,
    // Give the element a little breathing room
    x: -8, y: -8,
    width:  el.offsetWidth  + 16,
    height: el.offsetHeight + 16,
  });
  return new Promise((res) => canvas.toBlob(res, 'image/png'));
};

// ── Slip data row helpers ─────────────────────────────────────────

const S = {
  // Shared inline style helpers so html2canvas captures correctly
  th: { background: '#f1f5f9', fontSize: '11px', fontWeight: '700', color: '#64748b',
        textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 12px', textAlign: 'left' },
  td: { padding: '7px 12px', fontSize: '13px', color: '#475569', borderBottom: '1px solid #f1f5f9' },
  tdR: { padding: '7px 12px', fontSize: '13px', fontFamily: 'monospace', fontWeight: '600',
         color: '#1e293b', textAlign: 'right', borderBottom: '1px solid #f1f5f9' },
};

// ─────────────────────────────────────────────────────────────────

const SalarySlip = ({ record, onClose }) => {
  const slipRef = useRef(null);
  const [capturing, setCapturing] = useState(false);

  const absent   = parseFloat(record.absent_days  || 0);
  const halfDay  = parseFloat(record.half_days    || 0);
  const present  = parseFloat(record.present_days || 0);
  const leave    = parseFloat(record.leave_days   || 0);
  const gross    = parseFloat(record.gross_salary || 0);
  const deduct   = parseFloat(record.deduction    || 0);
  const bonus    = parseFloat(record.bonus        || 0);
  const net      = parseFloat(record.net_salary   || 0);
  const rate     = parseFloat(record.daily_rate   || 0);
  const working  = record.working_days || 0;
  const deductDays = absent + halfDay * 0.5;
  const monthName  = MONTH_NAMES[record.month - 1];
  const waPhone    = toWaPhone(record.employee_phone);

  // ── Print ───────────────────────────────────────────────────────
  const handlePrint = () => {
    const html = slipRef.current.innerHTML;
    const win  = window.open('', '_blank', 'width=820,height=700');
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Salary Slip — ${record.employee_name} — ${monthName} ${record.year}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;background:#fff;color:#1e293b}
        @media print{body{margin:0}}
      </style></head><body>${html}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 350);
  };

  // ── Download PNG ────────────────────────────────────────────────
  const handleDownload = async () => {
    setCapturing(true);
    try {
      const blob = await captureSlip(slipRef.current);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `SalarySlip_${record.employee_name}_${monthName}${record.year}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Could not generate image. Please use Print instead.');
    } finally {
      setCapturing(false);
    }
  };

  // ── WhatsApp Share ──────────────────────────────────────────────
  const handleWhatsApp = async () => {
    setCapturing(true);
    try {
      const blob = await captureSlip(slipRef.current);
      const file = new File([blob], `SalarySlip_${record.employee_name}_${monthName}${record.year}.png`, { type: 'image/png' });

      // Try Web Share API (works on mobile Chrome/Android, iOS Safari 15+)
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files:   [file],
          title:   `Salary Slip — ${monthName} ${record.year}`,
          text:    `Salary Slip for ${record.employee_name}\nMonth: ${monthName} ${record.year}\nNet Salary: ${formatCurrency(net)}`,
        });
        return;
      }

      // Desktop fallback: download image + open WhatsApp
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);

      // Build WhatsApp message
      const text = encodeURIComponent(
        `*Salary Slip — ${monthName} ${record.year}*\n` +
        `Employee: ${record.employee_name}\n` +
        `Designation: ${record.employee_role || 'Staff'}\n\n` +
        `Working Days: ${working}\n` +
        `Present: ${present} | Absent: ${absent} | Half Day: ${halfDay} | Leave: ${leave}\n\n` +
        `Gross Salary: ${formatCurrency(gross)}\n` +
        `Deduction:    -${formatCurrency(deduct)}\n` +
        (bonus > 0 ? `Bonus:        +${formatCurrency(bonus)}\n` : '') +
        `*Net Payable: ${formatCurrency(net)}*\n\n` +
        `Status: ${record.status === 'paid' ? '✅ Paid' : '🕐 Pending'}\n` +
        `(Salary slip image has been downloaded — please forward it)`
      );

      const waUrl = waPhone
        ? `https://wa.me/${waPhone}?text=${text}`
        : `https://wa.me/?text=${text}`;

      window.open(waUrl, '_blank');
    } catch (e) {
      if (e?.name !== 'AbortError') {
        alert('Could not share. Image has been downloaded — please send it manually on WhatsApp.');
      }
    } finally {
      setCapturing(false);
    }
  };

  // ── Slip card (captured by html2canvas) ────────────────────────

  const SlipCard = () => (
    <div style={{
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#1e293b',
      background: '#ffffff',
      padding: '32px',
      width: '640px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    borderBottom: '2px solid #3b82f6', paddingBottom: '16px', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: '#1d4ed8', letterSpacing: '-0.3px' }}>
            Al-Kausar Printing Press
          </div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Quality Printing Services</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#334155', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Salary Slip
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {monthName} {record.year}
          </div>
          <div style={{
            display: 'inline-block', marginTop: '6px',
            padding: '2px 10px', borderRadius: '20px', fontSize: '10px', fontWeight: '700',
            letterSpacing: '.5px', textTransform: 'uppercase',
            background: record.status === 'paid' ? '#dcfce7' : '#fef9c3',
            color:      record.status === 'paid' ? '#15803d' : '#854d0e',
          }}>
            {record.status === 'paid' ? '✓ PAID' : 'PENDING'}
          </div>
        </div>
      </div>

      {/* Employee Info Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px',
        background: '#f8fafc', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px',
      }}>
        {[
          ['Employee Name', record.employee_name],
          ['Designation',  record.employee_role || 'Staff'],
          ['Phone',        record.employee_phone || '—'],
          ['Slip Period',  `${monthName} ${record.year}`],
        ].map(([lbl, val]) => (
          <div key={lbl}>
            <div style={{ fontSize: '9px', fontWeight: '700', color: '#94a3b8',
                          textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: '2px' }}>
              {lbl}
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1e293b' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Attendance Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th colSpan={2} style={{ ...S.th, background: '#e0f2fe', color: '#0369a1' }}>
              Attendance Summary
            </th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Total Working Days (Fridays excluded)', working],
            ['Days Present',                          present],
            ['Days Absent',                           absent],
            ['Half Days',                             halfDay],
            ['Leave Days (Paid)',                     leave],
            ['Deductible Days',                       `${deductDays.toFixed(1)}`],
          ].map(([lbl, val]) => (
            <tr key={lbl}>
              <td style={S.td}>{lbl}</td>
              <td style={S.tdR}>{val}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Salary Breakdown Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px' }}>
        <thead>
          <tr>
            <th style={{ ...S.th, background: '#f0fdf4', color: '#15803d' }}>Description</th>
            <th style={{ ...S.th, background: '#f0fdf4', color: '#15803d', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={S.td}>Monthly Gross Salary</td>
            <td style={S.tdR}>{formatCurrency(gross)}</td>
          </tr>
          <tr>
            <td style={S.td}>
              Deduction ({formatCurrency(rate)}/day × {deductDays.toFixed(1)} days)
            </td>
            <td style={{ ...S.tdR, color: deduct > 0 ? '#dc2626' : '#94a3b8' }}>
              {deduct > 0 ? `− ${formatCurrency(deduct)}` : '—'}
            </td>
          </tr>
          {bonus > 0 && (
            <tr>
              <td style={S.td}>Bonus / Incentive</td>
              <td style={{ ...S.tdR, color: '#059669' }}>+ {formatCurrency(bonus)}</td>
            </tr>
          )}
          {/* Net payable row */}
          <tr style={{ background: '#eff6ff' }}>
            <td style={{ padding: '10px 12px', fontSize: '15px', fontWeight: '700', color: '#1d4ed8' }}>
              Net Salary Payable
            </td>
            <td style={{ padding: '10px 12px', fontSize: '16px', fontFamily: 'monospace',
                         fontWeight: '800', color: '#1d4ed8', textAlign: 'right' }}>
              {formatCurrency(net)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Paid At */}
      {record.status === 'paid' && record.paid_at && (
        <div style={{ fontSize: '11px', color: '#059669', marginBottom: '14px', fontWeight: '600' }}>
          ✓ Salary paid on{' '}
          {new Date(record.paid_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}

      {/* Notes */}
      {record.notes && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
                      padding: '10px 14px', marginBottom: '14px' }}>
          <div style={{ fontSize: '10px', fontWeight: '700', color: '#92400e', marginBottom: '3px',
                        textTransform: 'uppercase', letterSpacing: '.5px' }}>Note</div>
          <div style={{ fontSize: '12px', color: '#78350f' }}>{record.notes}</div>
        </div>
      )}

      {/* Signatures */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px',
                    marginTop: '28px', paddingTop: '14px', borderTop: '1px dashed #cbd5e1' }}>
        {['Employee Signature', 'Employer / Manager'].map((lbl) => (
          <div key={lbl} style={{ textAlign: 'center' }}>
            <div style={{ borderBottom: '1px solid #94a3b8', height: '44px', marginBottom: '6px' }} />
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{lbl}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', color: '#94a3b8',
                    borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
        Al-Kausar Printing Press ERP · Computer-generated document · Do not require stamp
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex items-center flex-wrap gap-2 pb-3 border-b border-slate-100">
        {/* WhatsApp */}
        <button
          onClick={handleWhatsApp}
          disabled={capturing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: capturing ? '#64748b' : '#25D366' }}
        >
          {capturing
            ? <Loader2 size={15} className="animate-spin" />
            : <MessageCircle size={15} />}
          {capturing ? 'Generating…' : 'Share on WhatsApp'}
        </button>

        {/* Download Image */}
        <button
          onClick={handleDownload}
          disabled={capturing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Download size={15} />
          Download Image
        </button>

        {/* Print */}
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
        >
          <Printer size={15} />
          Print / PDF
        </button>

        {/* Phone hint */}
        {waPhone && (
          <span className="text-xs text-slate-400 ml-auto">
            Sending to +{waPhone}
          </span>
        )}
      </div>

      {/* Slip Preview — captured by html2canvas */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div ref={slipRef} className="inline-block">
          <SlipCard />
        </div>
      </div>

      {/* Desktop hint */}
      <p className="text-xs text-slate-400 text-center">
        On desktop: the image downloads automatically, then WhatsApp opens — just attach and send.
        On mobile: tap "Share on WhatsApp" to share directly.
      </p>
    </div>
  );
};

export default SalarySlip;
