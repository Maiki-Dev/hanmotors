import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, StatusBar, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../constants/theme';
import { ArrowLeft, MapPin } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/types';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

type LocationPickerScreenNavigationProp = StackNavigationProp<RootStackParamList, 'LocationPicker'>;
type LocationPickerScreenRouteProp = RouteProp<RootStackParamList, 'LocationPicker'>;

const LocationPickerScreen = () => {
  const navigation = useNavigation<LocationPickerScreenNavigationProp>();
  const route = useRoute<LocationPickerScreenRouteProp>();
  const { initialLocation, returnScreen, type } = route.params || {};
  
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>({
    latitude: initialLocation?.lat || 47.9188,
    longitude: initialLocation?.lng || 106.9176,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!initialLocation) {
        getCurrentLocation();
    } else {
        // Fetch address for initial location
        fetchAddress(initialLocation.lat, initialLocation.lng);
    }
  }, []);

  const getCurrentLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      fetchAddress(location.coords.latitude, location.coords.longitude);
    } catch (e) {
      console.log(e);
    }
  };

  const onRegionChange = () => {
    setIsDragging(true);
  };

  const onRegionChangeComplete = (newRegion: Region) => {
    setIsDragging(false);
    setRegion(newRegion);
    fetchAddress(newRegion.latitude, newRegion.longitude);
  };

  const fetchAddress = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      // Use Google Geocoding API if available, or OpenStreetMap as fallback
      // Using Google Maps API for consistency with other screens
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_APIKEY}&language=mn`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        setAddress(data.results[0].formatted_address);
      } else {
         // Fallback to nominatim if google fails or no key
         const osmResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
         const osmData = await osmResponse.json();
         if (osmData && osmData.display_name) {
             setAddress(osmData.display_name);
         }
      }
    } catch (error) {
      console.error("Error fetching address:", error);
      setAddress("Unknown Location");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    const selectedLocation = {
      address,
      lat: region.latitude,
      lng: region.longitude
    };

    if (returnScreen) {
        // @ts-ignore - Dynamic navigation
        navigation.navigate(returnScreen, { selectedLocation, locationType: type });
    } else {
        navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        userInterfaceStyle="dark"
      />
      
      {/* Center Marker */}
      <View style={styles.markerFixed}>
        <MapPin size={40} color={theme.colors.primary} fill={theme.colors.background} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Байршил сонгох</Text>
      </View>

      <View style={styles.footer}>
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.footerContent}>
            <View style={styles.addressContainer}>
                <Text style={styles.addressLabel}>Сонгосон хаяг:</Text>
                {loading ? (
                    <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 5 }} />
                ) : (
                    <Text style={styles.addressText} numberOfLines={2}>{address || "Байршил тодорхойлж байна..."}</Text>
                )}
            </View>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.confirmButtonText}>БАТЛАХ</Text>
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
  map: {
    width: width,
    height: height,
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.layout.screenPadding,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: {width: -1, height: 1},
    textShadowRadius: 10
  },
  markerFixed: {
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    position: 'absolute',
    top: '50%',
    zIndex: 9,
  },
  footer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
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
  footerContent: {
    padding: 24,
  },
  addressContainer: {
    marginBottom: 20,
  },
  addressLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

export default LocationPickerScreen;
