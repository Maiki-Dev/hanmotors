import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Home, DollarSign, User, HelpCircle } from 'lucide-react-native';
import { theme } from './src/constants/theme';
import { API_URL } from './src/config';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import EarningsScreen from './src/screens/EarningsScreen';
import ActiveJobScreen from './src/screens/ActiveJobScreen';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';
import VehicleSettingsScreen from './src/screens/VehicleSettingsScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import SupportScreen from './src/screens/SupportScreen';
import JobHistoryScreen from './src/screens/JobHistoryScreen';
import NotificationSettingsScreen from './src/screens/NotificationSettingsScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import WalletScreen from './src/screens/WalletScreen';

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Header } from './src/components/Header';
import { PremiumCard } from './src/components/PremiumCard';
import { ChevronRight } from 'lucide-react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();





function MainTabs({ route }) {
  const { driverId, driverName } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        initialParams={{ driverId, driverName }}
        options={{
          tabBarLabel: 'Нүүр',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        initialParams={{ driverId }}
        options={{
          tabBarLabel: 'Орлого',
          tabBarIcon: ({ color, size }) => <DollarSign color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        initialParams={{ driverId, driverName }}
        options={{
          tabBarLabel: 'Профайл',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="ActiveJob" component={ActiveJobScreen} />
        
        {/* Settings Screens */}
        <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
        <Stack.Screen name="VehicleSettings" component={VehicleSettingsScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="JobHistory" component={JobHistoryScreen} />
        <Stack.Screen name="Wallet" component={WalletScreen} />
        <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
