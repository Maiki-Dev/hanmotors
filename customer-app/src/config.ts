const PROD_URL = 'https://khanmotors.cloud';
const DEV_URL = 'http://172.20.10.3:5000';

// __DEV__ is true when running locally in development mode
export const API_URL = __DEV__ ? DEV_URL : PROD_URL;
export const GOOGLE_MAPS_APIKEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_APIKEY || '';
