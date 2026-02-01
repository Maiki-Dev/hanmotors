import axios from 'axios';
import io from 'socket.io-client';
import { API_URL } from '../config';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const socket = io(API_URL);

export default api;
