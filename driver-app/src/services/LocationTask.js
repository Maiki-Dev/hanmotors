import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

export const LOCATION_TASK_NAME = 'background-location-task';

let socket = null;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }
  
  if (data) {
    const { locations } = data;
    if (!locations || locations.length === 0) return;

    const location = locations[0]; // Get the most recent location
    
    try {
      // Check if driver is "online" from storage
      const isOnlineStr = await AsyncStorage.getItem('driver_is_online');
      const driverId = await AsyncStorage.getItem('driver_id');
      const driverInfoStr = await AsyncStorage.getItem('driver_info');
      const servicesStr = await AsyncStorage.getItem('driver_services');

      if (isOnlineStr === 'true' && driverId) {
        // Initialize socket if needed
        if (!socket || !socket.connected) {
           socket = io(API_URL, {
             transports: ['websocket'],
             forceNew: true,
             reconnection: true,
             reconnectionAttempts: 5,
           });
           
           // Ensure we join properly upon connection
           socket.on('connect', () => {
               // console.log('Background socket connected');
               socket.emit('driverJoin', driverId);
               socket.emit('driverStatusUpdate', { driverId, isOnline: true });
           });
        }
        
        // If socket is already connected but we haven't joined (rare case if task persists), 
        // we can re-emit join just in case, or trust the connect handler.
        // Better: Always ensure we are joined/online with every heartbeat if possible, 
        // but excessive emits are bad. 
        // Let's just emit location, which implicitly marks online in backend memory.
        
        // However, to fix the "disappearing" issue caused by foreground disconnect:
        // We should explicitly send status update occasionally or rely on location update.
        // The backend code: driverLocationUpdated -> sets driverStatus[id] = true. 
        // So location update is enough.

        const driverInfo = driverInfoStr ? JSON.parse(driverInfoStr) : {};
        const services = servicesStr ? JSON.parse(servicesStr) : {};
        const vehicle = driverInfo.vehicle || {};

        // Calculate heading if missing (simple logic or just use what we have)
        const heading = location.coords.heading || 0;

        socket.emit('driverLocationUpdated', {
            driverId,
            location: { 
              lat: location.coords.latitude, 
              lng: location.coords.longitude,
              heading: heading,
              plateNumber: vehicle.plateNumber,
              vehicleModel: vehicle.model,
              vehicleColor: vehicle.color,
              isTowing: services.towing
            }
        });
        
        // console.log('Background location emitted for', driverId);
      }
    } catch (err) {
      console.error('Background task error:', err);
    }
  }
});
