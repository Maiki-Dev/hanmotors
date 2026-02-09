import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { theme } from '../constants/theme';
import { RootStackParamList } from '../navigation/types';
import { AnimatedDriverMarker } from '../components/AnimatedDriverMarker';
import { initSocket } from '../services/socket';
import { LOCATION_TASK_NAME } from '../services/LocationTask';
import { mapStyle } from '../constants/mapStyle';
import { GOOGLE_MAPS_APIKEY } from '../config';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.005;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const SERVICES = [
  { id: 'sos', name: 'SOS', icon: 'construct', family: 'Ionicons', color: theme.colors.error },
  { id: 'asaalt', name: 'Асаалт', icon: 'flash', family: 'Ionicons', color: theme.colors.success },
  { id: 'taxi', name: 'Такси', icon: 'car-sport', family: 'Ionicons', color: theme.colors.primary, disabled: true },
  { id: 'delivery', name: 'Хүргэлт', icon: 'cube', family: 'Ionicons', color: theme.colors.info, disabled: true },
];

const INITIAL_DRIVERS: any[] = [];

export default function HomeScreen() {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Байршил тодорхойлж байна...');
  const [region, setRegion] = useState<Region | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [drivers, setDrivers] = useState(INITIAL_DRIVERS);
  const [showsTraffic, setShowsTraffic] = useState(false); // Default off for cleaner look
  const [mapType, setMapType] = useState<'standard' | 'satellite' | 'hybrid'>('standard');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [activeService, setActiveService] = useState('sos');

  // User info from Redux
  const user = useSelector((state: any) => state.auth.user) || { name: 'Хэрэглэгч', balance: 0 };

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAddress('Байршлын эрх өгөгдөөгүй байна');
        return;
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

  // Socket Integration
  useEffect(() => {
    const socket = initSocket(user?.id || user?._id);

    socket.on('allDriverLocations', (locations: Record<string, any>) => {
       const driversList = Object.keys(locations).map(id => ({
         id,
         ...locations[id]
       }));
       setDrivers(driversList);
    });

    socket.on('driverLocationUpdated', (data: { driverId: string, location: any }) => {
      setDrivers(prev => {
        const driverIndex = prev.findIndex(d => d.id === data.driverId);
        if (driverIndex >= 0) {
          const newDrivers = [...prev];
          newDrivers[driverIndex] = { ...newDrivers[driverIndex], ...data.location };
          return newDrivers;
        } else {
          return [...prev, { id: data.driverId, ...data.location }];
        }
      });
    });

    socket.on('driverDisconnected', (data: { driverId: string }) => {
        setDrivers(prev => prev.filter(d => d.id !== data.driverId));
    });

    return () => { 
      socket.off('driverLocationUpdated'); 
      socket.off('driverDisconnected');
      socket.off('allDriverLocations');
    };
  }, []);

  const fetchAddress = async (lat: number, long: number) => {
    try {
      // Use Google Geocoding API for more accurate/specific "real" place names
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${GOOGLE_MAPS_APIKEY}&language=mn`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Prioritize specific address types like street_address, premise, or point_of_interest
        const specificResult = data.results.find((r: any) => 
            r.types.includes('street_address') || 
            r.types.includes('route') || 
            r.types.includes('premise') ||
            r.types.includes('point_of_interest') ||
            r.types.includes('establishment')
        );

        const bestResult = specificResult || data.results[0];
        let formattedAddr = bestResult.formatted_address;

        // Clean up: If address is too generic (e.g. just City name), try to find a neighborhood
        if (formattedAddr === 'Ulaanbaatar' || formattedAddr === 'Ulan Bator') {
             const subLocality = data.results.find((r: any) => r.types.includes('sublocality') || r.types.includes('neighborhood'));
             if (subLocality) formattedAddr = subLocality.formatted_address;
        }
        
        // Remove "Mongolia" or "Ulaanbaatar" suffix if it makes it too long, but keep it if short
        // For now, let's keep the full specific address as requested "real gazriin nershil"
        setAddress(formattedAddr);
      } else {
        // Fallback to Expo Reverse Geocode if Google fails
        const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });
        if (result.length > 0) {
            const addr = result[0];
            const addressName = `${addr.street || ''} ${addr.name || ''}`.trim() || 'Тодорхойгүй хаяг';
            setAddress(addressName);
        }
      }
    } catch (error) {
      console.log('Error fetching address:', error);
      // Fallback on error
      try {
        const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });
        if (result.length > 0) {
            const addr = result[0];
            const addressName = `${addr.street || ''} ${addr.name || ''}`.trim() || 'Тодорхойгүй хаяг';
            setAddress(addressName);
        } else {
            setAddress('Тодорхойгүй байршил');
        }
      } catch (e) {
          setAddress('Тодорхойгүй байршил');
      }
    }
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    fetchAddress(newRegion.latitude, newRegion.longitude);
  };

  const handleServicePress = (serviceId: string) => {
    const service = SERVICES.find(s => s.id === serviceId);
    if (service?.disabled) {
        Alert.alert('Мэдэгдэл', 'Удахгүй нээгдэнэ');
        return;
    }

    setActiveService(serviceId);
    
    // Slight haptic or visual feedback logic here
    if (serviceId === 'sos' || serviceId === 'asaalt') {
      // Pre-select service but wait for "Request" action usually, 
      // but for now let's navigate on button press below
    }
  };

  const handleRequestRide = () => {
    if (activeService === 'sos' || activeService === 'asaalt') {
      navigation.navigate('RideRequest', { 
        pickup: { 
          latitude: region?.latitude || 0, 
          longitude: region?.longitude || 0,
          address: address 
        },
        serviceType: activeService
      });
    } else {
        Alert.alert('Мэдэгдэл', 'Энэ үйлчилгээ тун удахгүй нээгдэнэ.');
    }
  };

  const handleMyLocation = async () => {
    try {
      if (!mapRef.current) return;

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Зөвшөөрөл шаардлагатай', 'Байршил ашиглах эрх өгөгдөөгүй байна.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      setLocation(currentLocation);
      
      mapRef.current.animateToRegion({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      });
    } catch (error) {
      console.log('Error getting location:', error);
      Alert.alert('Алдаа', 'Байршил тодорхойлоход алдаа гарлаа.');
    }
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Map Layer */}
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            customMapStyle={mapStyle}
            initialRegion={region}
            showsUserLocation={true}
            showsMyLocationButton={false}
            onRegionChangeComplete={onRegionChangeComplete}
            showsCompass={false}
            showsTraffic={showsTraffic}
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
          <View style={styles.loadingContainer}>
            <Text style={{color: theme.colors.textSecondary}}>Газрын зураг ачааллаж байна...</Text>
          </View>
        )}
      </View>

      {/* Top Floating Header (Glassmorphism) */}
      <SafeAreaView style={styles.topContainer} pointerEvents="box-none">
        {/* Search Bar "Where to?" */}
        <TouchableOpacity style={styles.searchBar} activeOpacity={0.9} onPress={() => handleRequestRide()}>
            <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.searchContent}>
                <View style={styles.searchIconContainer}>
                    <View style={styles.greenDot} />
                </View>
                <View style={styles.searchTextContainer}>
                    <Text style={styles.searchLabel}>Одоогийн байршил</Text>
                    <Text style={styles.searchValue} numberOfLines={1}>{address}</Text>
                </View>
                <View style={styles.searchAction}>
                    <Text style={styles.searchActionText}>Хаашаа явах вэ?</Text>
                </View>
            </View>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Center Pin Indicator */}
      <View style={styles.centerPinContainer} pointerEvents="none">
          <FontAwesome5 name="map-marker-alt" size={36} color={theme.colors.primary} style={styles.pinIcon} />
          <View style={styles.pinShadow} />
      </View>

      {/* Bottom Service Selector */}
      <View style={styles.bottomSheet}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.handleBar} />
          
          <Text style={styles.serviceTitle}>Үйлчилгээ сонгох</Text>
          
          <View style={styles.servicesGrid}>
              {SERVICES.map((service) => {
                  const isActive = activeService === service.id;
                  return (
                      <TouchableOpacity 
                        key={service.id} 
                        style={[
                            styles.serviceCard, 
                            isActive && styles.serviceCardActive,
                            service.disabled && { opacity: 0.5 }
                        ]}
                        onPress={() => handleServicePress(service.id)}
                      >
                          <View style={[
                              styles.iconCircle, 
                              isActive && { backgroundColor: theme.colors.primary }
                          ]}>
                              <Ionicons 
                                name={service.icon as any} 
                                size={24} 
                                color={isActive ? theme.colors.black : theme.colors.text} 
                              />
                          </View>
                          <Text style={[
                              styles.serviceName, 
                              isActive && { color: theme.colors.primary, fontWeight: '700' }
                          ]}>{service.name}</Text>
                      </TouchableOpacity>
                  );
              })}
          </View>

          <TouchableOpacity style={styles.actionButton} onPress={handleRequestRide}>
              <Text style={styles.actionButtonText}>Захиалах</Text>
              <Ionicons name="arrow-forward" size={20} color={theme.colors.black} />
          </TouchableOpacity>
      </View>

      {/* Traffic Button */}
      <TouchableOpacity 
        style={styles.trafficButton} 
        onPress={() => setShowsTraffic(!showsTraffic)}
      >
        <MaterialIcons name="traffic" size={24} color={showsTraffic ? theme.colors.primary : theme.colors.text} />
      </TouchableOpacity>

      {/* My Location Button */}
      <TouchableOpacity 
        style={styles.myLocationButton} 
        onPress={handleMyLocation}
      >
        <MaterialIcons name="my-location" size={24} color={theme.colors.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
    // borderRadius: theme.borderRadius.xl, // Optional: if we want rounded map corners at bottom
  },
  map: {
    width: '100%',
    height: '110%', // Oversize slightly to hide google logo if needed
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  
  // Top Header
  topContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
    alignItems: 'center',
  },
  
  // Search Bar (Glassmorphic Pill)
  searchBar: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'transparent',
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  searchIconContainer: {
    marginRight: 12,
  },
  greenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)', // Outline effect
    shadowColor: theme.colors.success,
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  searchTextContainer: {
    flex: 1,
  },
  searchLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  searchValue: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
  },
  searchAction: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  searchActionText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
  },

  // Center Pin
  centerPinContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'flex-end', // Align bottom of content to center? No, let's use margin
    marginLeft: -18, // Half of width (36/2)
    marginTop: -36, // Full height to put tip at center
    zIndex: 10,
  },
  pinIcon: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  pinShadow: {
    width: 10,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    marginTop: 2,
  },

  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 100, // Lift above floating tab bar
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    overflow: 'hidden',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.textTertiary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.3,
    display: 'none', // Hide handle bar for floating card look
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  serviceCard: {
    alignItems: 'center',
    width: (width - 40) / 4 - 8,
  },
  serviceCardActive: {
    // scale transform could go here
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  serviceName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: theme.borderRadius.l,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
  },

  // Traffic Button
  trafficButton: {
    position: 'absolute',
    bottom: 350, // Aligned with myLocationButton
    right: 80, // Left of myLocationButton
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },

  // My Location Button
  myLocationButton: {
    position: 'absolute',
    bottom: 350, // Raised higher (was 280)
    right: 20,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
});
