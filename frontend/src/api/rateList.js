import client from './client.js';

export const getCategories    = ()             => client.get('/rate-list/categories');
export const getAllItems       = ()             => client.get('/rate-list/items');
export const getItemsByCategory = (catId)      => client.get(`/rate-list/categories/${catId}/items`);

export const createCategory   = (name)         => client.post('/rate-list/categories', { name });
export const updateCategory   = (id, name)     => client.put(`/rate-list/categories/${id}`, { name });
export const deleteCategory   = (id)           => client.delete(`/rate-list/categories/${id}`);

export const createItem       = (catId, data)  => client.post(`/rate-list/categories/${catId}/items`, data);
export const updateItem       = (catId, itemId, data) => client.put(`/rate-list/categories/${catId}/items/${itemId}`, data);
export const deleteItem       = (catId, itemId) => client.delete(`/rate-list/categories/${catId}/items/${itemId}`);
