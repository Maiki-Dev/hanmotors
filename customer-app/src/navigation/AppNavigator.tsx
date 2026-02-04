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
import { theme } from '../constants/theme';
import { Home, Clock, User } from 'lucide-react-native';

import TripStatusScreen from '../screens/TripStatusScreen';
import ProfileScreen from '../screens/ProfileScreen';
import RideHistoryScreen from '../screens/RideHistoryScreen';

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
    <Stack.Screen name="TripStatus" component={TripStatusScreen} />
  </Stack.Navigator>
);

import { View } from 'react-native';

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
      color={focused ? theme.colors.background : color} 
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
        bottom: 25,
        left: 20,
        right: 20,
        height: 70,
        borderRadius: 35,
        backgroundColor: theme.colors.surface, // Using surface as glass fallback
        borderTopWidth: 0,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
      tabBarActiveTintColor: theme.colors.primary,
      tabBarInactiveTintColor: theme.colors.textSecondary,
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
