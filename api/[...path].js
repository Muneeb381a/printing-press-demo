import '../backend/src/config/loadEnv.js';
import app from '../backend/src/app.js';

export default function handler(req, res) {
  // Vercel strips the /api prefix before passing to the handler.
  // Express routes expect /api/... so restore it.
  if (!req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
