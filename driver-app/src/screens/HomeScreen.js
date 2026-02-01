import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { IncomingJobModal } from '../components/IncomingJobModal';
import { API_URL } from '../config';

// Configure notifications to show even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import { theme } from '../constants/theme';
import { PremiumCard } from '../components/PremiumCard';
import { MapPin, Navigation as NavIcon } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }) {
  const { driverId } = route.params || {}; 
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState({
    latitude: 47.9188,
    longitude: 106.9176,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [incomingRequest, setIncomingRequest] = useState(null);
  const socketRef = useRef(null);
  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  useEffect(() => {
    (async () => {
      // Request Location Permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      // Request Notification Permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Alert.alert('Failed to get push token for push notification!');
      }

      // Android Channel
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Initial location
      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation({
        ...location,
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

      // Watch location
      await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLocation) => {
          const { latitude, longitude } = newLocation.coords;
          setLocation(prev => ({
            ...prev,
            latitude,
            longitude,
          }));

          if (isOnline && socketRef.current && driverId) {
            socketRef.current.emit('driverLocationUpdated', {
              driverId,
              location: { lat: latitude, lng: longitude }
            });
          }
        }
      );
    })();
  }, [isOnline, driverId]);

  useEffect(() => {
    socketRef.current = io(API_URL);

    if (driverId) {
      socketRef.current.emit('driverJoin', driverId);
    }

    socketRef.current.on('requestAssigned', (tripData) => {
      setIncomingRequest(tripData);
    });

    socketRef.current.on('newJobRequest', async (tripData) => {
      if (isOnlineRef.current) {
        setIncomingRequest(tripData);
        
        // Schedule local notification
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
      }
    });

    socketRef.current.on('jobTaken', ({ tripId }) => {
      setIncomingRequest(current => {
        if (current && current._id === tripId) {
          Alert.alert('Мэдээлэл', 'Захиалгыг өөр жолооч авсан байна.');
          return null;
        }
        return current;
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [driverId]);

  useEffect(() => {
    const updateStatus = async () => {
      if (!driverId) return;
      try {
        await fetch(`${API_URL}/api/driver/${driverId}/status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isOnline }),
        });
        
        // Emit socket event for immediate update
        if (socketRef.current) {
          socketRef.current.emit('driverStatusUpdate', { driverId, isOnline });
        }
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    };
    updateStatus();
  }, [isOnline, driverId]);

  const handleAcceptJob = async () => {
    if (!incomingRequest || !driverId) return;

    try {
      const response = await fetch(`${API_URL}/api/trip/${incomingRequest._id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId }),
      });

      if (response.ok) {
        const updatedTrip = await response.json();
        setIncomingRequest(null);
        navigation.navigate('ActiveJob', { trip: updatedTrip });
      } else {
        const errorData = await response.json();
        Alert.alert('Алдаа', errorData.message || 'Захиалга авахад алдаа гарлаа');
        if (response.status === 400 && errorData.message?.includes('already been accepted')) {
          setIncomingRequest(null);
        }
      }
    } catch (error) {
      console.error('Accept job error:', error);
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    }
  };

  const handleDeclineJob = () => {
    setIncomingRequest(null);
  };

  // DEV ONLY: Simulate a job request
  const simulateRequest = () => {
    setIncomingRequest({
      _id: 'sim-123',
      serviceType: 'Ride',
      price: 15000,
      pickupLocation: { address: 'Sukhbaatar Square', lat: 47.9188, lng: 106.9176 },
      dropoffLocation: { address: 'Zaisan Memorial', lat: 47.89, lng: 106.92 },
    });
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={location}
        customMapStyle={darkMapStyle}
        showsUserLocation={true}
        userInterfaceStyle="dark"
      >
        {/* Render markers if needed */}
      </MapView>

      {/* Top Status Bar */}
      <View style={styles.topBar}>
        <View style={styles.statusContainer}>
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'ТА ОНЛАЙН БАЙНА' : 'ТА ОФФЛАЙН БАЙНА'}
          </Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={setIsOnline}
          trackColor={{ false: theme.colors.surfaceLight, true: theme.colors.success }}
          thumbColor={theme.colors.white}
        />
      </View>

      {/* Bottom Sheet Status */}
      <View style={styles.bottomSheet}>
        <PremiumCard style={styles.statusCard} noPadding>
          <View style={styles.statusContent}>
            {isOnline ? (
              <>
                <View style={styles.radarAnimation}>
                  <View style={styles.radarPulse} />
                  <NavIcon size={24} color={theme.colors.primary} />
                </View>
                <View>
                  <Text style={styles.statusTitle}>Захиалга хайж байна...</Text>
                  <Text style={styles.statusSubtitle}>Таны ойролцоо эрэлт их байна</Text>
                </View>
              </>
            ) : (
              <>
                <View style={[styles.radarAnimation, { backgroundColor: theme.colors.surfaceLight }]}>
                   <View style={[styles.radarPulse, { borderColor: theme.colors.textSecondary }]} />
                   <Text style={{fontSize: 20}}>😴</Text>
                </View>
                <View>
                  <Text style={styles.statusTitle}>Та оффлайн байна</Text>
                  <Text style={styles.statusSubtitle}>Орлого олж эхлэхийн тулд онлайн болоорой</Text>
                </View>
              </>
            )}
          </View>
          
          {/* Dev Button */}
          {isOnline && (
            <TouchableOpacity onPress={simulateRequest} style={styles.devButton}>
              <Text style={styles.devButtonText}>[DEV] ЗАХИАЛГА ТУРШИХ</Text>
            </TouchableOpacity>
          )}
        </PremiumCard>
      </View>

      <IncomingJobModal 
        visible={!!incomingRequest}
        job={incomingRequest}
        onAccept={handleAcceptJob}
        onDecline={handleDeclineJob}
      />
    </View>
  );
}

const darkMapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#242f3e" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#263c3f" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6b9a76" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#38414e" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#212a37" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9ca5b3" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#746855" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#1f2835" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#f3d19c" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2f3948" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#d59563" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#17263c" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#515c6d" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17263c" }]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  map: {
    width: width,
    height: height,
  },
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.medium,
  },
  statusContainer: {
    flex: 1,
  },
  statusText: {
    ...theme.typography.h3,
    fontSize: 16,
  },
  onlineText: {
    color: theme.colors.success,
  },
  offlineText: {
    color: theme.colors.textSecondary,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 20,
  },
  statusCard: {
    padding: theme.spacing.m,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radarAnimation: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(251, 191, 36, 0.15)', // Primary color low opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.m,
  },
  radarPulse: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    opacity: 0.6,
  },
  statusTitle: {
    ...theme.typography.h3,
    marginBottom: 4,
  },
  statusSubtitle: {
    ...theme.typography.caption,
  },
  devButton: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    alignItems: 'center',
  },
  devButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  }
});
