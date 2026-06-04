export const demoGuard = (_req, res, next) => {
  const exp = process.env.DEMO_EXPIRES_AT;
  if (exp && new Date() > new Date(exp)) {
    return res.status(403).json({ code: 'demo_expired', message: 'Demo period has ended.' });
  }
  next();
};
