import client from './client.js';

export const getSettings      = ()     => client.get('/settings');
export const updateSettings   = (data) => client.put('/settings', data);
export const updateLocation   = (data) => client.put('/settings/location', data);
