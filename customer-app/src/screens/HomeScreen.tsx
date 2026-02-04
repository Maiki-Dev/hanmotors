import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { AnimatedDriverMarker } from '../components/AnimatedDriverMarker';
import { initSocket } from '../services/socket';
import { LOCATION_TASK_NAME } from '../services/LocationTask';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const SERVICES = [
  { id: 'taxi', name: 'Такси', icon: 'car', family: 'Ionicons', color: '#fbbf24' },
  { id: 'delivery', name: 'Хүргэлт', icon: 'cube', family: 'Ionicons', color: '#f97316' },
  { id: 'driver', name: 'Жолооч', icon: 'person', family: 'Ionicons', color: '#3b82f6' },
  { id: 'sos', name: 'SOS', icon: 'build', family: 'Ionicons', color: '#ef4444' },
  { id: 'food', name: 'Хоол', icon: 'fast-food', family: 'Ionicons', color: '#22c55e' },
];

// Mock Nearby Drivers
const INITIAL_DRIVERS: any[] = [];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Байршил тодорхойлж байна...');
  const [region, setRegion] = useState<Region | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [showsTraffic, setShowsTraffic] = useState(false);
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);

  // User info from Redux (mock if not available)
  const user = useSelector((state: any) => state.auth.user) || { name: 'Хэрэглэгч', balance: 0 };

  // Simulate Driver Movement (Mock) - DISABLED for Real WebSocket
  /*
  useEffect(() => {
    const interval = setInterval(() => {
      setDrivers(prevDrivers => prevDrivers.map(d => ({
        ...d,
        lat: d.lat + (Math.random() - 0.5) * 0.0002,
        lng: d.lng + (Math.random() - 0.5) * 0.0002,
        heading: d.heading + (Math.random() - 0.5) * 10
      })));
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  */

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Байршлын эрх өгөгдөөгүй байна');
        return;
      }

      // Request background permissions
      try {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 10,
            deferredUpdatesInterval: 5000,
            foregroundService: {
              notificationTitle: "HanMotors",
              notificationBody: "Байршил ашиглаж байна...",
              notificationColor: "#fbbf24"
            }
          });
        }
      } catch (err) {
        console.log("Background location permission denied or error:", err);
      }

      // Initial location
      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
      
      const initialRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setRegion(initialRegion);
      
      // Initial address fetch
      fetchAddress(location.coords.latitude, location.coords.longitude);

      // Real-time tracking
      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 10,
        },
        (newLocation) => {
          setLocation(newLocation);
        }
      );
    })();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // Camera Follow Mode
  useEffect(() => {
    if (selectedDriverId && mapRef.current) {
      const driver = drivers.find(d => d.id === selectedDriverId);
      if (driver) {
        mapRef.current.animateCamera({
          center: { latitude: driver.lat, longitude: driver.lng },
          heading: driver.heading,
          zoom: 17,
          pitch: 0,
        }, { duration: 1000 });
      }
    }
  }, [drivers, selectedDriverId]);

  // Real-time Driver Tracking (Socket.io Integration)
  useEffect(() => {
    // 1. Initialize Socket Connection
    // Passing user info if needed, or just connecting
    const socket = initSocket(user?.id || user?._id);

    // 2. Listen for Real-time Location Updates
    // Listen for initial bulk drivers data
    socket.on('allDriverLocations', (locations: Record<string, any>) => {
       // locations is { driverId: { lat, lng, ... }, ... }
       const driversList = Object.keys(locations).map(id => ({
         id,
         ...locations[id]
       }));
       setDrivers(driversList);
    });

    // data structure: { driverId, location: { lat, lng, heading, ... } }
    socket.on('driverLocationUpdated', (data: { driverId: string, location: any }) => {
      // console.log('Driver update received:', data); // Debug
      
      setDrivers(prev => {
        const driverIndex = prev.findIndex(d => d.id === data.driverId);
        
        if (driverIndex >= 0) {
          // Update existing driver
          // AnimatedDriverMarker handles smooth transition via props update
          const newDrivers = [...prev];
          newDrivers[driverIndex] = {
             ...newDrivers[driverIndex],
             ...data.location
          };
          return newDrivers;
        } else {
          // Add new driver found in the vicinity only if online (implicit since they are emitting)
          return [...prev, { id: data.driverId, ...data.location }];
        }
      });
    });

    // Handle driver disconnect/offline (Optional: if server emits 'driverDisconnected')
    socket.on('driverDisconnected', (data: { driverId: string }) => {
        setDrivers(prev => prev.filter(d => d.id !== data.driverId));
    });

    // 3. Cleanup listeners on unmount
    return () => { 
      socket.off('driverLocationUpdated'); 
      socket.off('driverDisconnected');
    };
  }, []);

  const fetchAddress = async (lat: number, long: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });
      if (result.length > 0) {
        const addr = result[0];
        const addressName = `${addr.street || ''} ${addr.name || ''}`.trim() || 'Тодорхойгүй хаяг';
        setAddress(addressName);
      }
    } catch (error) {
      console.log('Error fetching address:', error);
      setAddress('Тодорхойгүй байршил');
    }
  };

  const onRegionChange = () => {
    setIsDragging(true);
    if (selectedDriverId) setSelectedDriverId(null);
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setIsDragging(false);
    setRegion(newRegion);
    fetchAddress(newRegion.latitude, newRegion.longitude);
  };

  const handleMyLocation = () => {
    if (location && mapRef.current) {
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
    }
  };

  const cycleMapType = () => {
    if (mapType === 'standard') setMapType('hybrid');
    else if (mapType === 'hybrid') setMapType('satellite');
    else setMapType('standard');
  };

  const handleServicePress = (serviceId: string) => {
    if (serviceId === 'taxi') {
      navigation.navigate('RideRequest', { 
        pickup: { 
          latitude: region?.latitude || 0, 
          longitude: region?.longitude || 0,
          address: address 
        } 
      });
    } else {
      // Handle other services
      console.log('Service selected:', serviceId);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            // provider={PROVIDER_GOOGLE} // Commented out to use native provider (MapKit on iOS, Google on Android)
            customMapStyle={mapType === 'standard' ? mapStyle : []}
            mapType={mapType}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChange={onRegionChange}
            onRegionChangeComplete={onRegionChangeComplete}
            showsBuildings={false}
            showsIndoors={false}
            onMapReady={() => setIsMapReady(true)}
            showsTraffic={showsTraffic}
            rotateEnabled={false}
            pitchEnabled={false}
          >
             {drivers.map(driver => (
               <AnimatedDriverMarker 
                 key={driver.id} 
                 driver={driver} 
                 onPress={() => setSelectedDriverId(driver.id)}
               />
             ))}
          </MapView>
        ) : (
          <View style={[styles.map, styles.loadingContainer]}>
            <Text style={styles.loadingText}>Ачааллаж байна...</Text>
          </View>
        )}
        
        {/* Fixed Center Marker - Generic Yellow Pin */}
        <View style={styles.markerFixed}>
          <View style={styles.markerContainer}>
            {!isDragging && (
              <TouchableOpacity 
                style={styles.markerBubble}
                onPress={() => navigation.navigate('RideRequest', { 
                  pickup: { 
                    latitude: region?.latitude || 0, 
                    longitude: region?.longitude || 0,
                    address: address 
                  } 
                })}
                activeOpacity={0.9}
              >
                 <View style={styles.markerDot} />
                 <Text style={styles.markerText} numberOfLines={1}>
                  {address}
                 </Text>
                 <Ionicons name="chevron-forward" size={14} color="#6B7280" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            )}
            
            {/* Generic Yellow Pin */}
            <View style={styles.pinContainer}>
               <Ionicons name="location-sharp" size={48} color={theme.colors.primary} />
               <View style={styles.pinShadow} />
            </View>
          </View>
        </View>

        {/* Map Controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={cycleMapType}
            activeOpacity={0.8}
          >
            <Ionicons name="layers" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.controlButton} 
            onPress={handleMyLocation}
            activeOpacity={0.8}
          >
            <Ionicons name="locate" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, showsTraffic && styles.activeControlButton]} 
            onPress={() => setShowsTraffic(!showsTraffic)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="traffic" size={24} color={showsTraffic ? theme.colors.primary : "#FFFFFF"} />
          </TouchableOpacity>
        </View>

        {/* Bottom Sheet - Glassmorphism */}
        <BlurView intensity={40} tint="dark" style={styles.bottomSheet}>
           {/* Address Input */}
           <TouchableOpacity 
             style={styles.addressInputContainer}
             onPress={() => navigation.navigate('RideRequest', { 
               pickup: { 
                 latitude: region?.latitude || 0, 
                 longitude: region?.longitude || 0,
                 address: address 
               } 
             })}
           >
             <View style={styles.addressIconWrapper}>
               <View style={styles.greenDot} />
             </View>
             <View style={styles.addressTextContainer}>
               <Text style={styles.addressLabel}>Суух хаяг</Text>
               <Text style={styles.addressValue} numberOfLines={1}>
                 {address !== 'Байршил тодорхойлж байна...' ? address : 'Хаанаас авах вэ?'}
               </Text>
             </View>
             <View style={styles.searchIconWrapper}>
                <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
             </View>
           </TouchableOpacity>

           {/* Services Grid */}
           <View style={styles.servicesGrid}>
             {SERVICES.map((service) => (
               <TouchableOpacity 
                 key={service.id} 
                 style={styles.serviceItem}
                 onPress={() => handleServicePress(service.id)}
                 activeOpacity={0.7}
               >
                 <View style={styles.serviceIconContainer}>
                   <Ionicons name={service.icon as any} size={24} color={theme.colors.primary} />
                 </View>
                 <Text style={styles.serviceName}>{service.name}</Text>
               </TouchableOpacity>
             ))}
           </View>
        </BlurView>
 
       </View>
     </View>
   );
 }

 // Custom Dark Map Style - Premium, Clean, No Labels
const mapStyle = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#17191C" }] // Deep charcoal base
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8A8F98" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#17191C" }]
  },
  {
    "featureType": "administrative.locality",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#D1D5DB" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text",
    "stylers": [{ "visibility": "off" }] // CRITICAL: No brand names
  },
  {
    "featureType": "poi",
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }] // CRITICAL: No brand icons
  },
  {
    "featureType": "poi.business",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "geometry",
    "stylers": [{ "color": "#1E2227" }]
  },
  {
    "featureType": "poi.park",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#6B7280" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "color": "#2C3038" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#21252B" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9CA3AF" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#FFC107" }, { "lightness": -60 }] // Subtle yellow hint
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry.stroke",
    "stylers": [{ "color": "#17191C" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#F3F4F6" }]
  },
  {
    "featureType": "transit",
    "elementType": "geometry",
    "stylers": [{ "color": "#2C3038" }]
  },
  {
    "featureType": "transit.station",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#D1D5DB" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#0E1013" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#4B5563" }]
  },
  // Traffic Layer Visibility
  {
    "featureType": "road",
    "elementType": "geometry",
    "stylers": [{ "visibility": "simplified" }]
  }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: 10,
  },
  
  // FIXED CENTER MARKER
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    zIndex: 10,
  },
  markerContainer: {
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -48, // Anchor bottom to center
    alignItems: 'center',
  },
  markerBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000', // Pure black for pill
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    minWidth: 140,
    justifyContent: 'center',
    zIndex: 20,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    marginRight: 10,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    maxWidth: 180,
    marginRight: 4,
  },
  pinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinShadow: {
    width: 16,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    marginTop: -4,
  },

  // MAP CONTROLS
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 300, // Above bottom sheet
    alignItems: 'center',
    zIndex: 5,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000000', // Pure black
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeControlButton: {
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },

  // BOTTOM SHEET
  bottomSheet: {
    position: 'absolute',
    bottom: 120, // Leave space for floating nav (70px + 25px margin + buffer)
    left: 16,
    right: 16,
    borderRadius: theme.borderRadius.xl,
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.85)', // Force black glass look
  },
  
  // ADDRESS INPUT
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212', // Darker surface
    borderRadius: theme.borderRadius.l,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  addressIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(34, 197, 94, 0.15)', // Green tint
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 2,
  },
  addressValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  searchIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // SERVICES GRID
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  serviceItem: {
    alignItems: 'center',
    width: (width - 64) / 5, // 5 items distributed
  },
  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  serviceName: {
    color: '#FFFFFF',
    fontSize: 11,
    textAlign: 'center',
  },
});
