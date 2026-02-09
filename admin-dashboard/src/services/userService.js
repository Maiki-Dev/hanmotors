import api from './api';

export const userService = {
    getAllUsers: async () => {
        const response = await api.get('/admin/customers');
        return response.data;
    },
    updateUser: async (id, data) => {
        const response = await api.put(`/admin/customers/${id}`, data);
        return response.data;
    },
    deleteUser: async (id) => {
        const response = await api.delete(`/admin/customers/${id}`);
        return response.data;
    }
};
