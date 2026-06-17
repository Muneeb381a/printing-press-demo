import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto';

export const hashPassword = (password) => {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
};

export const comparePassword = (password, stored) => {
  if (!password || !stored) return false;
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = pbkdf2Sync(password, salt, 100_000, 64, 'sha512').toString('hex');
  if (test.length !== hash.length) return false;
  return timingSafeEqual(Buffer.from(test, 'hex'), Buffer.from(hash, 'hex'));
};
