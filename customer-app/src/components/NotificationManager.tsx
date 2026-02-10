import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { initSocket, disconnectSocket, socket } from '../services/socket';
import * as Notifications from 'expo-notifications';
import { Alert, Platform } from 'react-native';
import { API_URL } from '../config';
import Constants from 'expo-constants';
import { ONESIGNAL_APP_ID } from '@env';

// Safe import for OneSignal to avoid crashing in Expo Go
let OneSignal: any;
let LogLevel: any;

try {
  if (Constants.executionEnvironment !== 'storeClient') {
    const OneSignalPackage = require('react-native-onesignal');
    OneSignal = OneSignalPackage.OneSignal;
    LogLevel = OneSignalPackage.LogLevel;
  }
} catch (e) {
  console.log('OneSignal import failed (likely in Expo Go)', e);
}

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
    // 1. Existing Expo Notification Listeners (Foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
    };
  }, []);

  useEffect(() => {
    if (user?._id) {
      // 2. Initialize OneSignal (Only in Native/Dev Build)
      if (OneSignal && Constants.executionEnvironment !== 'storeClient') {
        try {
          // Initialize
          OneSignal.initialize(ONESIGNAL_APP_ID || "3b1bace3-c9a5-4ce5-9046-ad6606bdfd1b"); // Fallback if env missing
          
          // Request Permission
          OneSignal.Notifications.requestPermission(true);

          // Login User
          OneSignal.login(user._id);

          // Handle Subscription Change (Get Player ID)
          OneSignal.User.pushSubscription.addEventListener('change', (event: any) => {
            console.log("OneSignal Subscription changed:", event);
            if (event.current.id) {
              sendOneSignalTokenToBackend(user._id, event.current.id);
            }
          });

          // Check initial ID
          const currentId = OneSignal.User.pushSubscription.getPushSubscriptionId();
          if (currentId) {
             sendOneSignalTokenToBackend(user._id, currentId);
          }

        } catch (e) {
          console.log("Error initializing OneSignal:", e);
        }
      } else {
         console.log("Skipping OneSignal init (Expo Go or missing module)");
         // Fallback to Expo Push Token if OneSignal is not available
         registerForPushNotificationsAsync(user._id);
      }

      // 3. Socket.io Logic
      const socketInstance = initSocket(user._id);
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
            `Таны аялал эхэллээ. Тав тухтай үйлчлүүлээрэй!`
        );
      });

      socketInstance.on('tripCompleted', (data: any) => {
        scheduleNotification(
            'Аялал дууслаа', 
            `Та зорьсон газартаа ирлээ.`
        );
      });

      socketInstance.on('jobCancelled', (data: any) => {
        scheduleNotification(
            'Аялал цуцлагдлаа', 
            `Таны аялал цуцлагдлаа.`
        );
      });

      return () => {
        socketInstance.off('driverAccepted');
        socketInstance.off('tripStarted');
        socketInstance.off('tripCompleted');
        socketInstance.off('jobCancelled');
      };
    }
  }, [user]);

  return null;
};

// Helper to send OneSignal ID to backend
async function sendOneSignalTokenToBackend(userId: string, token: string) {
    try {
        console.log("Sending OneSignal ID to backend:", token);
        // Assuming we use the same endpoint or a new one. 
        // If the backend expects 'token', we can send it.
        // Or better, send it as 'oneSignalId' if backend supports it.
        // For now, reusing the existing endpoint structure but logging it.
        await fetch(`${API_URL}/api/customer/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                customerId: userId,
                token: token, // Sending OneSignal ID as token
                provider: 'onesignal' // Optional flag if backend handles it
            }),
        });
    } catch (error) {
        console.log('Error sending OneSignal token:', error);
    }
}

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
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    return;
  }
  
  try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '82d34329-fe87-437d-a5ac-744a6b1fd487' 
      });
      token = tokenData.data;
      if (token && userId) {
        await fetch(`${API_URL}/api/customer/push-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: userId, token: token }),
        });
      }
  } catch (error) {
      console.log('Warning: Push Notifications not configured:', error);
  }
  return token;
}

export default NotificationManager;
