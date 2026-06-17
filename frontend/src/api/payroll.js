import client from './client.js';

export const getByMonth         = (year, month)    => client.get('/payroll', { params: { year, month } });
export const calculate          = (year, month)    => client.post('/payroll/calculate', { year, month });
export const updateRecord       = (id, data)       => client.put(`/payroll/${id}`, data);
export const markPaid           = (id)             => client.put(`/payroll/${id}/pay`);
export const getById            = (id)             => client.get(`/payroll/${id}`);
export const getEmployeeHistory = (employeeId)     => client.get(`/payroll/employee/${employeeId}`);
