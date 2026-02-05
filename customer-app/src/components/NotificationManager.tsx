import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { initSocket, disconnectSocket, socket } from '../services/socket';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
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

const NotificationManager = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    if (user?._id) {
        registerForPushNotificationsAsync(user._id);
    }

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // Handle notification received while app is foreground
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // Handle user tap on notification
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  useEffect(() => {
    if (user?._id) {
      const socketInstance = initSocket(user._id);

      // Join room manually just in case init didn't catch it (though init sends query)
      socketInstance.emit('customerJoin', user._id);

      const scheduleNotification = async (title: string, body: string) => {
        await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null, // Immediate
        });
      };

      socketInstance.on('driverAccepted', (data: any) => {
        scheduleNotification(
            'Жолооч хүлээн авлаа', 
            `Жолооч ${data.driver?.name || ''} тань руу ирж байна!`
        );
      });

      socketInstance.on('tripStarted', (data: any) => {
        scheduleNotification(
            'Аялал эхэллээ', 
            'Таны аялал эхэллээ. Тав тухтай үйлчлүүлээрэй!'
        );
      });

      socketInstance.on('tripCompleted', (data: any) => {
        scheduleNotification(
            'Аялал дууслаа', 
            'Та зорьсон газартаа ирлээ.'
        );
      });

      socketInstance.on('jobCancelled', (data: any) => {
        scheduleNotification(
            'Аялал цуцлагдлаа', 
            'Таны аялал цуцлагдлаа.'
        );
      });

      return () => {
        socketInstance.off('driverAccepted');
        socketInstance.off('tripStarted');
        socketInstance.off('tripCompleted');
        socketInstance.off('jobCancelled');
        // Do not disconnect socket here as it might be used by other screens
        // disconnectSocket(); 
      };
    } else {
        // If logged out, maybe disconnect?
        // disconnectSocket();
    }
  }, [user]);

  return null; // Invisible component
};

async function registerForPushNotificationsAsync(userId: string) {
  let token;

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
    console.log('Failed to get push token for push notification!');
    return;
  }
  
  try {
      // Using specific projectId if known, or let it infer from app config
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '82d34329-fe87-437d-a5ac-744a6b1fd487' 
      });
      token = tokenData.data;
      console.log('Expo Push Token:', token);

      if (token && userId) {
        await fetch(`${API_URL}/api/customer/push-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                customerId: userId,
                token: token,
            }),
        });
      }
  } catch (error) {
      console.error('Error getting push token:', error);
  }

  return token;
}

export default NotificationManager;
