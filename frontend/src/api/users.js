import client from './client.js';

export const getUsers = () =>
  client.get('/users');

export const createUser = (data) =>
  client.post('/users', data);

export const updateUser = (id, data) =>
  client.put(`/users/${id}`, data);

export const resetPassword = (id, newPassword) =>
  client.put(`/users/${id}/password`, { newPassword });

export const deactivateUser = (id) =>
  client.delete(`/users/${id}`);
