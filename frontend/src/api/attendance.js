import client from './client.js';

export const getByDate   = (date)         => client.get('/attendance', { params: { date } });
export const getMonthly  = (year, month)  => client.get('/attendance/monthly', { params: { year, month } });
export const markOne     = (data)         => client.post('/attendance/mark', data);
export const markBulk    = (records)      => client.post('/attendance/bulk', { records });
export const markSelf    = (lat, lng)     => client.post('/attendance/mark-self', { lat, lng });
