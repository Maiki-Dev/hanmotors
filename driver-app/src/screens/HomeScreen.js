import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Dimensions, Alert, Platform, Modal } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { io } from 'socket.io-client';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { IncomingJobModal } from '../components/IncomingJobModal';
import { API_URL } from '../config';

// Configure notifications to show even when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
import { theme } from '../constants/theme';
import { PremiumCard } from '../components/PremiumCard';
import { MapPin, Navigation as NavIcon, Power, X, Plus, Menu, Truck, Eye, Star, Wallet } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation, route }) {
  const { driverId } = route.params || {}; 
  const [isOnline, setIsOnline] = useState(false);
  const [isServiceModalVisible, setIsServiceModalVisible] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isStatsVisible, setIsStatsVisible] = useState(true); // Default visible
  
  // Stats State (Mock data for now, should be fetched)
  const [stats, setStats] = useState({
    today: {
      earnings: 0,
      success: 0,
      calls: 0
    },
    month: {
      totalTrips: 0,
      totalKm: 0,
      avgRating: 0.0,
      totalEarnings: 0
    }
  });
  const [services, setServices] = useState({
    all: false,
    towing: true,
    driver: false,
    delivery: false,
    taxi: false
  });

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
    const fetchDriverData = async () => {
      if (!driverId) return;
      try {
        const response = await fetch(`${API_URL}/api/driver/${driverId}`);
        if (response.ok) {
          const data = await response.json();
          setWalletBalance(data.wallet?.balance || 0);
        }
      } catch (error) {
        console.error('Failed to fetch driver data:', error);
      }
    };

    const fetchStats = async () => {
      if (!driverId) return;
      try {
        const response = await fetch(`${API_URL}/api/driver/${driverId}/stats`);
        if (response.ok) {
          const data = await response.json();
          console.log('Stats data:', data); 
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    if (isServiceModalVisible) {
        fetchDriverData();
    }
    
    // Always fetch initial data
    fetchDriverData();
    
    // Always fetch stats on mount/update
    fetchStats();

  }, [driverId, isServiceModalVisible]);

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

    socketRef.current.on('walletUpdated', ({ balance }) => {
      setWalletBalance(balance);
    });

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

    socketRef.current.on('jobTaken', ({ tripId, driverId: takenByDriverId }) => {
      setIncomingRequest(current => {
        if (current && current._id === tripId) {
          // If I am the one who took it, don't show the alert
          // Use String() to ensure safe comparison between ObjectId and string
          if (String(takenByDriverId) === String(driverId)) {
             return null; 
          }
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

  const handleToggleOnline = () => {
    if (isOnline) {
      setIsOnline(false);
      setServices(prev => ({ ...prev, all: false }));
    } else {
      setIsServiceModalVisible(true);
    }
  };

  const handleServiceToggle = (key, value) => {
    if (key === 'all') {
       const newValue = value;
       setServices({
         all: newValue,
         towing: newValue,
         driver: newValue,
         delivery: newValue,
         taxi: newValue
       });
    } else {
       setServices(prev => {
           const newState = { ...prev, [key]: !prev[key] };
           const allSelected = newState.towing && newState.driver && newState.delivery && newState.taxi;
           return { ...newState, all: allSelected };
       });
    }
  };

  const confirmGoOnline = () => {
      setIsOnline(true);
      setIsServiceModalVisible(false);
  };

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
        showsUserLocation={false} // Disable default blue dot to show custom marker
        userInterfaceStyle="dark"
      >
        {/* Custom Truck Marker */}
        <Marker coordinate={location}>
           <View style={styles.truckMarker}>
             <Truck size={24} color={theme.colors.primary} fill={theme.colors.primary} />
           </View>
        </Marker>
      </MapView>

      {/* Top Status Bar */}
      <View style={styles.topBar}>
        {/* Prime Stats Popup - Box Layout */}
        <View style={styles.primeStatsCard}>
           <View style={styles.primeHeader}>
              <View style={styles.walletRow}>
                 <Wallet size={16} color="#FFD700" style={{marginRight: 6}} />
                 <Text style={styles.primeBalanceText}>{walletBalance.toLocaleString()}₮</Text>
              </View>
              <View style={styles.primeDivider} />
              <View style={styles.primeDateRow}>
                 <Text style={styles.primeDateText}>{new Date().getMonth() + 1}-р сарын {new Date().getDate()}</Text>
              </View>
           </View>
           
           <View style={styles.primeStatsRow}>
              <View style={styles.primeStatItem}>
                 <Text style={styles.primeStatLabel}>Орлого</Text>
                 <Text style={styles.primeStatValue}>{stats.today?.earnings?.toLocaleString() || 0}₮</Text>
              </View>
              <View style={styles.primeStatItem}>
                 <Text style={styles.primeStatLabel}>Дуудлага</Text>
                 <Text style={styles.primeStatValue}>{stats.today?.trips || 0}</Text>
              </View>
           </View>
        </View>

        <TouchableOpacity 
          onPress={handleToggleOnline}
          style={[styles.powerButton, { backgroundColor: isOnline ? theme.colors.success : theme.colors.error }]}
        >
          <Power size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Stats - REMOVED */}

      <Modal
        animationType="slide"
        transparent={true}
        visible={isServiceModalVisible}
        onRequestClose={() => setIsServiceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ҮЙЛЧИЛГЭЭНИЙ ТӨЛӨВ</Text>
            </View>

            {/* Service Toggles */}
            <View style={styles.servicesList}>
              <View style={styles.serviceRow}>
                <Text style={styles.serviceLabel}>Бүх үйлчилгээ</Text>
                <Switch
                  value={services.all}
                  onValueChange={(val) => handleServiceToggle('all', val)}
                  trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>Ачилтын машин</Text>
                </View>
                <Switch
                  value={services.towing}
                  onValueChange={() => handleServiceToggle('towing')}
                  trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>Дуудлагын жолооч</Text>
                </View>
                <Switch
                  value={services.driver}
                  onValueChange={() => handleServiceToggle('driver')}
                  trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
              
               <View style={styles.serviceRow}>
                <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>Хүргэлт</Text>
                </View>
                <Switch
                  value={services.delivery}
                  onValueChange={() => handleServiceToggle('delivery')}
                  trackColor={{ false: '#E0E0E0', true: theme.colors.primary }}
                  thumbColor="#FFF"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => setIsServiceModalVisible(false)}>
              <Text style={styles.closeButtonText}>Хаах</Text>
            </TouchableOpacity>
            
             <TouchableOpacity 
                style={[styles.goOnlineButton, { opacity: (services.towing || services.driver || services.delivery) ? 1 : 0.5 }]} 
                onPress={confirmGoOnline}
                disabled={!(services.towing || services.driver || services.delivery)}
             >
              <Text style={styles.goOnlineButtonText}>Эхлэх</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <IncomingJobModal 
        visible={!!incomingRequest}
        job={incomingRequest}
        onAccept={handleAcceptJob}
        onDecline={handleDeclineJob}
        userLocation={location}
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
    alignItems: 'flex-start',
    zIndex: 10,
  },
  primeStatsCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    minWidth: 180,
  },
  primeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  walletRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primeBalanceText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  primeDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 8,
  },
  primeDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  primeDateText: {
    color: '#FFF',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  primeStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  primeStatItem: {
    alignItems: 'flex-start',
    marginRight: 16,
  },
  primeStatLabel: {
    color: '#FFF',
    fontSize: 10,
    marginBottom: 2,
    opacity: 0.7,
  },
  primeStatValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  truckMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  devButtonText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
  },
  powerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '100%',
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textTransform: 'uppercase',
  },
  servicesList: {
    marginBottom: 20,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceName: {
    fontSize: 16,
    color: '#333',
  },
  closeButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  closeButtonText: {
    color: '#666',
    fontSize: 16,
  },
  goOnlineButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  goOnlineButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
