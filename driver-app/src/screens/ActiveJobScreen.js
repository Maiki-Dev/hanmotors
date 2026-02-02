import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform, Image } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
// import MapViewDirections from 'react-native-maps-directions';
import { io } from 'socket.io-client';
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
  const { job: paramJob, trip: paramTrip, driverId, driverInfo } = route.params || {};
  const job = paramJob || paramTrip;

  const [status, setStatus] = useState(
    job?.status === 'in_progress' ? 'in_progress' : 'pickup'
  );
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [tripStats, setTripStats] = useState({ duration: 0, distance: 0 });
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const mapRef = useRef(null);
  const statusRef = useRef(status);
  const lastLocRef = useRef(null);
  const socketRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    statusRef.current = status;
    // Fit map when status changes
    if (userLocation && targetLocation && mapRef.current) {
        setTimeout(() => fitMapToRoute(), 500);
    }
  }, [status]);

  // Fit map to show both user and target
  const fitMapToRoute = () => {
    if (!userLocation || !targetLocation || !mapRef.current) return;

    const markers = [
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: targetLocation.latitude, longitude: targetLocation.longitude }
    ];

    mapRef.current.fitToCoordinates(markers, {
      edgePadding: { top: 100, right: 50, bottom: 350, left: 50 }, // Bottom padding for sheet
      animated: true,
    });
  };


  // Socket connection
  useEffect(() => {
    socketRef.current = io(API_URL);
    if (driverId) {
      socketRef.current.emit('driverJoin', driverId);
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [driverId]);

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

  const fetchRoute = async (start, end) => {
    if (!start || !end) return;
    try {
      // Using OSRM for routing (Open Source Routing Machine) - Free
      const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson`);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoordinates(coords);
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  // Target location (Pickup or Dropoff)
  const targetLocation = {
    latitude: status === 'pickup' ? (job?.pickupLocation?.lat || 47.9188) : (job?.dropoffLocation?.lat || 47.9188),
    longitude: status === 'pickup' ? (job?.pickupLocation?.lng || 106.9176) : (job?.dropoffLocation?.lng || 106.9176),
  };

  // Fetch route when locations change
  useEffect(() => {
    if (userLocation && targetLocation) {
      // Simple throttle: only fetch if significant change or first time? 
      // For now, let's just fetch. OSRM is fast.
      // But to avoid too many requests during driving, maybe check distance?
      // Or rely on the fact that userLocation updates every 2s.
      fetchRoute(userLocation, targetLocation);
    }
  }, [userLocation?.latitude, userLocation?.longitude, targetLocation.latitude, targetLocation.longitude]);

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

      // Watch location with High Accuracy (Uber Standard: 1-2s interval, 5m filter)
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // 1 second
          distanceInterval: 5, // 5 meters
        },
        (loc) => {
           setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          // Emit location update
          if (socketRef.current && driverId) {
            const vehicle = driverInfo?.vehicle || {};
            socketRef.current.emit('driverLocationUpdated', {
              driverId,
              location: { 
                lat: loc.coords.latitude, 
                lng: loc.coords.longitude,
                plateNumber: vehicle.plateNumber,
                vehicleModel: vehicle.model,
                vehicleColor: vehicle.color
              }
            });
          }

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
          if (socketRef.current) socketRef.current.emit('tripStarted', { tripId: job._id });
        } else {
          Alert.alert('Алдаа', 'Аялал эхлүүлж чадсангүй');
        }
      } else if (status === 'in_progress') {
        const response = await fetch(`${API_URL}/api/trip/${job._id}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            distance: tripStats.distance,
            duration: tripStats.duration
          }),
        });
        const data = await response.json();
        
        if (response.ok) {
          // Stop tracking
          if (socketRef.current) socketRef.current.emit('tripCompleted', { tripId: job._id });
          
          Alert.alert(
            'Аялал амжилттай', 
            `Төлбөр: ${data.price?.toLocaleString() || job.price?.toLocaleString()}₮\nЗай: ${tripStats.distance.toFixed(1)} км`, 
            [
              { text: 'OK', onPress: () => navigation.navigate('Main') }
            ]
          );
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <View style={styles.container}>
      <MapView 
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map} 
        customMapStyle={darkMapStyle}
        initialRegion={{
          latitude: 47.9188,
          longitude: 106.9176,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        followsUserLocation={false} // Disabled to prevent fighting with fitToCoordinates
        onMapReady={() => {
            setIsMapReady(true);
            fitMapToRoute();
        }}
      >
        {userLocation && (
          <Marker 
            coordinate={userLocation} 
            anchor={{ x: 0.5, y: 0.5 }}
          >
             <Image 
               source={require('../../assets/car_icon.png')} 
               style={{ width: 40, height: 40, resizeMode: 'contain' }}
             />
          </Marker>
        )}

        <Marker 
          coordinate={targetLocation} 
          pinColor={theme.colors.primary}
          title={status === 'pickup' ? 'Авах цэг' : 'Хүргэх цэг'}
          description={status === 'pickup' ? job?.pickupLocation?.address : job?.dropoffLocation?.address}
        />
        
        {userLocation && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor={theme.colors.primary}
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        <View style={styles.topContainer}>
           <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
             <Navigation size={24} color="#fff" />
             <Text style={styles.navText}>Чиглүүлэх</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.bottomSheet}>
          {status === 'in_progress' && (
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ХУГАЦАА</Text>
                <Text style={styles.statValue}>{formatTime(tripStats.duration)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>ЗАЙ</Text>
                <Text style={styles.statValue}>{tripStats.distance.toFixed(2)} км</Text>
              </View>
            </View>
          )}

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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: 20,
    opacity: 0.3,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
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
