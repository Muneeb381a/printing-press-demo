import client from './client.js';

export const getEmployees  = ()       => client.get('/employees');
export const getEmployee   = (id)     => client.get(`/employees/${id}`);
export const createEmployee = (data)  => client.post('/employees', data);
export const updateEmployee = (id, d) => client.put(`/employees/${id}`, d);
export const deleteEmployee = (id)    => client.delete(`/employees/${id}`);
