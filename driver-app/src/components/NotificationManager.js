import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

// Configure notifications
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

    // Register for push notifications
    const registerForPushNotifications = async () => {
      try {
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync({
            ios: {
              allowAlert: true,
              allowBadge: true,
              allowSound: true,
            },
          });
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.log('Push notification permission denied');
          return;
        }

        // Get Expo Push Token
        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '82d34329-fe87-437d-a5ac-744a6b1fd487'
        });
        const token = tokenData.data;
        console.log('Expo Push Token:', token);

        // Send token to backend
        await fetch(`${API_URL}/api/driver/push-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ driverId, token }),
        });
      } catch (error) {
        console.log('Warning: Push Notifications not configured (missing google-services.json):', error.message);
      }
    };

    registerForPushNotifications();

    // Connect Socket
    socketRef.current = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      autoConnect: true,
    });

    socketRef.current.emit('driverJoin', driverId);

    // Listeners
    socketRef.current.on('newJobRequest', async (tripData) => {
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
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null,
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [driverId]);

  return null; // Invisible component
};

export default NotificationManager;
