// Use relative path for production (Docker/Nginx proxy)
// This allows Nginx to proxy /api requests to the backend container
// regardless of the VPS IP address.
export const API_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';
