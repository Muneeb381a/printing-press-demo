// PostgreSQL error codes → safe user-facing messages (never expose raw PG errors)
const PG_MESSAGES = {
  '23505': { status: 409, message: 'A record with this value already exists.' },
  '23503': { status: 409, message: 'This record is linked to other data and cannot be deleted.' },
  '23502': { status: 400, message: 'A required field is missing.' },
  '22001': { status: 400, message: 'A value exceeds the maximum allowed length.' },
  '22P02': { status: 400, message: 'Invalid input format.' },
};

/**
 * Central error handler — last middleware in the chain.
 * Never leaks stack traces or raw DB errors to the client.
 */
export const errorHandler = (err, _req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  console.error(`[Error] ${status} — ${err.message}`, err.stack ?? '');

  // PostgreSQL errors → friendly message
  if (err.code && PG_MESSAGES[err.code]) {
    const pg = PG_MESSAGES[err.code];
    return res.status(pg.status).json({ error: pg.message });
  }

  // 4xx → our own operational message; 5xx → generic (never leak internals)
  const message = status < 500
    ? (err.message || 'Bad request')
    : 'An unexpected error occurred. Please try again.';

  res.status(status).json({ error: message });
};

/**
 * Async wrapper — eliminates try/catch boilerplate in every controller.
 * Usage: router.get('/path', asyncWrap(controller.getAll))
 */
export const asyncWrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * Create a structured operational error with an HTTP status.
 */
export const createError = (status, message) => {
  const err    = new Error(message);
  err.status   = status;
  return err;
};
