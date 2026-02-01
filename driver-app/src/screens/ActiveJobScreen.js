import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Navigation, Phone, MessageCircle } from 'lucide-react-native';
import * as Location from 'expo-location';
import { API_URL } from '../config';
import { theme } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';
import { PremiumCard } from '../components/PremiumCard';

// Use same dark map style
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

export default function ActiveJobScreen({ route, navigation }) {
  const { job: paramJob, trip: paramTrip } = route.params || {};
  const job = paramJob || paramTrip;

  const [status, setStatus] = useState(
    job?.status === 'in_progress' ? 'in_progress' : 'pickup'
  );
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [tripStats, setTripStats] = useState({ duration: 0, distance: 0 });
  const mapRef = useRef(null);
  const statusRef = useRef(status);
  const lastLocRef = useRef(null);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (status === 'in_progress') {
      const startTime = Date.now() - (tripStats.duration * 1000);
      interval = setInterval(() => {
        setTripStats(prev => ({
          ...prev,
          duration: Math.floor((Date.now() - startTime) / 1000)
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Target location (Pickup or Dropoff)
  const targetLocation = {
    latitude: status === 'pickup' ? (job?.pickupLocation?.lat || 47.9188) : (job?.dropoffLocation?.lat || 47.9188),
    longitude: status === 'pickup' ? (job?.pickupLocation?.lng || 106.9176) : (job?.dropoffLocation?.lng || 106.9176),
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // Alert.alert('Permission to access location was denied');
        return;
      }

      // Get initial location
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      // Watch location
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (loc) => {
           setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          // Calculate distance if in progress
          if (statusRef.current === 'in_progress') {
            if (lastLocRef.current) {
              const d = getDistanceFromLatLonInKm(
                lastLocRef.current.latitude,
                lastLocRef.current.longitude,
                loc.coords.latitude,
                loc.coords.longitude
              );
              // Only add if reasonable distance (e.g. > 5 meters to avoid jitter)
              if (d > 0.005) {
                setTripStats(prev => ({ ...prev, distance: prev.distance + d }));
                lastLocRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              }
            } else {
              lastLocRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }
          } else {
            lastLocRef.current = null;
          }
        }
      );
      return () => subscription.remove();
    })();
  }, []);

  const openNavigation = () => {
    const lat = status === 'pickup' ? job?.pickupLocation?.lat || 47.9188 : job?.dropoffLocation?.lat || 47.9188;
    const lng = status === 'pickup' ? job?.pickupLocation?.lng || 106.9176 : job?.dropoffLocation?.lng || 106.9176;
    const label = status === 'pickup' ? 'Pickup' : 'Dropoff';
    
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url);
  };

  const handleAction = async () => {
    if (!job?._id) {
      console.error('Missing job ID', job);
      Alert.alert('Алдаа', 'Аялалын мэдээлэл дутуу байна');
      return;
    }

    setLoading(true);
    try {
      if (status === 'pickup') {
        const response = await fetch(`${API_URL}/api/trip/${job._id}/start`, {
          method: 'POST',
        });
        if (response.ok) {
          setStatus('in_progress');
        } else {
          Alert.alert('Алдаа', 'Аялал эхлүүлж чадсангүй');
        }
      } else if (status === 'in_progress') {
        const response = await fetch(`${API_URL}/api/trip/${job._id}/complete`, {
          method: 'POST',
        });
        if (response.ok) {
          Alert.alert('Амжилттай', 'Аялал дууслаа!', [
            { text: 'OK', onPress: () => navigation.navigate('Main') }
          ]);
        } else {
          Alert.alert('Алдаа', 'Аялал дуусгаж чадсангүй');
        }
      }
    } catch (error) {
      console.error('Trip action error:', error);
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map} 
        customMapStyle={darkMapStyle}
        region={userLocation || {
          latitude: 47.9188,
          longitude: 106.9176,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        <Marker 
          coordinate={targetLocation} 
          pinColor={theme.colors.primary}
          title={status === 'pickup' ? 'Авах цэг' : 'Хүргэх цэг'}
          description={status === 'pickup' ? job?.pickupLocation?.address : job?.dropoffLocation?.address}
        />
      </MapView>

      <View style={styles.overlay}>
        <View style={styles.topContainer}>
           <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
             <Navigation size={24} color="#fff" />
             <Text style={styles.navText}>Чиглүүлэх</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.bottomSheet}>
          <PremiumCard>
            <View style={styles.customerHeader}>
              <View style={styles.customerInfo}>
                <Text style={styles.customerLabel}>Үйлчлүүлэгч</Text>
                <Text style={styles.customerName}>Зочин</Text>
                <Text style={{ ...theme.typography.h3, color: theme.colors.success, marginTop: 4, fontWeight: 'bold' }}>
                  ₮{(job?.price || 0).toLocaleString()}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.iconButton}>
                  <Phone size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton}>
                  <MessageCircle size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.divider} />

            <View style={styles.tripInfo}>
               <View style={styles.locationRow}>
                 <View style={[styles.dot, { backgroundColor: status === 'pickup' ? theme.colors.primary : theme.colors.textSecondary }]} />
                 <View style={styles.locationTextContainer}>
                    <Text style={styles.locationLabel}>{status === 'pickup' ? 'АВАХ ЦЭГ' : 'ХҮРГЭХ ЦЭГ'}</Text>
                    <Text style={styles.address}>
                      {status === 'pickup' ? job?.pickupLocation?.address || 'Авах байршил' : job?.dropoffLocation?.address || 'Хүргэх байршил'}
                    </Text>
                 </View>
               </View>
            </View>

            <View style={styles.spacer} />

            <GoldButton 
              title={status === 'pickup' ? 'АЯЛАЛ ЭХЛҮҮЛЭХ' : 'АЯЛАЛ ДУУСГАХ'}
              onPress={handleAction}
              loading={loading}
            />
          </PremiumCard>
        </View>
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
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    padding: theme.spacing.l,
    alignItems: 'flex-end',
  },
  navButton: {
    backgroundColor: theme.colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    borderRadius: 30,
    elevation: 5,
  },
  navText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: theme.spacing.s,
  },
  bottomSheet: {
    padding: theme.spacing.m,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  customerLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  customerName: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  rating: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
  },
  iconButton: {
    backgroundColor: theme.colors.surfaceLight,
    padding: 12,
    borderRadius: 25,
    marginLeft: theme.spacing.s,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surfaceLight,
    padding: 8,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  statItem: {
    marginHorizontal: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.m,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: theme.spacing.m,
  },
  locationLabel: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
  address: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    marginTop: 2,
  },
  spacer: {
    height: theme.spacing.l,
  },
});
