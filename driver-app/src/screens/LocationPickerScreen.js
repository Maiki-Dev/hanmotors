import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Dimensions, ActivityIndicator, Image } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { theme } from '../constants/theme';
import { ArrowLeft, MapPin } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

// Dark Map Style
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

export default function LocationPickerScreen({ navigation, route }) {
  const { initialLocation, onSelect, returnScreen, type } = route.params || {};
  const mapRef = useRef(null);
  const [region, setRegion] = useState({
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
    } catch (e) {
      console.log(e);
    }
  };

  const onRegionChange = () => {
    setIsDragging(true);
  };

  const onRegionChangeComplete = async (newRegion) => {
    setIsDragging(false);
    setRegion(newRegion);
    fetchAddress(newRegion.latitude, newRegion.longitude);
  };

  const fetchAddress = async (lat, lon) => {
    setLoading(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const data = await response.json();
      if (data && data.display_name) {
        // Shorten address for display if needed
        const fullAddress = data.display_name;
        // Simple heuristic to shorten: take first 3 parts
        const shortAddress = fullAddress.split(',').slice(0, 3).join(',');
        setAddress(shortAddress);
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
        navigation.navigate(returnScreen, { selectedLocation, type });
    } else {
        navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={darkMapStyle}
        initialRegion={region}
        onRegionChange={onRegionChange}
        onRegionChangeComplete={onRegionChangeComplete}
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
  );
}

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
    paddingHorizontal: theme.spacing.l,
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
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addressContainer: {
    marginBottom: 16,
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
    height: 50,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: theme.colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
