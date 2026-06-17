import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as api from '../../api/rateList.js';
import * as settingsAPI from '../../api/settings.js';

const PrintView = () => {
  const { data: catsData, isLoading: catsLoading } = useQuery({
    queryKey: ['rate-categories'],
    queryFn:  api.getCategories,
  });
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['rate-items-all'],
    queryFn:  api.getAllItems,
  });
  const { data: settingsData } = useQuery({
    queryKey: ['shop-settings'],
    queryFn:  settingsAPI.getSettings,
    staleTime: 5 * 60 * 1000,
  });

  const categories = catsData?.data || [];
  const allItems   = itemsData?.data || [];
  const shop       = settingsData?.data ?? {};

  const itemsMap = allItems.reduce((acc, item) => {
    if (!acc[item.category_id]) acc[item.category_id] = [];
    acc[item.category_id].push(item);
    return acc;
  }, {});

  useEffect(() => {
    document.title = `Price List — ${shop.shop_name || 'Print Shop'}`;
  }, [shop.shop_name]);

  const today = new Date().toLocaleDateString('en-PK', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const CAT_COLORS = [
    { bg: '#ede9fe', text: '#5b21b6', bar: '#7c3aed' },
    { bg: '#dbeafe', text: '#1e40af', bar: '#3b82f6' },
    { bg: '#d1fae5', text: '#065f46', bar: '#10b981' },
    { bg: '#fef3c7', text: '#92400e', bar: '#f59e0b' },
    { bg: '#fce7f3', text: '#9d174d', bar: '#ec4899' },
    { bg: '#ccfbf1', text: '#134e4a', bar: '#14b8a6' },
  ];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: #e2e8f0;
          color: #1e293b;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .page {
            box-shadow: none !important;
            margin: 0 !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          @page { margin: 12mm 10mm; size: A4; }
          tr { page-break-inside: avoid; }
          .cat-block { page-break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0', padding: '10px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '15px' }}>
          Rate List Preview
        </span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 20px', background: 'linear-gradient(135deg,#4338ca,#6366f1)',
              color: '#fff', border: 'none', borderRadius: '8px',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
            }}
          >
            🖨️  Print / Save PDF
          </button>
          <button
            onClick={() => window.close()}
            style={{
              padding: '8px 14px', background: '#f1f5f9', color: '#475569',
              border: 'none', borderRadius: '8px', fontWeight: 600,
              fontSize: '13px', cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>

      <div style={{ paddingTop: '60px' }}>
        {catsLoading || itemsLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#94a3b8', fontSize: '16px' }}>
            Loading…
          </div>
        ) : (
          <div className="page" style={{
            maxWidth: '820px', margin: '28px auto 40px',
            background: 'white', borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
            overflow: 'hidden',
          }}>

            {/* ── Header ── */}
            <div style={{
              background: 'linear-gradient(135deg, #312e81 0%, #4338ca 50%, #6366f1 100%)',
              padding: '36px 40px 30px',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* decorative circles */}
              {[
                { size: 180, top: -60, right: -40, op: 0.07 },
                { size: 100, top: 20,  right: 120, op: 0.05 },
                { size: 60,  top: -10, right: 200, op: 0.08 },
              ].map((c, i) => (
                <div key={i} style={{
                  position: 'absolute', top: c.top, right: c.right,
                  width: c.size, height: c.size, borderRadius: '50%',
                  background: `rgba(255,255,255,${c.op})`,
                  pointerEvents: 'none',
                }} />
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div>
                  <div style={{
                    display: 'inline-block', background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: 'rgba(255,255,255,0.9)', fontSize: '10px', fontWeight: 700,
                    letterSpacing: '2px', padding: '3px 10px', borderRadius: '20px',
                    marginBottom: '10px',
                  }}>
                    OFFICIAL PRICE LIST
                  </div>
                  <h1 style={{
                    fontSize: '30px', fontWeight: 900, color: '#ffffff',
                    letterSpacing: '-0.5px', lineHeight: 1,
                  }}>
                    {shop.shop_name || 'Print Shop'}
                  </h1>
                  {shop.tagline && (
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', marginTop: '6px' }}>
                      {shop.tagline}
                    </p>
                  )}
                  <div style={{ marginTop: '14px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {(shop.whatsapp_phone || shop.phone) && (
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>📞</span> {shop.whatsapp_phone || shop.phone}
                      </span>
                    )}
                    {shop.address && (
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>📍</span> {shop.address}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.95)', color: '#4338ca',
                    padding: '10px 18px', borderRadius: '10px', fontWeight: 900,
                    fontSize: '14px', letterSpacing: '1px', marginBottom: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}>
                    PRICE LIST
                  </div>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>
                    Updated: {today}
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                    {categories.length} categories · {allItems.length} services
                  </p>
                </div>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '32px 40px 28px' }}>
              {categories.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '60px 0' }}>
                  No rate list items found.
                </p>
              ) : (
                categories.map((cat, ci) => {
                  const catItems = itemsMap[cat.id] || [];
                  if (!catItems.length) return null;
                  const col = CAT_COLORS[ci % CAT_COLORS.length];

                  return (
                    <div key={cat.id} className="cat-block" style={{
                      marginBottom: ci < categories.length - 1 ? '36px' : 0,
                    }}>
                      {/* Category pill header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        marginBottom: '14px',
                      }}>
                        <div style={{
                          width: '5px', height: '28px', borderRadius: '3px',
                          background: col.bar, flexShrink: 0,
                        }} />
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                        }}>
                          <h2 style={{
                            fontSize: '14px', fontWeight: 800, color: '#1e293b',
                            textTransform: 'uppercase', letterSpacing: '0.8px',
                          }}>
                            {cat.name}
                          </h2>
                          <span style={{
                            background: col.bg, color: col.text,
                            fontSize: '10px', fontWeight: 700,
                            padding: '2px 8px', borderRadius: '20px',
                          }}>
                            {catItems.length} item{catItems.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Table */}
                      <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={TH({ w: '36px', center: true })}>  #</th>
                              <th style={TH({ w: 'auto' })}>Service / Item</th>
                              <th style={TH({ w: '160px' })}>Description</th>
                              <th style={TH({ w: '70px', center: true })}>Unit</th>
                              <th style={TH({ w: '110px', right: true, color: col.text })}>Rate (Rs)</th>
                              <th style={TH({ w: '80px', center: true })}>Min Order</th>
                            </tr>
                          </thead>
                          <tbody>
                            {catItems.map((item, idx) => (
                              <tr key={item.id} style={{
                                background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                                transition: 'background 0.1s',
                              }}>
                                <td style={TD({ center: true, color: '#cbd5e1', fw: 600 })}>
                                  {idx + 1}
                                </td>
                                <td style={TD({})}>
                                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>
                                    {item.name}
                                  </div>
                                  {item.notes && (
                                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px', fontStyle: 'italic' }}>
                                      ⚡ {item.notes}
                                    </div>
                                  )}
                                </td>
                                <td style={TD({ color: '#64748b', size: '12px' })}>
                                  {item.description || <span style={{ color: '#cbd5e1' }}>—</span>}
                                </td>
                                <td style={TD({ center: true })}>
                                  <span style={{
                                    display: 'inline-block', padding: '3px 9px',
                                    borderRadius: '20px', background: col.bg,
                                    color: col.text, fontSize: '11px', fontWeight: 700,
                                  }}>
                                    {item.unit}
                                  </span>
                                </td>
                                <td style={TD({ right: true })}>
                                  <span style={{
                                    fontSize: '16px', fontWeight: 900, color: col.bar,
                                  }}>
                                    {Number(item.price).toLocaleString()}
                                  </span>
                                </td>
                                <td style={TD({ center: true, color: '#94a3b8', size: '12px' })}>
                                  {item.min_order || <span style={{ color: '#e2e8f0' }}>—</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              borderTop: '1px solid #e2e8f0', padding: '16px 40px',
              background: 'linear-gradient(135deg,#f8fafc,#f1f5f9)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '8px',
            }}>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                * Prices are subject to change without prior notice. GST may apply.
              </p>
              <p style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                {shop.shop_name || 'Print Shop'} · {today}
              </p>
            </div>

          </div>
        )}
      </div>
    </>
  );
};

// Helper style factories
const TH = ({ w, center, right, color }) => ({
  padding: '10px 14px',
  width: w || 'auto',
  textAlign: right ? 'right' : center ? 'center' : 'left',
  fontSize: '10px', fontWeight: 700,
  color: color || '#94a3b8',
  textTransform: 'uppercase', letterSpacing: '0.6px',
  borderBottom: '2px solid #e2e8f0',
  whiteSpace: 'nowrap',
});

const TD = ({ center, right, color, fw, size }) => ({
  padding: '11px 14px',
  textAlign: right ? 'right' : center ? 'center' : 'left',
  fontSize: size || '13px',
  fontWeight: fw || 400,
  color: color || '#374151',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'middle',
});

export default PrintView;
