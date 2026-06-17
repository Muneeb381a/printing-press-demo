import pool from '../../config/db.js';

export const getSettings = () =>
  pool.query(
    `SELECT shop_name, tagline, cta_text, cta_route, whatsapp_phone,
            shop_lat, shop_lng, attendance_radius_m, updated_at
     FROM shop_settings WHERE id = 1`
  );

export const upsertSettings = ({ shopName, tagline, ctaText, ctaRoute, whatsappPhone }) =>
  pool.query(
    `INSERT INTO shop_settings (id, shop_name, tagline, cta_text, cta_route, whatsapp_phone, updated_at)
     VALUES (1, $1, $2, $3, $4, $5, NOW())
     ON CONFLICT (id) DO UPDATE SET
       shop_name      = EXCLUDED.shop_name,
       tagline        = EXCLUDED.tagline,
       cta_text       = EXCLUDED.cta_text,
       cta_route      = EXCLUDED.cta_route,
       whatsapp_phone = EXCLUDED.whatsapp_phone,
       updated_at     = NOW()
     RETURNING *`,
    [shopName, tagline ?? null, ctaText, ctaRoute, whatsappPhone ?? null]
  );

export const upsertLocation = ({ shopLat, shopLng, attendanceRadiusM }) =>
  pool.query(
    `UPDATE shop_settings
     SET shop_lat            = $1,
         shop_lng            = $2,
         attendance_radius_m = $3,
         updated_at          = NOW()
     WHERE id = 1
     RETURNING shop_lat, shop_lng, attendance_radius_m`,
    [shopLat ?? null, shopLng ?? null, attendanceRadiusM ?? 100]
  );
