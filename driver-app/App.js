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

const TabIcon = ({ icon: Icon, focused, size }) => (
  <View style={{
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: focused ? theme.colors.primary : 'transparent',
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: focused ? theme.colors.primary : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: focused ? 0.3 : 0,
    shadowRadius: 8,
    elevation: focused ? 4 : 0,
  }}>
    <Icon 
      color={focused ? theme.colors.background : theme.colors.textSecondary} 
      size={size} 
      strokeWidth={focused ? 2.5 : 2}
    />
  </View>
);

function MainTabs({ route }) {
  const { driverId, driverName } = route.params || {};

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 25,
          left: 20,
          right: 20,
          height: 70,
          borderRadius: 35,
          backgroundColor: theme.colors.glass || 'rgba(28, 25, 23, 0.9)',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: theme.colors.glassBorder || 'rgba(255, 255, 255, 0.1)',
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 5,
          },
          shadowOpacity: 0.3,
          shadowRadius: 10,
          paddingBottom: 0,
        },
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        initialParams={{ driverId, driverName }}
        options={{
          tabBarIcon: ({ focused, size }) => <TabIcon icon={Home} focused={focused} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        initialParams={{ driverId }}
        options={{
          tabBarIcon: ({ focused, size }) => <TabIcon icon={DollarSign} focused={focused} size={size} />,
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        initialParams={{ driverId, driverName }}
        options={{
          tabBarIcon: ({ focused, size }) => <TabIcon icon={User} focused={focused} size={size} />,
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
