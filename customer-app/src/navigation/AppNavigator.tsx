import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import LoginScreen from '../screens/LoginScreen';
import VerifyOtpScreen from '../screens/VerifyOtpScreen';
import HomeScreen from '../screens/HomeScreen';
import RideRequestScreen from '../screens/RideRequestScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';
import { theme } from '../constants/theme';
import { Home, Clock, User } from 'lucide-react-native';
import { View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import TripStatusScreen from '../screens/TripStatusScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';

// Use dark theme with glassmorphism
const appTheme = theme;

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AuthStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
  </Stack.Navigator>
);

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="RideRequest" component={RideRequestScreen} />
    <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
    <Stack.Screen name="TripStatus" component={TripStatusScreen} />
  </Stack.Navigator>
);

interface TabIconProps {
  icon: any;
  focused: boolean;
  size: number;
  color: string;
}

const TabIcon = ({ icon: Icon, focused, size, color }: TabIconProps) => (
  <View style={{
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: focused ? appTheme.colors.primary : 'transparent',
    width: 50,
    height: 50,
    borderRadius: 25,
    shadowColor: focused ? appTheme.colors.primary : 'transparent',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: focused ? 0.3 : 0,
    shadowRadius: 8,
    elevation: focused ? 4 : 0,
  }}>
    <Icon 
      color={focused ? appTheme.colors.background : color} 
      size={size} 
      strokeWidth={focused ? 2.5 : 2}
    />
  </View>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarShowLabel: false,
      tabBarStyle: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        borderRadius: 30,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        height: 70,
        paddingBottom: 0,
        elevation: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      tabBarBackground: () => (
        <BlurView 
          intensity={80} 
          tint="dark" 
          style={{ 
            ...StyleSheet.absoluteFillObject, 
            borderRadius: 30, 
            overflow: 'hidden',
            backgroundColor: 'rgba(15, 17, 21, 0.85)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)'
          }} 
        />
      ),
      tabBarActiveTintColor: appTheme.colors.primary,
      tabBarInactiveTintColor: appTheme.colors.textSecondary,
    }}
  >
    <Tab.Screen 
      name="HomeTab" 
      component={HomeStack} 
      options={{
        title: 'Home',
        tabBarIcon: ({ focused, color, size }) => <TabIcon icon={Home} focused={focused} color={color} size={size} />,
      }}
    />
    <Tab.Screen 
      name="History" 
      component={RideHistoryScreen} 
      options={{
        tabBarIcon: ({ focused, color, size }) => <TabIcon icon={Clock} focused={focused} color={color} size={size} />,
      }}
    />
    <Tab.Screen 
      name="Profile" 
      component={ProfileScreen} 
      options={{
        tabBarIcon: ({ focused, color, size }) => <TabIcon icon={User} focused={focused} color={color} size={size} />,
      }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthStack />}
    </NavigationContainer>
  );
};

export default AppNavigator;
