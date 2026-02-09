import React, { useEffect, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LogLevel, OneSignal } from 'react-native-onesignal'; 
import { io } from 'socket.io-client';
import { API_URL } from '../config';

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

  useEffect(() => {
    if (!driverId) return;

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
    

    
    // Login user in OneSignal (Optional, but good for tracking)
    OneSignal.login(driverId);

    return () => {
      // Cleanup
      // Note: OneSignal listeners might not have a simple remove in some versions, 
      // but usually we can ignore or use removeEventListener if available.
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

    socketRef.current.emit('driverJoin', driverId);

    // Listeners
    socketRef.current.on('newJobRequest', async (tripData) => {
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
