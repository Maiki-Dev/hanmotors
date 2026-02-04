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
  FlatList 
} from 'react-native';
import { theme } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { 
  ArrowLeft, 
  MapPin, 
  Car, 
  Clock, 
  Home, 
  Briefcase, 
  Search, 
  Star, 
  MoreHorizontal 
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { initSocket } from '../services/socket';
import { AnimatedDriverMarker } from '../components/AnimatedDriverMarker';

type RootStackParamList = {
  RideRequest: { 
    pickup: { address: string; latitude: number; longitude: number };
  };
  TripStatus: { trip: any };
};

type RideRequestScreenRouteProp = RouteProp<RootStackParamList, 'RideRequest'>;
type RideRequestScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RideRequest'>;

const { width, height } = Dimensions.get('window');

const SERVICES = [
  { id: 'Ride', label: 'Taxi', icon: Car, basePrice: 1000, pricePerKm: 1500, description: 'Хурдан, тухтай' },
  { id: 'Delivery', label: 'Delivery', icon: Car, basePrice: 5000, pricePerKm: 2000, description: 'Хүргэлт' },
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

const NEARBY_PLACES = [
  { id: 'n1', name: 'CU Convenience Store', address: 'Таны байршлын ойролцоо, 50м', icon: MapPin },
  { id: 'n2', name: 'GS25', address: 'Таны байршлын ойролцоо, 100м', icon: MapPin },
  { id: 'n3', name: 'Эмийн сан', address: 'Таны байршлын ойролцоо, 150м', icon: MapPin },
];

const CATEGORIES = [
  { id: 'suggested', label: 'Санал болгох' },
  { id: 'nearby', label: 'Ойр' },
  { id: 'saved', label: 'Хадгалсан' },
  { id: 'recent', label: 'Сүүлд' },
];

const RideRequestScreen = () => {
  const route = useRoute<RideRequestScreenRouteProp>();
  const navigation = useNavigation<RideRequestScreenNavigationProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  
  // State
  const [pickup, setPickup] = useState(route.params?.pickup || null);
  const [dropoff, setDropoff] = useState<{ address: string; latitude: number; longitude: number } | null>(null);
  const [distance, setDistance] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [step, setStep] = useState<'destination_selection' | 'confirm_ride'>('destination_selection');
  const [activeCategory, setActiveCategory] = useState('suggested');
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickerRegion, setPickerRegion] = useState({
      latitude: pickup?.latitude || 47.9188,
      longitude: pickup?.longitude || 106.9176,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
  });
  const [pickerAddress, setPickerAddress] = useState<string>('Байршил сонгоно уу');
  const [drivers, setDrivers] = useState<any[]>([]);

  // Calculate price when distance changes
  useEffect(() => {
    if (distance > 0) {
      setPrice(calculatePrice(distance, selectedService));
    }
  }, [distance, selectedService]);

  // Real-time Driver Tracking
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
      socket.on('driverLocationUpdated', handleDriverUpdate);
    }

    return () => {
      if (socket) {
        socket.off('driverLocationUpdated', handleDriverUpdate);
      }
    };
  }, []);

  // Fit map to coordinates
  useEffect(() => {
    if (step === 'confirm_ride' && pickup && dropoff && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: pickup.latitude, longitude: pickup.longitude },
            { latitude: dropoff.latitude, longitude: dropoff.longitude },
          ],
          {
            edgePadding: { top: 100, right: 50, bottom: 400, left: 50 },
            animated: true,
          }
        );
      }, 500);
    }
  }, [pickup, dropoff, step]);

  const calculatePrice = (distKm: number, service = selectedService) => {
    const calculated = service.basePrice + distKm * service.pricePerKm;
    return Math.ceil(calculated / 100) * 100;
  };

  const handleDirectionsReady = (result: any) => {
    setDistance(result.distance);
  };

  const fetchAddress = async (lat: number, long: number) => {
    try {
      const result = await Location.reverseGeocodeAsync({ latitude: lat, longitude: long });
      if (result.length > 0) {
        const addr = result[0];
        const addressName = `${addr.street || ''} ${addr.name || ''}`.trim();
        setPickerAddress(addressName || 'Тодорхойгүй хаяг');
      }
    } catch (error) {
      console.log('Error fetching address:', error);
      setPickerAddress('Тодорхойгүй байршил');
    }
  };

  const handleSelectPlace = (place: any) => {
    // Mock selecting a place - in real app would get coords from Place API
    const mockCoords = {
      latitude: pickup ? pickup.latitude + 0.02 : 47.9188, 
      longitude: pickup ? pickup.longitude + 0.02 : 106.9176,
    };
    
    setDropoff({
      address: place.name,
      ...mockCoords
    });
    setStep('confirm_ride');
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) {
      Alert.alert('Анхааруулга', 'Та хүрэх газраа сонгоно уу.');
      return;
    }
    
    setLoading(true);
    try {
      const response = await rideService.requestRide({
        customerId: user?._id || 'guest',
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
        serviceType: selectedService.id,
        distance
      });
      
      Alert.alert('Амжилттай', 'Аялал амжилттай захиалагдлаа!');
      navigation.navigate('TripStatus', { trip: response.data }); 
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Аялал захиалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const handleMapPick = () => {
    setDropoff({
        address: pickerAddress,
        latitude: pickerRegion.latitude,
        longitude: pickerRegion.longitude
    });
    setShowMapPicker(false);
    setStep('confirm_ride');
  };

  const renderMapPicker = () => (
    <View style={styles.container}>
        <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={pickerRegion}
            onRegionChangeComplete={(region) => {
              setPickerRegion(region);
              fetchAddress(region.latitude, region.longitude);
            }}
            customMapStyle={mapStyle}
        >
            {drivers.map(driver => (
              <AnimatedDriverMarker
                key={driver.id}
                driver={driver}
              />
            ))}
            {pickup && (
                <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
                    <View style={[styles.markerContainer, { backgroundColor: theme.colors.textSecondary }]}>
                        <View style={styles.markerDot} />
                    </View>
                </Marker>
            )}
        </MapView>
        
        <View style={styles.markerFixed}>
            <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText} numberOfLines={2}>{pickerAddress}</Text>
            </View>
            <MapPin size={40} color={theme.colors.primary} fill={theme.colors.primary} />
        </View>

        <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowMapPicker(false)}
        >
            <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={styles.bottomContainer}>
            <TouchableOpacity style={styles.mainButton} onPress={handleMapPick}>
                <Text style={styles.mainButtonText}>Энэ байршлыг сонгох</Text>
            </TouchableOpacity>
        </View>
    </View>
  );

  const renderDestinationSelection = () => (
    <View style={styles.selectionContainer}>
      {/* Header Inputs */}
      <View style={styles.inputCard}>
        <View style={styles.inputRow}>
          <View style={styles.iconContainer}>
            <View style={styles.pickupDot} />
            <View style={styles.verticalLine} />
            <View style={styles.dropoffSquare} />
          </View>
          <View style={styles.inputsWrapper}>
            <View style={styles.inputBox}>
               <Text style={styles.labelSmall}>Суух хаяг</Text>
               <Text style={styles.inputText} numberOfLines={1}>{pickup?.address || 'Байршил сонгох...'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.inputBox}>
               <TextInput 
                 placeholder="Хаашаа явах вэ?"
                 placeholderTextColor={theme.colors.textSecondary}
                 style={styles.textInput}
                 autoFocus={true}
               />
               <TouchableOpacity style={styles.mapIconBox} onPress={() => setShowMapPicker(true)}>
                 <MapPin size={16} color={theme.colors.white} />
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.categoryChip, activeCategory === cat.id && styles.activeCategoryChip]}
              onPress={() => setActiveCategory(cat.id)}
            >
              <Text style={[styles.categoryText, activeCategory === cat.id && styles.activeCategoryText]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Places List */}
      <ScrollView style={styles.placesList}>
        {activeCategory === 'suggested' && SUGGESTED_PLACES.map(place => (
          <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
            <View style={styles.placeIconCircle}>
              <MapPin size={20} color={theme.colors.text} />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {activeCategory === 'nearby' && NEARBY_PLACES.map(place => (
          <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
            <View style={styles.placeIconCircle}>
              <MapPin size={20} color={theme.colors.text} />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}

        {activeCategory === 'saved' && SAVED_PLACES.map(place => (
          <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
            <View style={styles.placeIconCircle}>
              <place.icon size={20} color={theme.colors.textSecondary} />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
            <TouchableOpacity style={styles.addIcon}>
               <Text style={styles.plusText}>+</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {activeCategory === 'recent' && RECENT_PLACES.map(place => (
          <TouchableOpacity key={place.id} style={styles.placeItem} onPress={() => handleSelectPlace(place)}>
            <View style={styles.placeIconCircle}>
              <MapPin size={20} color={theme.colors.text} />
            </View>
            <View style={styles.placeInfo}>
              <Text style={styles.placeName}>{place.name}</Text>
              <Text style={styles.placeAddress}>{place.address}</Text>
            </View>
            <MoreHorizontal size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Button */}
      <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}>
        <TouchableOpacity style={styles.mainButton} onPress={() => Alert.alert('Хайх', 'Эхлээд очих газраа сонгоно уу')}>
          <Text style={styles.mainButtonText}>Дуудлага өгөх {'->'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderConfirmRide = () => (
    <View style={styles.container}>
       <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: pickup?.latitude || 47.9188,
          longitude: pickup?.longitude || 106.9176,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={mapStyle}
      >
        {pickup && (
          <Marker coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}>
            <View style={styles.markerContainer}>
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
        {dropoff && (
          <Marker coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }} />
        )}
        
        {pickup && dropoff && (
          <MapViewDirections
            origin={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            destination={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            apikey={GOOGLE_MAPS_APIKEY}
            strokeWidth={4}
            strokeColor={theme.colors.primary}
            onReady={handleDirectionsReady}
          />
        )}
      </MapView>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep('destination_selection')}>
        <ArrowLeft size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.confirmSheet}>
        <View style={styles.handle} />
        <Text style={styles.priceText}>{price.toLocaleString()}₮</Text>
        <Text style={styles.distanceText}>{distance.toFixed(1)} км • {(distance * 2.5).toFixed(0)} мин</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll}>
          {SERVICES.map(service => (
            <TouchableOpacity 
              key={service.id} 
              style={[styles.serviceCard, selectedService.id === service.id && styles.selectedServiceCard]}
              onPress={() => setSelectedService(service)}
            >
              <service.icon size={32} color={selectedService.id === service.id ? theme.colors.black : theme.colors.text} />
              <Text style={[styles.serviceLabel, selectedService.id === service.id && styles.selectedServiceLabel]}>
                {service.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={handleRequestRide}
          disabled={loading}
        >
          {loading ? (
             <ActivityIndicator color={theme.colors.black} />
          ) : (
             <Text style={styles.confirmButtonText}>Захиалах</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {showMapPicker ? renderMapPicker() : (
        step === 'destination_selection' ? renderDestinationSelection() : renderConfirmRide()
      )}
    </View>
  );
};

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] }
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  selectionContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 60,
  },
  inputCard: {
    marginHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 8,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textSecondary,
  },
  verticalLine: {
    width: 1,
    flex: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
  dropoffSquare: {
    width: 8,
    height: 8,
    backgroundColor: theme.colors.primary,
  },
  inputsWrapper: {
    flex: 1,
  },
  inputBox: {
    height: 40,
    justifyContent: 'center',
  },
  labelSmall: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  inputText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  textInput: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
    paddingRight: 32,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  mapIconBox: {
    position: 'absolute',
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.textSecondary, // Should be colorful map icon usually
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 10,
    alignItems: 'center',
  },
  tooltipContainer: {
    position: 'absolute',
    top: -40,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: 280,
    alignItems: 'center',
  },
  tooltipText: {
    fontSize: 12,
    color: theme.colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  
  // Categories
  categoriesContainer: {
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  activeCategoryChip: {
    backgroundColor: theme.colors.text,
    borderColor: theme.colors.text,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  activeCategoryText: {
    color: theme.colors.background,
  },
  
  // Places List
  placesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
  },
  placeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  placeAddress: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  addIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 24,
    color: theme.colors.textSecondary,
    marginTop: -4,
  },
  
  // Bottom Button
  bottomContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  mainButton: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  mainButtonText: {
    color: theme.colors.black,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Confirm Ride Styles
  map: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 50,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  confirmSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.textSecondary,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
    opacity: 0.3,
  },
  priceText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  distanceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  serviceScroll: {
    marginBottom: 20,
  },
  serviceCard: {
    width: 100,
    height: 80,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedServiceCard: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  serviceLabel: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 8,
    fontWeight: '600',
  },
  selectedServiceLabel: {
    color: theme.colors.black,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.black,
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.primary, // rgba(251, 191, 36, 0.3)
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.black,
  },
});

export default RideRequestScreen;
