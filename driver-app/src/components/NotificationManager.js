import React, { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
// import { LogLevel, OneSignal } from 'react-native-onesignal'; 
import { io } from 'socket.io-client';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants'; // Import Constants
import { API_URL } from '../config';

// Temporary Fix for Expo Go:
// If we import OneSignal at top level, it crashes immediately because native module is missing.
// We need to require it conditionally or mock it.

let OneSignal;
let LogLevel;

try {
  if (Constants.executionEnvironment !== 'storeClient') {
     const OneSignalPackage = require('react-native-onesignal');
     OneSignal = OneSignalPackage.OneSignal;
     LogLevel = OneSignalPackage.LogLevel;
  }
} catch (e) {
  console.log('OneSignal import failed (likely in Expo Go)', e);
}


// Configure local notifications (kept for Socket events)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const NotificationManager = ({ driverId }) => {
  const socketRef = useRef(null);
  const navigation = useNavigation();

  useEffect(() => {
    if (!driverId) return;

    // Check if running in Expo Go
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    
    if (isExpoGo || !OneSignal) {
        console.log('Running in Expo Go - OneSignal disabled');
        return;
    }

    // --- OneSignal Initialization ---
    
    // App ID from user
    OneSignal.initialize("3b1bace3-c9a5-4ce5-9046-ad6606bdfd1b");
    
    // Optional: Enable debug logs
    OneSignal.Debug.setLogLevel(LogLevel.VERBOSE);

    // Request Permission
    OneSignal.Notifications.requestPermission(true);

    // Listener for subscription changes (getting the Player ID)
    const handleSubscriptionChange = (event) => {
      console.log("OneSignal Subscription changed:", event);
      if (event.current.id) {
        sendTokenToBackend(event.current.id);
      }
    };

    OneSignal.User.pushSubscription.addEventListener('change', handleSubscriptionChange);

    // Initial check
    const currentId = OneSignal.User.pushSubscription.getPushSubscriptionId();
    if (currentId) {
      console.log("OneSignal ID:", currentId);
      sendTokenToBackend(currentId);
    }
    
    // Handle Notification Click
    const handleNotificationClick = (event) => {
      console.log("OneSignal Notification Clicked:", event);
      const data = event.notification.additionalData;
      if (data && data.tripId) {
        // Navigate to Home with incoming trip param
        navigation.navigate('Main', { 
          screen: 'HomeTab', 
          params: { incomingTripId: data.tripId } 
        });
      }
    };

    OneSignal.Notifications.addEventListener('click', handleNotificationClick);
    
    // Login user in OneSignal (Optional, but good for tracking)
    OneSignal.login(driverId);

    return () => {
      // Cleanup
      // Note: OneSignal listeners might not have a simple remove in some versions, 
      // but usually we can ignore or use removeEventListener if available.
       OneSignal.Notifications.removeEventListener('click', handleNotificationClick);
    };
  }, [driverId]);

  const sendTokenToBackend = async (token) => {
    try {
      // We send 'token' but it's actually OneSignal Player ID now.
      // Backend should be updated to handle this as 'oneSignalId' or similar.
      await fetch(`${API_URL}/api/driver/push-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId, token, type: 'onesignal' }),
      });
      console.log('OneSignal ID sent to backend');
    } catch (error) {
      console.log('Error sending OneSignal ID:', error);
    }
  };

  useEffect(() => {
    if (!driverId) return;

    // Connect Socket (Keep this for In-App Real-time alerts)
    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      autoConnect: true,
    });

    const socket = socketRef.current;
    
    const joinRoom = () => {
        if (driverId) {
             socket.emit('driverJoin', driverId);
        }
    };
    
    socket.on('connect', joinRoom);
    if (socket.connected) joinRoom();

    // Listeners
    socket.on('newJobRequest', async (tripData) => {
      // Local Notification for immediate alert
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Шинэ дуудлага!",
          body: `${tripData.pickupLocation?.address || 'Хаяг тодорхойгүй'} -> ${tripData.dropoffLocation?.address || 'Хаяг тодорхойгүй'}`,
          data: { tripId: tripData._id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Immediate
      });
    });

    socketRef.current.on('jobCancelled', async (data) => {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Аялал цуцлагдлаа",
          body: "Захиалагч аяллаа цуцаллаа.",
          sound: true,
        },
        trigger: null,
      });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [driverId]);

  return null;
};

export default NotificationManager;
