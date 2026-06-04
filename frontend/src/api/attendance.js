import client from './client.js';

export const getByDate   = (date)         => client.get('/api/attendance', { params: { date } });
export const getMonthly  = (year, month)  => client.get('/api/attendance/monthly', { params: { year, month } });
export const markOne     = (data)         => client.post('/api/attendance/mark', data);
export const markBulk    = (records)      => client.post('/api/attendance/bulk', { records });
