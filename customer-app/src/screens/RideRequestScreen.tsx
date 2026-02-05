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
  Modal 
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
  MoreHorizontal,
  Locate
} from 'lucide-react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService, customerService } from '../services/api';
import { mapService, decodePolyline } from '../services/mapService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { initSocket } from '../services/socket';
import { AnimatedDriverMarker } from '../components/AnimatedDriverMarker';
import { mapStyle } from '../constants/mapStyle';

type RootStackParamList = {
  RideRequest: { 
    pickup: { address: string; latitude: number; longitude: number };
    serviceType?: string;
  };
  TripStatus: { trip: any };
};

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
  const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);
  const [suggestedPlaces, setSuggestedPlaces] = useState<any[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<any[]>([]);

  const [availableServices, setAvailableServices] = useState(SERVICES);
  const [selectedService, setSelectedService] = useState(
    SERVICES.find(s => s.id.toLowerCase() === route.params?.serviceType?.toLowerCase()) || SERVICES[0]
  );
  const [step, setStep] = useState<'destination_selection' | 'confirm_ride'>('destination_selection');
  const [activeCategory, setActiveCategory] = useState('suggested');

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
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pickerRegion, setPickerRegion] = useState({
      latitude: pickup?.latitude || 47.9188,
      longitude: pickup?.longitude || 106.9176,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
  });
  const [pickerAddress, setPickerAddress] = useState<string>('Байршил сонгоно уу');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);

  // Calculate price when distance changes
  useEffect(() => {
    if (distance > 0 && selectedService?.id) {
      calculatePrice(distance, selectedService);
    }
  }, [distance, selectedService]);

  // Fetch places data
  useEffect(() => {
    if (pickup) {
        fetchNearbyPlaces();
        fetchSuggestedPlaces();
        // In a real app, these would come from an API/Backend
        setSavedPlaces(SAVED_PLACES); 
        setRecentPlaces(RECENT_PLACES);
    }
  }, [pickup]);

  const fetchNearbyPlaces = async () => {
    if (!pickup) return;
    try {
        const radius = 1000; // 1km
        const type = 'point_of_interest'; // General POIs
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

  const fetchSuggestedPlaces = async () => {
      // Mock logic or Google API
      setSuggestedPlaces(SUGGESTED_PLACES);
  };

  const handleSelectPlace = (place: any) => {
    const lat = place.latitude || place.geometry?.location?.lat;
    const lng = place.longitude || place.geometry?.location?.lng;

    if (!lat || !lng) {
      Alert.alert('Алдаа', 'Байршлын мэдээлэл олдсонгүй. Газрын зураг дээрээс сонгоно уу.');
      return;
    }

    setDropoff({
      address: place.name,
      latitude: lat,
      longitude: lng,
    });
    setStep('confirm_ride');
  };

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
      if (user?._id) {
        socket.emit('customerJoin', user._id);
      }
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

  // Fetch route and fit map
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
        
        // Fit map to route
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
      Alert.alert('Алдаа', 'Зам тооцоолоход алдаа гарлаа: ' + (error.message || 'Unknown error'));
    }
  };

  const calculatePrice = async (distKm: number, service = selectedService) => {
    try {
      // Use backend calculation to ensure consistency
      const response = await rideService.calculatePrice(distKm, service.id);
      if (response.data && response.data.price) {
        setPrice(response.data.price);
      } else {
        // Fallback to local calculation if backend fails
        let calculated = service.basePrice;
        if (distKm > 4) {
          calculated += (distKm - 4) * service.pricePerKm;
        }
        setPrice(Math.ceil(calculated / 100) * 100);
      }
    } catch (error) {
       console.log('Backend price calc failed, using local', error);
       let calculated = service.basePrice;
       if (distKm > 4) {
         calculated += (distKm - 4) * service.pricePerKm;
       }
       setPrice(Math.ceil(calculated / 100) * 100);
    }
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
    console.log('Picking location:', pickerAddress, pickerRegion);
    if (!pickerRegion) {
        Alert.alert('Алдаа', 'Байршил сонгогдоогүй байна');
        return;
    }
    setDropoff({
        address: pickerAddress || 'Сонгосон байршил',
        latitude: pickerRegion.latitude,
        longitude: pickerRegion.longitude
    });
    setShowMapPicker(false);
    setStep('confirm_ride');
  };

  const handleMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Анхааруулга', 'Байршлын эрх өгөгдөөгүй байна.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      
      // mapRef.current might refer to confirm map if not careful, 
      // but in renderMapPicker we are not passing ref to MapView currently.
      // Let's add ref={mapRef} to renderMapPicker's MapView as well?
      // Actually mapRef is used in renderConfirmRide. 
      // We can use a separate ref or reuse it if screens are exclusive.
      // They are rendered conditionally, so we can reuse mapRef.
      mapRef.current?.animateToRegion(region, 500);
      setPickerRegion(region);
      // We don't fetch address here because onRegionChangeComplete will trigger?
      // onRegionChangeComplete might trigger after animation. 
      // But explicit fetch is safer if onRegionChangeComplete doesn't fire for programmatic updates consistently.
      // Actually animateToRegion triggers onRegionChangeComplete on completion.
    } catch (error) {
      console.log('Error getting location:', error);
    }
  };

  const renderMapPicker = () => (
    <View style={styles.container}>
        <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            showsTraffic={false}
            initialRegion={pickerRegion}
            onRegionChangeComplete={(region) => {
              setPickerRegion(region);
              fetchAddress(region.latitude, region.longitude);
            }}
            customMapStyle={mapStyle}
            showsUserLocation={true}
            followsUserLocation={true}
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
        
        <TouchableOpacity 
            style={styles.markerFixed} 
            onPress={handleMapPick}
            hitSlop={{ top: 60, bottom: 20, left: 20, right: 20 }}
            activeOpacity={0.9}
        >
            <View style={styles.tooltipContainer}>
                <Text style={styles.tooltipText} numberOfLines={2}>{pickerAddress}</Text>
            </View>
            <MapPin size={40} color={theme.colors.primary} fill={theme.colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.myLocationButton} 
            onPress={handleMyLocation}
        >
            <Locate size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowMapPicker(false)}
        >
            <ArrowLeft size={24} color={theme.colors.text} />
        </TouchableOpacity>

        <View style={[styles.bottomContainer, { 
            position: 'absolute', 
            bottom: 0, 
            left: 0, 
            right: 0, 
            zIndex: 999, 
            elevation: 20, 
            backgroundColor: theme.colors.surface,
            paddingBottom: Math.max(insets.bottom, 16) + 90 
        }]}>
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
            <TouchableOpacity 
               style={styles.inputBox}
               onPress={() => setShowMapPicker(true)}
            >
               <Text style={styles.labelSmall}>Хаах хаяг</Text>
               <Text style={styles.inputText} numberOfLines={1}>
                 {dropoff?.address || 'Газрын зураг дээрээс сонгох...'}
               </Text>
            </TouchableOpacity>
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
        {activeCategory === 'suggested' && suggestedPlaces.map(place => (
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

        {activeCategory === 'nearby' && nearbyPlaces.map(place => (
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

        {activeCategory === 'saved' && savedPlaces.map(place => (
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

        {activeCategory === 'recent' && recentPlaces.map(place => (
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
        <TouchableOpacity 
          style={[styles.mainButton, !dropoff && { opacity: 0.5 }]} 
          onPress={() => {
             if (dropoff) {
               handleRequestRide();
             } else {
               Alert.alert('Хайх', 'Эхлээд очих газраа сонгоно уу');
             }
          }}
        >
          <Text style={styles.mainButtonText}>{dropoff ? `Захиалах (${price.toLocaleString()}₮)` : 'Дуудлага өгөх ->'}</Text>
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
        showsTraffic={false}
        showsUserLocation={true}
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
        
        {pickup && dropoff && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor={theme.colors.primary}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      <TouchableOpacity style={styles.backButton} onPress={() => setStep('destination_selection')}>
        <ArrowLeft size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={[styles.confirmSheet, { paddingBottom: Math.max(insets.bottom, 16) + 90 }]}>
        <View style={styles.handle} />
        <Text style={styles.priceText}>{price.toLocaleString()}₮</Text>
        <Text style={styles.distanceText}>{distance.toFixed(1)} км • {(distance * 2.5).toFixed(0)} мин</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.serviceScroll}>
          {availableServices.map(service => (
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
          onPress={() => setStep('destination_selection')}
        >
          <Text style={styles.confirmButtonText}>Үргэлжлүүлэх</Text>
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

const styles = StyleSheet.create({
  modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  modalContent: {
      backgroundColor: 'white',
      width: '85%',
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      elevation: 5,
  },
  modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 10,
      color: theme.colors.text,
  },
  modalText: {
      fontSize: 16,
      textAlign: 'center',
      color: theme.colors.textSecondary,
      marginBottom: 20,
  },
  paymentInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      backgroundColor: theme.colors.background,
      padding: 15,
      borderRadius: 8,
      marginBottom: 20,
  },
  paymentLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
  },
  paymentValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.primary,
  },
  payButton: {
      backgroundColor: theme.colors.primary,
      width: '100%',
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginBottom: 10,
  },
  payButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
  },
  cancelButton: {
      padding: 15,
  },
  cancelButtonText: {
      color: theme.colors.textSecondary,
      fontSize: 16,
  },
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
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 20,
    zIndex: 999,
  },
  inputRow: {
    flexDirection: 'row',
  },
  iconContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 12,
  },
  pickupDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.surface,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  verticalLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginVertical: 4,
    borderRadius: 1,
  },
  dropoffSquare: {
    width: 12,
    height: 12,
    backgroundColor: theme.colors.text,
    borderRadius: 2,
  },
  inputsWrapper: {
    flex: 1,
  },
  inputBox: {
    height: 48,
    justifyContent: 'center',
  },
  labelSmall: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputText: {
    fontSize: 16,
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
    backgroundColor: theme.colors.surfaceLight,
    marginVertical: 4,
  },
  mapIconBox: {
    position: 'absolute',
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    top: 8,
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
  myLocationButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
});

export default RideRequestScreen;
