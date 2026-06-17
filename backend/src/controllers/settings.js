import * as Q from '../db/queries/settings.js';
import { createError } from '../middleware/errorHandler.js';

export const getSettings = async (_req, res) => {
  const { rows } = await Q.getSettings();
  res.json({ data: rows[0] ?? { shop_name: 'My Print Shop', tagline: '', cta_text: 'New Bill', cta_route: '/bills/new', whatsapp_phone: null, shop_lat: null, shop_lng: null, attendance_radius_m: 100 } });
};

export const updateSettings = async (req, res, next) => {
  const { shopName, tagline, ctaText, ctaRoute, whatsappPhone } = req.body;
  if (!shopName?.trim()) return next(createError(400, 'shopName is required'));

  const { rows } = await Q.upsertSettings({
    shopName:      shopName.trim(),
    tagline:       tagline?.trim() ?? null,
    ctaText:       ctaText?.trim() || 'New Bill',
    ctaRoute:      ctaRoute?.trim() || '/bills/new',
    whatsappPhone: whatsappPhone?.trim() || null,
  });
  res.json({ data: rows[0] });
};

export const updateLocation = async (req, res, next) => {
  const { shopLat, shopLng, attendanceRadiusM } = req.body;
  const lat = shopLat != null ? parseFloat(shopLat) : null;
  const lng = shopLng != null ? parseFloat(shopLng) : null;
  const radius = attendanceRadiusM != null ? parseInt(attendanceRadiusM, 10) : 100;

  if ((lat != null && isNaN(lat)) || (lng != null && isNaN(lng))) {
    return next(createError(400, 'Invalid lat/lng values'));
  }
  if (isNaN(radius) || radius < 10 || radius > 5000) {
    return next(createError(400, 'attendanceRadiusM must be between 10 and 5000 meters'));
  }

  const { rows } = await Q.upsertLocation({ shopLat: lat, shopLng: lng, attendanceRadiusM: radius });
  res.json({ data: rows[0] });
};
