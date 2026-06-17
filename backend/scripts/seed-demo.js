/**
 * Demo seed — realistic printing-press data spread over 6 months.
 * Run from backend/:  node scripts/seed-demo.js
 *
 * Clears and re-seeds:
 *   categories, products, pricing_rules, quantity_tiers, customers,
 *   employees, bills, bill_items, payments, attendance,
 *   expenses, inventory_items, payroll
 */
import 'dotenv/config';
import pool from '../src/config/db.js';

const log  = (msg) => console.log(`  ✓ ${msg}`);

// ── helpers ───────────────────────────────────────────────────
const rnd  = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[rnd(0, arr.length - 1)];

// Returns YYYY-MM-DD string N days ago (+ optional day offset)
const daysAgo = (n, plusDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n + plusDays);
  return d.toISOString().slice(0, 10);
};

async function seed() {
  const client = await pool.connect();
  console.log('\n[Seed] Connected — starting demo data seed…\n');

  try {
    await client.query('BEGIN');

    // ── 1. Clear existing data ────────────────────────────────
    console.log('[Seed] Clearing old data…');
    await client.query(`
      TRUNCATE TABLE
        payroll,
        attendance,
        expenses,
        payments,
        bill_extra_charges,
        bill_items,
        bills,
        customers,
        quantity_tiers,
        pricing_rules,
        product_specifications,
        products,
        categories,
        inventory_items
      RESTART IDENTITY CASCADE
    `);
    await client.query(`ALTER SEQUENCE IF EXISTS bill_number_seq RESTART WITH 1001`);
    log('All tables cleared');

    // ── 2. Categories ─────────────────────────────────────────
    console.log('\n[Seed] Categories…');
    const { rows: cats } = await client.query(`
      INSERT INTO categories (name, slug, description, sort_order, count_in_sqft) VALUES
        ('Flex Printing',     'flex',     'Star flex, China flex, One-way vision',     1, true),
        ('Visiting Cards',    'cards',    'Business cards, letterheads, envelopes',    2, false),
        ('Digital Printing',  'digital',  'Stickers, banners, photo prints',           3, false),
        ('Offset Printing',   'offset',   'Brochures, flyers, books, magazines',       4, false),
        ('Stamp & Seal',      'stamps',   'Rubber stamps, self-inking, flash stamps',  5, false)
      RETURNING id, slug, name
    `);
    const cat = Object.fromEntries(cats.map(r => [r.slug, r.id]));
    log(`${cats.length} categories`);

    // ── 3. Products ───────────────────────────────────────────
    console.log('\n[Seed] Products…');
    const { rows: prods } = await client.query(`
      INSERT INTO products (category_id, name, pricing_model, base_price, unit) VALUES
        ($1, 'Star Flex',           'area_based',     NULL, 'sqft'),
        ($1, 'China Flex',          'area_based',     NULL, 'sqft'),
        ($1, 'One Way Vision',      'area_based',     NULL, 'sqft'),
        ($1, 'Backlit Flex',        'area_based',     NULL, 'sqft'),
        ($2, 'Business Cards',      'quantity_based', NULL, 'pcs'),
        ($2, 'Letter Heads',        'quantity_based', NULL, 'pcs'),
        ($3, 'Vinyl Stickers',      'quantity_based', NULL, 'pcs'),
        ($3, 'PVC ID Cards',        'quantity_based', NULL, 'pcs'),
        ($4, 'Flyers (A5)',         'quantity_based', NULL, 'pcs'),
        ($4, 'Brochures',           'quantity_based', NULL, 'pcs'),
        ($5, 'Self-Inking Stamp',   'quantity_based',  NULL, 'pcs'),
        ($5, 'Flash Stamp',         'quantity_based',  NULL, 'pcs')
      RETURNING id, name
    `, [cat.flex, cat.cards, cat.digital, cat.offset, cat.stamps]);
    const prod = Object.fromEntries(prods.map(r => [r.name, r.id]));
    log(`${prods.length} products`);

    // ── 4. Pricing rules (area-based) ─────────────────────────
    await client.query(`
      INSERT INTO pricing_rules (product_id, price_per_sqft, min_sqft) VALUES
        ($1, 30.00, 2),
        ($2, 22.00, 2),
        ($3, 45.00, 2),
        ($4, 35.00, 2)
    `, [prod['Star Flex'], prod['China Flex'], prod['One Way Vision'], prod['Backlit Flex']]);

    // ── 5. Quantity tiers ─────────────────────────────────────
    // Business Cards
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,  100,  499,   600),
        ($1,  500,  999,  2500),
        ($1, 1000, NULL,  4500)
    `, [prod['Business Cards']]);
    // Letter Heads
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,  100,  499,   700),
        ($1,  500,  999,  3000),
        ($1, 1000, NULL,  5000)
    `, [prod['Letter Heads']]);
    // Vinyl Stickers
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,   10,   49,   200),
        ($1,   50,   99,   800),
        ($1,  100,  499,  1500),
        ($1,  500, NULL,  7000)
    `, [prod['Vinyl Stickers']]);
    // PVC ID Cards
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,   50,   99,   500),
        ($1,  100,  499,   900),
        ($1,  500, NULL,  4000)
    `, [prod['PVC ID Cards']]);
    // Flyers
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,  500,  999,  1200),
        ($1, 1000, 4999,  2000),
        ($1, 5000, NULL,  8000)
    `, [prod['Flyers (A5)']]);
    // Brochures
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1,  100,  499,  2000),
        ($1,  500,  999,  8000),
        ($1, 1000, NULL, 14000)
    `, [prod['Brochures']]);
    log('Pricing rules & quantity tiers set');

    // ── 6. Customers ──────────────────────────────────────────
    console.log('\n[Seed] Customers…');
    const { rows: custs } = await client.query(`
      INSERT INTO customers (name, phone, address) VALUES
        ('Ali Raza',          '03001234567', 'Main Boulevard, Lahore'),
        ('Ahmed Khan',        '03111234567', 'Gulberg III, Lahore'),
        ('Usman Traders',     '03221234567', 'Hall Road, Lahore'),
        ('Sara Enterprises',  '03331234567', 'Model Town, Lahore'),
        ('City Mart',         '03441234567', 'Liberty Market, Lahore'),
        ('Hassan Printers',   '03551234567', 'Anarkali, Lahore'),
        ('Naveed & Co',       '03661234567', 'Johar Town, Lahore'),
        ('Pak Builders',      '03771234567', 'DHA Phase 5, Lahore'),
        ('Green Valley',      '03881234567', 'Gulshan-e-Ravi, Lahore'),
        ('Star Events',       '03991234567', 'Bahria Town, Lahore')
      RETURNING id, name
    `);
    const custIds = custs.map(r => r.id);
    log(`${custs.length} customers`);

    // ── 7. Employees ──────────────────────────────────────────
    console.log('\n[Seed] Employees…');
    const { rows: emps } = await client.query(`
      INSERT INTO employees (name, role, salary, phone, join_date, status) VALUES
        ('Kamran Ahmed',  'Operator',    28000, '03012345678', '2023-03-01', 'active'),
        ('Bilal Hassan',  'Designer',    32000, '03123456789', '2022-08-15', 'active'),
        ('Asif Mehmood',  'Delivery',    22000, '03234567890', '2023-11-01', 'active'),
        ('Tariq Hussain', 'Operator',    25000, '03345678901', '2024-01-10', 'active')
      RETURNING id, name, salary
    `);
    const empIds = emps.map(r => r.id);
    log(`${emps.length} employees`);

    // ── 8. Bills — past 6 months ──────────────────────────────
    console.log('\n[Seed] Bills (6 months history)…');

    const billData = [
      // [daysAgo, custIndex, items, status, discount%, extraLabel, extraAmt, paidFraction]
      // ---- Month 6 (oldest) ----
      [175, 0, [{p:'Star Flex',    w:10,h:4,   q:1 }, {p:'Business Cards', q:500}],  'delivered',  0,   null,     0,     1   ],
      [172, 2, [{p:'China Flex',   w:6, h:3,   q:2 }],                               'delivered',  0,   null,     0,     1   ],
      [168, 1, [{p:'Flyers (A5)', q:1000}],                                           'delivered',  10,  null,     0,     1   ],
      [165, 3, [{p:'Star Flex',    w:20,h:4,   q:1 }, {p:'Vinyl Stickers',q:100}],   'delivered',  0,   'Urgent', 500,   1   ],
      [162, 4, [{p:'Backlit Flex', w:8, h:5,   q:1 }],                               'delivered',  0,   null,     0,     1   ],
      [158, 5, [{p:'Business Cards', q:1000}, {p:'Letter Heads', q:500}],             'delivered',  5,   null,     0,     1   ],
      // ---- Month 5 ----
      [145, 6, [{p:'Star Flex',    w:12,h:4,   q:3 }],                               'delivered',  0,   null,     0,     1   ],
      [142, 0, [{p:'PVC ID Cards', q:100}, {p:'Vinyl Stickers', q:50}],              'delivered',  0,   null,     0,     1   ],
      [138, 7, [{p:'One Way Vision',w:6,h:4,   q:1 }],                               'delivered',  0,   'Design', 300,   1   ],
      [135, 1, [{p:'Brochures',    q:500}],                                           'delivered',  0,   null,     0,     1   ],
      [130, 8, [{p:'Star Flex',    w:8, h:3,   q:2 }, {p:'Flash Stamp',   q:2}],     'delivered',  0,   null,     0,     1   ],
      [125, 9, [{p:'Flyers (A5)', q:5000}],                                           'delivered',  10,  null,     0,     1   ],
      // ---- Month 4 ----
      [115, 2, [{p:'China Flex',   w:5, h:4,   q:4 }],                               'delivered',  0,   null,     0,     1   ],
      [112, 3, [{p:'Business Cards', q:1000}, {p:'PVC ID Cards', q:50}],             'delivered',  0,   null,     0,     1   ],
      [108, 4, [{p:'Star Flex',    w:15,h:5,   q:1 }],                               'delivered',  0,   'Urgent', 800,   1   ],
      [105, 5, [{p:'Vinyl Stickers', q:500}],                                         'delivered',  0,   null,     0,     1   ],
      [100, 6, [{p:'Backlit Flex', w:4, h:3,   q:2 }, {p:'Self-Inking Stamp', q:3}],'delivered',  5,   null,     0,     1   ],
      [95,  7, [{p:'Brochures',    q:1000}],                                          'delivered',  0,   null,     0,     1   ],
      // ---- Month 3 ----
      [85,  8, [{p:'Star Flex',    w:6, h:4,   q:5 }],                               'delivered',  0,   null,     0,     1   ],
      [82,  9, [{p:'Letter Heads', q:1000}, {p:'Business Cards', q:500}],            'delivered',  0,   null,     0,     1   ],
      [78,  0, [{p:'One Way Vision',w:10,h:4,  q:1 }],                               'delivered',  0,   'Design', 500,   1   ],
      [75,  1, [{p:'China Flex',   w:8, h:3,   q:2 }],                               'delivered',  10,  null,     0,     1   ],
      [70,  2, [{p:'PVC ID Cards', q:500}],                                           'delivered',  0,   null,     0,     1   ],
      [65,  3, [{p:'Star Flex',    w:4, h:3,   q:8 }, {p:'Flash Stamp',   q:1}],     'delivered',  0,   null,     0,     1   ],
      // ---- Month 2 ----
      [55,  4, [{p:'Flyers (A5)', q:2000}],                                           'completed',  0,   null,     0,     1   ],
      [52,  5, [{p:'Star Flex',    w:10,h:6,   q:2 }],                               'completed',  0,   'Urgent', 700,   0.5 ],
      [48,  6, [{p:'Business Cards', q:500}, {p:'Vinyl Stickers', q:100}],           'completed',  5,   null,     0,     1   ],
      [45,  7, [{p:'Backlit Flex', w:6, h:4,   q:3 }],                               'completed',  0,   null,     0,     1   ],
      [40,  8, [{p:'Brochures',    q:500}, {p:'Letter Heads', q:1000}],              'completed',  0,   null,     0,     0.75],
      [35,  9, [{p:'Self-Inking Stamp', q:5}],                                        'completed',  0,   null,     0,     1   ],
      // ---- Last month ----
      [28,  0, [{p:'Star Flex',    w:20,h:5,   q:1 }],                               'completed',  0,   null,     0,     1   ],
      [25,  1, [{p:'China Flex',   w:6, h:3,   q:6 }],                               'in_progress',0,   'Design', 400,   0.5 ],
      [22,  2, [{p:'Business Cards', q:1000}],                                         'in_progress',0,   null,     0,     0.3 ],
      [20,  3, [{p:'Vinyl Stickers', q:200}, {p:'PVC ID Cards', q:100}],             'in_progress',0,   null,     0,     0.4 ],
      [18,  4, [{p:'Star Flex',    w:8, h:4,   q:3 }],                               'pending',    0,   null,     0,     0   ],
      [15,  5, [{p:'Flyers (A5)', q:1000}, {p:'Brochures', q:100}],                  'pending',    0,   null,     0,     0.5 ],
      [12,  6, [{p:'Backlit Flex', w:5, h:3,   q:2 }],                               'pending',    0,   'Urgent', 500,   0   ],
      [10,  7, [{p:'Self-Inking Stamp', q:4}, {p:'Flash Stamp', q:2}],               'pending',    0,   null,     0,     0   ],
      // ---- This week ----
      [6,   8, [{p:'Star Flex',    w:10,h:4,   q:2 }],                               'in_progress',0,   null,     0,     0.5 ],
      [4,   9, [{p:'Business Cards', q:500}, {p:'Letter Heads', q:500}],             'in_progress',0,   null,     0,     0   ],
      [2,   0, [{p:'China Flex',   w:6, h:3,   q:3 }],                               'pending',    0,   null,     0,     0   ],
      [1,   1, [{p:'Vinyl Stickers', q:100}],                                          'pending',    0,   null,     0,     0   ],
      [0,   2, [{p:'Star Flex',    w:4, h:3,   q:5 }],                               'pending',    0,   null,     0,     0   ],
    ];

    // Pricing lookup (area-based rate per sqft, qty-based tier prices)
    const areaRate = {
      'Star Flex': 30, 'China Flex': 22, 'One Way Vision': 45,
      'Backlit Flex': 35,
    };
    // Stamps use quantity_based with tiers

    // Add stamp tiers after inserting products
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1, 1, 4, 350), ($1, 5, NULL, 300)
    `, [prod['Self-Inking Stamp']]);
    await client.query(`
      INSERT INTO quantity_tiers (product_id, min_qty, max_qty, price) VALUES
        ($1, 1, 4, 500), ($1, 5, NULL, 450)
    `, [prod['Flash Stamp']]);

    const qtyPrice = (name, qty) => {
      const tiers = {
        'Business Cards':  [[100,499,600],[500,999,2500],[1000,Infinity,4500]],
        'Letter Heads':    [[100,499,700],[500,999,3000],[1000,Infinity,5000]],
        'Vinyl Stickers':  [[10,49,200],[50,99,800],[100,499,1500],[500,Infinity,7000]],
        'PVC ID Cards':    [[50,99,500],[100,499,900],[500,Infinity,4000]],
        'Flyers (A5)':     [[500,999,1200],[1000,4999,2000],[5000,Infinity,8000]],
        'Brochures':          [[100,499,2000],[500,999,8000],[1000,Infinity,14000]],
        'Self-Inking Stamp':  [[1,4,350],[5,Infinity,300]],
        'Flash Stamp':        [[1,4,500],[5,Infinity,450]],
      };
      const t = (tiers[name] || []).find(([mn, mx]) => qty >= mn && qty <= mx);
      return t ? t[2] : qty * 10;
    };

    let billCount = 0;
    for (const [ago, ci, items, status, discPct, extraLabel, extraAmt, paidFrac] of billData) {
      const custId = custIds[ci % custIds.length];
      const billDate = daysAgo(ago);

      // Calculate items
      let subtotal = 0;
      const itemRows = items.map(it => {
        if (areaRate[it.p]) {
          const sqft = (it.w || 1) * (it.h || 1);
          const itemTotal = sqft * (it.q || 1) * areaRate[it.p];
          subtotal += itemTotal;
          return { product: it.p, model: 'area_based', w: it.w, h: it.h,
                   sqft, qty: it.q || 1, unitPrice: areaRate[it.p], itemTotal };
        } else {
          const itemTotal = qtyPrice(it.p, it.q || 1);
          subtotal += itemTotal;
          const unitPrice = parseFloat((itemTotal / (it.q || 1)).toFixed(2));
          return { product: it.p, model: 'quantity_based', qty: it.q || 1,
                   unitPrice, itemTotal };
        }
      });

      const extra       = extraAmt || 0;
      const discAmt     = parseFloat((subtotal * discPct / 100).toFixed(2));
      const total       = parseFloat((subtotal + extra - discAmt).toFixed(2));
      const advancePaid = parseFloat((total * paidFrac).toFixed(2));
      const remaining   = parseFloat((total - advancePaid).toFixed(2));
      const priority    = extraLabel === 'Urgent' ? 'urgent' : 'normal';

      // Create bill
      const { rows: [bnum] } = await client.query(`SELECT generate_bill_number() AS num`);

      let deliveredAt = null;
      if (status === 'delivered') {
        const d = new Date(billDate);
        d.setDate(d.getDate() + rnd(1, 4));
        deliveredAt = d.toISOString();
      }

      const { rows: [bill] } = await client.query(`
        INSERT INTO bills
          (bill_number, customer_id, status, priority,
           discount_type, discount_value, discount_amount,
           subtotal, extra_charges, total_amount, advance_paid, remaining_balance,
           created_at, updated_at, delivered_at)
        VALUES ($1,$2,$3,$4,
                $5,$6,$7,
                $8,$9,$10,$11,$12,
                $13::date,$13::date,$14)
        RETURNING id
      `, [
        bnum.num, custId, status, priority,
        discPct > 0 ? 'percentage' : 'fixed', discPct, discAmt,
        subtotal, extra, total, advancePaid, remaining,
        billDate, deliveredAt,
      ]);

      // Insert items
      for (let i = 0; i < itemRows.length; i++) {
        const it = itemRows[i];
        const catId = cats.find(c => {
          const p = prods.find(p => p.name === it.product);
          return p && Object.entries(cat).some(([k,v]) => v === p.category_id && c.slug === k);
        })?.id ?? null;
        await client.query(`
          INSERT INTO bill_items
            (bill_id, product_id, category_id, pricing_model,
             width, height, sqft, quantity, unit_price, item_total, sort_order)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        `, [
          bill.id, prod[it.product], catId, it.model,
          it.w ?? null, it.h ?? null, it.sqft ?? null,
          it.qty, it.unitPrice, it.itemTotal, i,
        ]);
      }

      // Extra charge
      if (extraLabel && extraAmt > 0) {
        const label = extraLabel === 'Urgent' ? 'Urgent Charges' : 'Design Fee';
        await client.query(`
          INSERT INTO bill_extra_charges (bill_id, label, amount) VALUES ($1,$2,$3)
        `, [bill.id, label, extraAmt]);
      }

      // Payment
      if (advancePaid > 0) {
        const method = pick(['cash', 'bank_transfer', 'cash', 'cash']); // more cash
        await client.query(`
          INSERT INTO payments (bill_id, customer_id, amount, payment_method, payment_date)
          VALUES ($1,$2,$3,$4,$5::date)
        `, [bill.id, custId, advancePaid, method, billDate]);
      }

      billCount++;
    }
    log(`${billCount} bills created`);

    // ── 9. Attendance — past 3 months ────────────────────────
    console.log('\n[Seed] Attendance (90 days)…');
    let attCount = 0;
    for (let d = 90; d >= 0; d--) {
      const dateStr = daysAgo(d);
      const dow = new Date(dateStr).getDay(); // 0=Sun,5=Fri,6=Sat
      if (dow === 5 || dow === 0) continue; // skip Fri/Sun (off days for a Pak press)

      for (const empId of empIds) {
        // 92% present, 5% absent, 3% leave
        const r = Math.random();
        let status;
        if (r < 0.92) status = 'present';
        else if (r < 0.97) status = 'absent';
        else status = 'leave';

        await client.query(`
          INSERT INTO attendance (employee_id, date, status, notes)
          VALUES ($1, $2::date, $3, NULL)
          ON CONFLICT (employee_id, date) DO NOTHING
        `, [empId, dateStr, status]);
        attCount++;
      }
    }
    log(`${attCount} attendance records`);

    // ── 10. Expenses — past 3 months ─────────────────────────
    console.log('\n[Seed] Expenses…');
    const expenseData = [
      // [daysAgo, title, amount, category, method]
      [2,  'Electricity Bill',       8500,  'utilities',    'bank_transfer'],
      [5,  'Ink & Toner Refill',     3200,  'supplies',     'cash'],
      [8,  'Flex Material (50 rolls)',15000, 'supplies',     'bank_transfer'],
      [12, 'Shop Rent',             25000,  'rent',         'bank_transfer'],
      [15, 'Machine Maintenance',    4500,  'maintenance',  'cash'],
      [20, 'Office Stationery',       800,  'miscellaneous','cash'],
      [25, 'Internet Bill',          1500,  'utilities',    'bank_transfer'],
      [32, 'Ink & Toner Refill',     2800,  'supplies',     'cash'],
      [35, 'Electricity Bill',       9200,  'utilities',    'bank_transfer'],
      [40, 'Flex Material (30 rolls)',9500,  'supplies',     'bank_transfer'],
      [42, 'Shop Rent',             25000,  'rent',         'bank_transfer'],
      [48, 'Machine Oil & Parts',    2200,  'maintenance',  'cash'],
      [55, 'Office Tea & Misc',       600,  'miscellaneous','cash'],
      [60, 'Ink & Toner Refill',     3500,  'supplies',     'cash'],
      [62, 'Electricity Bill',       7800,  'utilities',    'bank_transfer'],
      [68, 'Vinyl Rolls (20 pcs)',   6000,  'supplies',     'bank_transfer'],
      [72, 'Shop Rent',             25000,  'rent',         'bank_transfer'],
      [78, 'Printer Head Cleaning',  1800,  'maintenance',  'cash'],
      [82, 'Staff Refreshments',      900,  'miscellaneous','cash'],
      [88, 'Flex Material (40 rolls)',12000,'supplies',     'bank_transfer'],
    ];

    for (const [ago, title, amount, category, method] of expenseData) {
      await client.query(`
        INSERT INTO expenses (title, amount, category, payment_method, expense_date)
        VALUES ($1,$2,$3,$4,$5::date)
      `, [title, amount, category, method, daysAgo(ago)]);
    }
    log(`${expenseData.length} expenses`);

    // ── 11. Inventory ─────────────────────────────────────────
    console.log('\n[Seed] Inventory…');
    await client.query(`
      INSERT INTO inventory_items
        (name, unit, current_stock, warning_threshold, critical_threshold, is_active) VALUES
        ('Star Flex Roll (6ft)',   'roll',  18, 10,  5,  true),
        ('China Flex Roll (6ft)',  'roll',   8, 10,  5,  true),
        ('Backlit Flex Roll (6ft)','roll',   4, 10,  5,  true),
        ('Vinyl Roll (4ft)',       'roll',  12, 8,   4,  true),
        ('Cyan Ink',               'liter', 3,  5,   2,  true),
        ('Magenta Ink',            'liter', 6,  5,   2,  true),
        ('Yellow Ink',             'liter', 7,  5,   2,  true),
        ('Black Ink',              'liter', 1,  5,   2,  true),
        ('A4 Paper (500 sheets)',  'ream',  40, 20, 10,  true),
        ('Business Card Stock',    'ream',  15, 10,  5,  true),
        ('Lamination Film',        'roll',   5, 8,   3,  true),
        ('Binding Wire',           'kg',     3, 5,   2,  true)
    `);
    log('12 inventory items (some below threshold for stock alerts)');

    // ── 12. Payroll — last 3 months ───────────────────────────
    console.log('\n[Seed] Payroll…');
    const now = new Date();

    for (let mAgo = 3; mAgo >= 1; mAgo--) {
      const d = new Date(now.getFullYear(), now.getMonth() - mAgo, 1);
      const year  = d.getFullYear();
      const month = d.getMonth() + 1;

      // Count weekdays (Mon-Thu, Sat) in that month as working days (no Fridays/Sundays)
      const daysInMonth = new Date(year, month, 0).getDate();
      let workingDays = 0;
      for (let day = 1; day <= daysInMonth; day++) {
        const dow = new Date(year, month - 1, day).getDay();
        if (dow !== 5 && dow !== 0) workingDays++;
      }

      for (const emp of emps) {
        const presentDays = rnd(workingDays - 3, workingDays);
        const absentDays  = workingDays - presentDays;
        const halfDays    = 0;
        const grossSalary = parseFloat(emp.salary);
        const dailyRate   = parseFloat((grossSalary / workingDays).toFixed(4));
        const deduction   = parseFloat((absentDays * dailyRate).toFixed(2));
        const bonus       = mAgo === 1 ? rnd(0, 1) * 1000 : 0; // small bonus last month
        const netSalary   = parseFloat((grossSalary - deduction + bonus).toFixed(2));

        await client.query(`
          INSERT INTO payroll
            (employee_id, year, month, working_days, present_days, absent_days,
             half_days, gross_salary, daily_rate, deduction, bonus, net_salary, status, paid_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'paid', NOW() - ($13 * INTERVAL '1 month'))
          ON CONFLICT (employee_id, year, month) DO NOTHING
        `, [emp.id, year, month, workingDays, presentDays, absentDays,
            halfDays, grossSalary, dailyRate, deduction, bonus, netSalary, mAgo]);
      }
    }
    log('Payroll records for 3 months (all paid)');

    await client.query('COMMIT');

    console.log('\n[Seed] ✅ Demo data seeded successfully!\n');
    console.log('  • 5  categories   (Flex, Cards, Digital, Offset, Stamps)');
    console.log('  • 12 products');
    console.log('  • 10 customers');
    console.log('  • 4  employees    (Kamran, Bilal, Asif, Tariq)');
    console.log(`  • ${billCount} bills       (6 months history)`);
    console.log('  • Attendance for 90 days');
    console.log('  • 20 expenses');
    console.log('  • 12 inventory items (some below threshold)');
    console.log('  • Payroll for 3 months\n');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n[Seed] ❌ Failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
