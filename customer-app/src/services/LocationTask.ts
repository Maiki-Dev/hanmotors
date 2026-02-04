import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const LOCATION_TASK_NAME = 'background-location-task';

let socket: Socket | null = null;

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background location task error:', error);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    const location = locations[0];

    try {
      const customerId = await AsyncStorage.getItem('customer_id');

      if (customerId) {
        if (!socket || !socket.connected) {
           socket = io(API_URL, {
             transports: ['websocket'],
             forceNew: true,
             query: { customerId }
           });
        }

        // Emit location update to server
        // Note: Ensure server handles 'customerLocationUpdated' or similar event
        socket.emit('customerLocationUpdated', {
            customerId,
            location: { 
              lat: location.coords.latitude, 
              lng: location.coords.longitude,
              heading: location.coords.heading || 0
            }
        });
        
        console.log('Background location sent for customer:', customerId);
      }
    } catch (err) {
      console.error('Background task error:', err);
    }
  }
});
