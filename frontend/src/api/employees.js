import client from './client.js';

export const getEmployees  = ()       => client.get('/api/employees');
export const getEmployee   = (id)     => client.get(`/api/employees/${id}`);
export const createEmployee = (data)  => client.post('/api/employees', data);
export const updateEmployee = (id, d) => client.put(`/api/employees/${id}`, d);
export const deleteEmployee = (id)    => client.delete(`/api/employees/${id}`);
