// Use domain for both production and local development
// This allows local development to connect to the live VPS backend
export const API_URL = import.meta.env.PROD ? '' : 'https://khanmotors.cloud';
