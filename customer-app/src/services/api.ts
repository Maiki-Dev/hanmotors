import axios from 'axios';
import { API_URL } from '../config';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  login: (phone: string) => api.post('/auth/login', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/auth/verify-otp', { phone, otp }),
};

export const customerService = {
  getProfile: (id: string) => api.get('/customer/profile', { params: { id } }),
};

export const rideService = {
  requestRide: (data: {
    customerId: string;
    pickup: { address: string; lat: number; lng: number };
    dropoff: { address: string; lat: number; lng: number };
    vehicleType: string;
    serviceType?: string;
    distance: number;
  }) => api.post('/rides/request', data),
  
  getHistory: (customerId: string) => api.get('/rides/history', { params: { customerId } }),
  
  getActiveTrip: (customerId: string) => api.get('/rides/active', { params: { customerId } }),

  cancelTrip: (tripId: string) => api.post(`/trip/${tripId}/cancel`),

  getPricingRules: () => api.get('/admin/pricing'),

  calculatePrice: (distance: number, vehicleType: string) => 
    api.post('/pricing/calculate', { distance, vehicleType }),
};

export default api;
