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

    // Register for push notifications (Android channel)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

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
