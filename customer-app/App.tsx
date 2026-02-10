import React from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import './src/services/LocationTask'; // Register background task
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NotificationManager from './src/components/NotificationManager';
import { LogBox } from 'react-native';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Failed to initialize reCAPTCHA Enterprise config',
  'expo-notifications: Android Push notifications',
  'Calling getPermissionsAsync() on Android is deprecated'
]);

export default function App() {
  // Main App Entry
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NotificationManager />
        <StatusBar style="light" />
        <AppNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
