import api from './api';

export const driverService = {
    getAllDrivers: async () => {
        const response = await api.get('/admin/drivers');
        return response.data;
    },
    updateDriver: async (id, data) => {
        const response = await api.put(`/admin/driver/${id}`, data);
        return response.data;
    },
    deleteDriver: async (id) => {
        const response = await api.delete(`/admin/driver/${id}`);
        return response.data;
    },
    createDriver: async (data) => {
        const response = await api.post('/driver/register', data);
        return response.data;
    },
    // Keep this if needed for specific status toggle, or just use updateDriver
    updateStatus: async (id, status) => {
        const response = await api.put(`/admin/driver/${id}`, { status });
        return response.data;
    }
};
