import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Platform, 
  Dimensions, 
  TextInput,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { theme } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { 
  ArrowLeft, 
  MapPin, 
  Car, 
  Clock, 
  Home, 
  Briefcase, 
  Search, 
  Star, 
  MoreHorizontal,
  Locate,
  Navigation,
  ChevronRight,
  Map
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService, customerService } from '../services/api';
import { mapService, decodePolyline } from '../services/mapService';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/slices/authSlice';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { initSocket } from '../services/socket';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { AnimatedDriverMarker } from '../components/AnimatedDriverMarker';
import { mapStyle } from '../constants/mapStyle';

type RideRequestScreenRouteProp = RouteProp<RootStackParamList, 'RideRequest'>;
type RideRequestScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RideRequest'>;

const { width, height } = Dimensions.get('window');

const SERVICES = [
  { id: 'taxi', label: 'Taxi', icon: Car, basePrice: 1000, pricePerKm: 1500, description: 'Хурдан, тухтай' },
  { id: 'delivery', label: 'Delivery', icon: Car, basePrice: 5000, pricePerKm: 2000, description: 'Хүргэлт' },
  { id: 'sos', label: 'SOS', icon: Car, basePrice: 2000, pricePerKm: 2000, description: 'Тусламж' },
];

const RECENT_PLACES = [
  { id: '1', name: 'Баянзүрх дүүргийн Засаг даргын тамгын газар', address: 'Баянзүрх дүүрэг, Улаанбаатар', icon: MapPin },
  { id: '2', name: 'Үндэсний цэцэрлэгт хүрээлэн', address: 'Үндэсний цэцэрлэгт хүрээлэн, Улаанбаатар', icon: MapPin },
  { id: '3', name: 'Дүнжингарав худалдааны төв', address: 'Дүнжингарав, Улаанбаатар', icon: MapPin },
];

const SAVED_PLACES = [
  { id: 'home', name: 'Гэр', address: 'Хаяг нэмэх', icon: Home },
  { id: 'work', name: 'Ажил', address: 'Хаяг нэмэх', icon: Briefcase },
];

const SUGGESTED_PLACES = [
  { id: 's1', name: 'Чингис хаан олон улсын нисэх буудал', address: 'Төв аймаг, Сэргэлэн сум', icon: MapPin },
  { id: 's2', name: 'Улсын Их Дэлгүүр', address: 'Чингэлтэй дүүрэг, Улаанбаатар', icon: MapPin },
  { id: 's3', name: 'Зайсан толгой', address: 'Хан-Уул дүүрэг, Улаанбаатар', icon: MapPin },
];

const RideRequestScreen = () => {
  const route = useRoute<RideRequestScreenRouteProp>();
  const navigation = useNavigation<RideRequestScreenNavigationProp>();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  
  // State
  const [pickup, setPickup] = useState(route.params?.pickup || null);
  const [dropoff, setDropoff] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  
  const [availableServices, setAvailableServices] = useState(SERVICES);
  const [selectedService, setSelectedService] = useState(
    SERVICES.find(s => s.id.toLowerCase() === route.params?.serviceType?.toLowerCase()) || SERVICES[0]
  );
  const [step, setStep] = useState<'destination_selection' | 'confirm_ride'>('destination_selection');
  
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickerRegion, setPickerRegion] = useState({
      latitude: pickup?.latitude || 47.9188,
      longitude: pickup?.longitude || 106.9176,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
  });

  useEffect(() => {
    if (route.params?.selectedLocation && route.params?.locationType) {
        const { selectedLocation, locationType } = route.params;
        if (locationType === 'dropoff') {
            setDropoff({
                address: selectedLocation.address,
                latitude: selectedLocation.lat,
                longitude: selectedLocation.lng
            });
            setStep('confirm_ride');
        }
    }
  }, [route.params]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await rideService.getPricingRules();
        const rules = response.data;
        if (rules && rules.length > 0) {
          const dynamicServices = rules.map((rule: any) => ({
            id: rule.vehicleType, 
            label: rule.vehicleType,
            icon: Car,
            basePrice: rule.basePrice,
            pricePerKm: rule.pricePerKm,
            description: `${rule.basePrice}₮ + ${rule.pricePerKm}₮/км`
          }));
          setAvailableServices(dynamicServices);
          const requested = dynamicServices.find((s: any) => 
             s.id.toLowerCase() === route.params?.serviceType?.toLowerCase()
          );
          setSelectedService(requested || dynamicServices[0]);
        }
      } catch (error) {
        console.log('Error fetching pricing rules:', error);
      }
    };
    fetchServices();
  }, [route.params?.serviceType]);

  useEffect(() => {
    if (distance > 0 && selectedService?.id) {
      calculatePrice(distance, selectedService);
    }
  }, [distance, selectedService]);

  useEffect(() => {
    if (pickup) fetchNearbyPlaces();
  }, [pickup]);

  const fetchNearbyPlaces = async () => {
    if (!pickup) return;
    try {
        const radius = 1000; 
        const type = 'point_of_interest';
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${pickup.latitude},${pickup.longitude}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_APIKEY}&language=mn`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.results) {
            const places = data.results.slice(0, 6).map((item: any) => ({
                id: item.place_id,
                name: item.name,
                address: item.vicinity,
                latitude: item.geometry.location.lat,
                longitude: item.geometry.location.lng,
                icon: MapPin
            }));
            setNearbyPlaces(places);
        }
    } catch (error) {
        console.log('Error fetching nearby places:', error);
    }
  };

  const handleOpenMapPicker = () => {
      navigation.navigate('LocationPicker', {
          returnScreen: 'RideRequest',
          type: 'dropoff',
          initialLocation: pickup ? { lat: pickup.latitude, lng: pickup.longitude } : undefined
      });
  };

  const handleSelectPlace = (place: any) => {
    const lat = place.latitude || place.geometry?.location?.lat;
    const lng = place.longitude || place.geometry?.location?.lng;

    if (!lat || !lng) {
      Alert.alert('Алдаа', 'Байршлын мэдээлэл олдсонгүй.');
      return;
    }

    setDropoff({
      address: place.name,
      latitude: lat,
      longitude: lng,
    });
    setStep('confirm_ride');
  };

  useEffect(() => {
    const socket = initSocket();
    const handleDriverUpdate = (data: { driverId: string, location: any }) => {
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
    };

    if (socket) {
      if (user?._id) socket.emit('customerJoin', user._id);
      socket.on('driverLocationUpdated', handleDriverUpdate);
      socket.on('driverDisconnected', (data: { driverId: string }) => {
        setDrivers(prev => prev.filter(d => d.id !== data.driverId));
      });
    }

    return () => {
      if (socket) {
        socket.off('driverLocationUpdated', handleDriverUpdate);
        socket.off('driverDisconnected');
      }
    };
  }, []);

  useEffect(() => {
    if (step === 'confirm_ride' && pickup && dropoff) {
      fetchRoute();
    }
  }, [pickup, dropoff, step]);

  const fetchRoute = async () => {
    if (!pickup || !dropoff) return;
    try {
      const result = await mapService.getRoute(
        { latitude: pickup.latitude, longitude: pickup.longitude },
        { latitude: dropoff.latitude, longitude: dropoff.longitude }
      );
      
      if (result) {
        const points = decodePolyline(result.polyline.encodedPolyline);
        setRouteCoordinates(points);
        const distKm = result.distanceMeters / 1000;
        setDistance(distKm);
        
        if (mapRef.current) {
          setTimeout(() => {
             mapRef.current?.fitToCoordinates(points, {
                edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
                animated: true,
             });
          }, 500);
        }
      }
    } catch (error: any) {
      console.log('Error fetching route:', error);
      Alert.alert('Алдаа', 'Зам тооцоолоход алдаа гарлаа.');
    }
  };

  const calculatePrice = async (distKm: number, service = selectedService) => {
    try {
      const response = await rideService.calculatePrice(distKm, service.id);
      if (response.data && response.data.price) {
        setPrice(response.data.price);
      } else {
        // Fallback
        const calculated = service.basePrice + (distKm * service.pricePerKm);
        setPrice(Math.round(calculated / 100) * 100);
      }
    } catch (error) {
      const calculated = service.basePrice + (distKm * service.pricePerKm);
      setPrice(Math.round(calculated / 100) * 100);
    }
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) return;
    
    if (!user) {
      Alert.alert(
        'Нэвтрэх шаардлагатай',
        'Та захиалга өгөхийн тулд системд нэвтэрнэ үү.',
        [
          { text: 'Буцах', style: 'cancel' },
          { 
            text: 'Нэвтрэх', 
            onPress: () => {
              // Dispatch logout to reset auth state and trigger navigation to AuthStack
              dispatch(logout());
            }
          }
        ]
      );
      return;
    }

    setLoading(true);
    try {
      const response = await rideService.requestRide({
        customerId: user._id,
        pickup: {
          address: pickup.address,
          lat: pickup.latitude,
          lng: pickup.longitude
        },
        dropoff: {
          address: dropoff.address,
          lat: dropoff.latitude,
          lng: dropoff.longitude
        },
        vehicleType: selectedService.id,
        distance: distance
      });
      
      if (response.data) {
        Alert.alert('Амжилттай', 'Таны захиалга үүслээ. Жолооч хайж байна...');
        navigation.navigate('TripStatus', { trip: response.data });
      }
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Захиалга үүсгэхэд алдаа гарлаа.');
    } finally {
      setLoading(false);
    }
  };

  // Render Logic
  if (step === 'destination_selection') {
    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <LinearGradient
                colors={[theme.colors.background, '#1a2138', '#0f1322']}
                style={StyleSheet.absoluteFill}
            />
            
            <SafeAreaView style={{flex: 1}}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft color={theme.colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Хаашаа явах вэ?</Text>
                </View>

                <View style={styles.inputContainer}>
                    <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.inputWrapper}>
                        <View style={styles.inputRow}>
                            <View style={styles.iconColumn}>
                                <View style={styles.dotStart} />
                                <View style={styles.connectorLine} />
                                <View style={styles.dotEnd} />
                            </View>
                            <View style={styles.inputsColumn}>
                                <View style={styles.inputFieldContainer}>
                                    <Text style={styles.inputText} numberOfLines={1}>{pickup?.address || "Байршил сонгох"}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.inputFieldContainer}>
                                    <TextInput 
                                        style={styles.input}
                                        placeholder="Очих газраа хайх..."
                                        placeholderTextColor={theme.colors.textSecondary}
                                        autoFocus
                                    />
                                    <TouchableOpacity onPress={handleOpenMapPicker} style={styles.mapIconButton}>
                                        <Map size={20} color={theme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                <ScrollView style={styles.scrollContent} contentContainerStyle={{paddingBottom: 40}}>
                    {/* Saved Places */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Хадгалсан хаягууд</Text>
                        {SAVED_PLACES.map(place => (
                            <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
                                <View style={styles.placeIconContainer}>
                                    <place.icon size={20} color={theme.colors.primary} />
                                </View>
                                <View style={styles.placeTextContainer}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    <Text style={styles.placeAddress}>{place.address}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Suggested Places */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Санал болгох</Text>
                        {SUGGESTED_PLACES.map(place => (
                            <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
                                 <View style={styles.placeIconContainer}>
                                    <MapPin size={20} color={theme.colors.textSecondary} />
                                </View>
                                <View style={styles.placeTextContainer}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    <Text style={styles.placeAddress}>{place.address}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                     {/* Nearby Places */}
                     <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ойр байгаа газрууд</Text>
                        {nearbyPlaces.map(place => (
                            <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
                                 <View style={styles.placeIconContainer}>
                                    <MapPin size={20} color={theme.colors.textSecondary} />
                                </View>
                                <View style={styles.placeTextContainer}>
                                    <Text style={styles.placeName}>{place.name}</Text>
                                    <Text style={styles.placeAddress}>{place.address}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
  }

  // Step 2: Confirm Ride
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Map Background */}
      <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            // customMapStyle={mapStyle}
            initialRegion={{
                latitude: pickup?.latitude || 0,
                longitude: pickup?.longitude || 0,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
          >
              {/* Markers & Polyline */}
              {pickup && <Marker coordinate={pickup} title="Авах цэг" pinColor={theme.colors.success} />}
              {dropoff && <Marker coordinate={dropoff} title="Очих цэг" pinColor={theme.colors.error} />}
              {routeCoordinates.length > 0 && (
                  <Polyline coordinates={routeCoordinates} strokeWidth={4} strokeColor={theme.colors.primary} />
              )}
               {drivers.map(driver => (
                   <AnimatedDriverMarker key={driver.id} driver={driver} />
               ))}
          </MapView>

          {/* Top Back Button */}
          <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
              <TouchableOpacity onPress={() => setStep('destination_selection')} style={styles.backButtonCircle}>
                  <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                  <ArrowLeft color={theme.colors.text} size={24} />
              </TouchableOpacity>
          </SafeAreaView>
      </View>

      {/* Bottom Selection Panel */}
      <View style={styles.bottomSheet}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.bottomSheetContent}>
          <View style={styles.tripSummary}>
              <View style={styles.summaryRow}>
                  <View style={styles.dotStart} />
                  <Text style={styles.summaryText} numberOfLines={1}>{pickup?.address}</Text>
              </View>
              <View style={styles.connectorLine} />
              <View style={styles.summaryRow}>
                  <View style={styles.dotEnd} />
                  <Text style={styles.summaryText} numberOfLines={1}>{dropoff?.address}</Text>
              </View>
          </View>

          <Text style={styles.sectionTitle}>Үйлчилгээ сонгох</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
              {availableServices.map((service) => {
                  const isSelected = selectedService.id === service.id;
                  return (
                      <TouchableOpacity 
                        key={service.id} 
                        style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                        onPress={() => setSelectedService(service)}
                      >
                          <View style={styles.serviceIconWrapper}>
                              <service.icon size={28} color={isSelected ? theme.colors.black : theme.colors.text} />
                          </View>
                          <Text style={[styles.serviceType, isSelected && {color: theme.colors.black}]}>{service.label}</Text>
                          {/* Price removed as per request */}
                      </TouchableOpacity>
                  );
              })}
          </ScrollView>

          <View style={styles.paymentRow}>
              <View style={styles.paymentMethod}>
                  <Text style={styles.paymentText}>Төлбөр</Text>
              </View>
              <Text style={styles.finalPrice}>{price}₮</Text>
          </View>

          <TouchableOpacity 
            style={[styles.confirmButton, loading && {opacity: 0.7}]} 
            onPress={handleRequestRide}
            disabled={loading}
          >
              {loading ? (
                  <ActivityIndicator color={theme.colors.black} />
              ) : (
                  <Text style={styles.confirmButtonText}>ЗАХИАЛАХ</Text>
              )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPadding,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    ...theme.typography.h4,
    color: theme.colors.text,
  },
  
  // Input Area
  inputContainer: {
    margin: theme.layout.screenPadding,
    backgroundColor: 'transparent',
    borderRadius: theme.borderRadius.l,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  inputWrapper: {
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
  },
  iconColumn: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
    paddingTop: 15, 
    paddingBottom: 15,
  },
  inputsColumn: {
    flex: 1,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  connectorLine: {
    width: 2,
    flex: 1, // fill space between dots
    minHeight: 20,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  dotStart: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.success,
  },
  dotEnd: {
    width: 10,
    height: 10,
    borderRadius: 0, // Square
    backgroundColor: theme.colors.primary,
  },
  inputText: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  input: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
    padding: 0,
  },
  mapIconButton: {
    padding: 8,
    marginLeft: 8,
  },

  // Lists
  scrollContent: {
    paddingHorizontal: theme.layout.screenPadding,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  placeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  placeTextContainer: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },

  // Confirm Step
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 10,
  },
  backButtonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  
  bottomSheet: {
    position: 'absolute',
    bottom: 100, // Lift up above the floating tab bar
    left: 20,
    right: 20,
    backgroundColor: 'transparent',
    borderRadius: 30, // Rounded style like navigation
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  bottomSheetContent: {
    padding: 20,
    paddingBottom: 20, // Standard padding since container is floating
  },
  tripSummary: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tripAddress: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  servicesScroll: {
    paddingBottom: 16,
  },
  serviceCard: {
    width: 110,
    height: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  serviceCardSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  serviceIconWrapper: {
    alignItems: 'flex-start',
  },
  serviceType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  finalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  
  confirmButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  confirmButtonText: {
    color: theme.colors.black,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default RideRequestScreen;
