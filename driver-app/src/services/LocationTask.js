import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const LOCATION_TASK_NAME = 'background-location-task';

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
        const driverInfo = driverInfoStr ? JSON.parse(driverInfoStr) : {};
        const services = servicesStr ? JSON.parse(servicesStr) : {};
        const vehicle = driverInfo.vehicle || {};

        // Calculate heading if missing
        const heading = location.coords.heading || 0;

        const payload = {
            lat: location.coords.latitude, 
            lng: location.coords.longitude,
            heading: heading,
            plateNumber: vehicle.plateNumber,
            vehicleModel: vehicle.model,
            vehicleColor: vehicle.color,
            isTowing: services.towing
        };

        // Use HTTP Fetch for reliable background updates
        // This avoids maintaining a flaky socket connection in the background task
        await fetch(`${API_URL}/api/driver/${driverId}/location`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ location: payload })
        });
        
        // console.log('Background location sent via HTTP for', driverId);
      }
    } catch (err) {
      console.error('Background task error:', err);
    }
  }
});
