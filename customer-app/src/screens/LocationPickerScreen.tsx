import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, StatusBar, Alert } from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../constants/theme';
import { mapStyle } from '../constants/mapStyle';
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

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
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
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_MAPS_APIKEY}&language=mn`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find a specific address (street_address, route, or premise)
        const specificResult = data.results.find((r: any) => 
            r.types.includes('street_address') || 
            r.types.includes('route') || 
            r.types.includes('premise') ||
            r.types.includes('point_of_interest')
        );

        const bestResult = specificResult || data.results[0];
        let formattedAddr = bestResult.formatted_address;

        // Clean up address if it contains redundant country/city info for local context
        // e.g. "Peace Avenue, Ulaanbaatar, Mongolia" -> "Peace Avenue" if we want to be concise, 
        // but for now let's just use the full one but ensure it's specific.
        // If the result is just "Ulaanbaatar", try to find a sublocality or neighborhood
        if (formattedAddr === 'Ulaanbaatar' || formattedAddr === 'Ulan Bator') {
             const subLocality = data.results.find((r: any) => r.types.includes('sublocality') || r.types.includes('neighborhood'));
             if (subLocality) formattedAddr = subLocality.formatted_address;
        }

        setAddress(formattedAddr);
      } else {
         const osmResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=mn`);
         const osmData = await osmResponse.json();
         if (osmData && osmData.display_name) {
             // Take the first part of the OSM display name for brevity if it's too long
             const parts = osmData.display_name.split(',');
             setAddress(parts.slice(0, 3).join(', '));
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
        customMapStyle={mapStyle}
        initialRegion={region}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
        userInterfaceStyle="dark"
        showsUserLocation={true}
        showsMyLocationButton={false}
      />
      
      {/* Center Marker */}
      <View style={styles.markerFixed}>
        <MapPin size={40} color={theme.colors.primary} fill={theme.colors.background} />
      </View>

      <View style={styles.header}>
        <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Байршил сонгох</Text>
        </View>
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
    left: 20,
    right: 20,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 4,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
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
