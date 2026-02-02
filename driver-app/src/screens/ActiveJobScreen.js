import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform, Image, Dimensions, SafeAreaView } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { io } from 'socket.io-client';
import { Navigation, Phone, MessageCircle, Car, MapPin, User, ChevronRight, ShieldCheck, Clock, CheckCircle, Locate } from 'lucide-react-native';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { API_URL } from '../config';
import { theme } from '../constants/theme';

const { width, height } = Dimensions.get('window');

// Modern Dark Map Style
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
  const [isFollowing, setIsFollowing] = useState(true);
  const mapRef = useRef(null);
  const recenterTimeoutRef = useRef(null);

  // Auto-follow logic REMOVED - Controlled by Location Subscription
  /*
  useEffect(() => {
    if (userLocation && mapRef.current && isFollowing) {
      mapRef.current.animateCamera({
        center: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
        heading: userLocation.heading || 0,
        pitch: 50,
        zoom: 18,
      }, { duration: 1000 });
    }
  }, [userLocation, isFollowing]);
  */

  const toggleFollow = () => {
    setIsFollowing(true);
    if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
  };

  const startRecenterTimer = () => {
    if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
    recenterTimeoutRef.current = setTimeout(() => {
      setIsFollowing(true);
    }, 5000); // 5 seconds delay
  };

  const handlePanDrag = () => {
      setIsFollowing(false);
      if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
  };

  const statusRef = useRef(status);
  const lastLocRef = useRef(null);
  const lastRouteFetchRef = useRef(null);
  const socketRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    statusRef.current = status;
    if (userLocation && targetLocation && mapRef.current) {
        setTimeout(() => fitMapToRoute(), 500);
    }
  }, [status]);

  const fitMapToRoute = () => {
    if (!userLocation || !targetLocation || !mapRef.current) return;

    const markers = [
      { latitude: userLocation.latitude, longitude: userLocation.longitude },
      { latitude: targetLocation.latitude, longitude: targetLocation.longitude }
    ];

    mapRef.current.fitToCoordinates(markers, {
      edgePadding: { top: 120, right: 50, bottom: 400, left: 50 },
      animated: true,
    });
  };

  useEffect(() => {
    socketRef.current = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
    });
    if (driverId) {
      socketRef.current.emit('driverJoin', driverId);
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [driverId]);

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
    const R = 6371;
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

  const targetLocation = {
    latitude: status === 'pickup' ? (job?.pickupLocation?.lat || 47.9188) : (job?.dropoffLocation?.lat || 47.9188),
    longitude: status === 'pickup' ? (job?.pickupLocation?.lng || 106.9176) : (job?.dropoffLocation?.lng || 106.9176),
  };

  useEffect(() => {
    if (userLocation && targetLocation) {
      let shouldFetch = true;
      if (lastRouteFetchRef.current) {
          const dist = getDistanceFromLatLonInKm(
              userLocation.latitude, userLocation.longitude,
              lastRouteFetchRef.current.latitude, lastRouteFetchRef.current.longitude
          );
          if (dist < 0.05) shouldFetch = false;
      }

      if (shouldFetch) {
          fetchRoute(userLocation, targetLocation);
          lastRouteFetchRef.current = { latitude: userLocation.latitude, longitude: userLocation.longitude };
      }
    }
  }, [userLocation?.latitude, userLocation?.longitude, targetLocation.latitude, targetLocation.longitude]);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      let location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        (loc) => {
           setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            heading: loc.coords.heading,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });

          if (socketRef.current && driverId) {
            const vehicle = driverInfo?.vehicle || {};
            socketRef.current.emit('driverLocationUpdated', {
              driverId,
              location: { 
                lat: loc.coords.latitude, 
                lng: loc.coords.longitude,
                heading: loc.coords.heading,
                plateNumber: vehicle.plateNumber,
                vehicleModel: vehicle.model,
                vehicleColor: vehicle.color
              }
            });
          }

          if (statusRef.current === 'in_progress') {
            if (lastLocRef.current) {
              const d = getDistanceFromLatLonInKm(
                lastLocRef.current.latitude,
                lastLocRef.current.longitude,
                loc.coords.latitude,
                loc.coords.longitude
              );
              if (d > 0.005) {
                setTripStats(prev => ({ ...prev, distance: prev.distance + d }));
                lastLocRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
              }
            } else {
              lastLocRef.current = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            }
          }

          // Auto-follow logic
          if (isFollowing && mapRef.current) {
             mapRef.current.animateCamera({
                center: { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
                heading: loc.coords.heading || 0,
                pitch: 45, // Add some pitch for 3D feel
                zoom: 17
             }, { duration: 500 });
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
    if (!job?._id) return;
    setLoading(true);
    try {
      if (status === 'pickup') {
        const response = await fetch(`${API_URL}/api/trip/${job._id}/start`, {
          method: 'POST',
        });
        if (response.ok) {
          setStatus('in_progress');
          if (socketRef.current) socketRef.current.emit('tripStarted', { tripId: job._id });
        }
      } else if (status === 'in_progress') {
        const response = await fetch(`${API_URL}/api/trip/${job._id}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            distance: tripStats.distance,
            duration: tripStats.duration
          }),
        });
        const data = await response.json();
        if (response.ok) {
          if (socketRef.current) socketRef.current.emit('tripCompleted', { tripId: job._id });
          Alert.alert(
            'Аялал амжилттай', 
            `Төлбөр: ${data.price?.toLocaleString() || job.price?.toLocaleString()}₮`, 
            [{ text: 'OK', onPress: () => navigation.navigate('Main') }]
          );
        }
      }
    } catch (error) {
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
        showsUserLocation={false}
        followsUserLocation={false}
        onMapReady={() => {
            setIsMapReady(true);
            // Initial fit
            fitMapToRoute();
        }}
        onPanDrag={handlePanDrag}
        onRegionChangeComplete={(region, details) => {
            if (!isFollowing && details?.isGesture) {
                startRecenterTimer();
            }
        }}
      >
        {userLocation && (
          <Marker 
            coordinate={userLocation} 
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={(userLocation.heading || 0) + (Platform.OS === 'ios' ? 0 : -90)} // iOS respects EXIF orientation (Up), Android needs adjustment (Right)
            flat={true}
          >
             <View style={styles.carMarkerContainer}>
               {/* 3D Realistic Tow Truck Marker */}
               <View style={[styles.carMarkerGlow, { width: 40, height: 40, borderRadius: 20, opacity: 0.5 }]} />
               <Image 
                  source={require('../../assets/tow-truck.png')}
                  style={{ width: 60, height: 60, resizeMode: 'contain' }}
               />
             </View>
          </Marker>
        )}

        <Marker 
          coordinate={targetLocation} 
        >
           <View style={styles.destinationMarker}>
             <View style={styles.destinationIcon}>
                <MapPin size={20} color="#FFF" fill="#FFF" />
             </View>
             <View style={styles.destinationArrow} />
           </View>
        </Marker>
        
        {userLocation && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={5}
            strokeColor={theme.colors.primary}
            lineDashPattern={[0]}
          />
        )}
      </MapView>

      <SafeAreaView style={styles.overlay}>
        {/* Top Floating Header */}
        <View style={styles.topContainer}>
           <View style={styles.statusPill}>
             <View style={[styles.statusDot, { backgroundColor: status === 'pickup' ? '#F59E0B' : '#10B981' }]} />
             <Text style={styles.statusText}>
               {status === 'pickup' ? 'ЗОРЧИГЧИЙГ АВАХ' : 'АЯЛАЛ ЭХЭЛСЭН'}
             </Text>
           </View>

           <TouchableOpacity style={styles.navButton} onPress={openNavigation}>
             <Navigation size={20} color="#1A1A1A" />
             <Text style={styles.navText}>Чиглүүлэх</Text>
           </TouchableOpacity>
        </View>

        {/* Recenter Button */}
        {!isFollowing && (
            <TouchableOpacity style={styles.recenterBtn} onPress={toggleFollow}>
                <Locate size={24} color="#FFF" />
            </TouchableOpacity>
        )}

        {/* Floating Cockpit Panel */}
        <View style={styles.bottomPanelWrapper}>
          <LinearGradient
            colors={['rgba(30,30,30,0.95)', 'rgba(10,10,10,1)']}
            style={styles.cockpitPanel}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          >
            {/* Handle Bar */}
            <View style={styles.handleBar} />

            {/* Customer Card */}
            <View style={styles.customerCard}>
               <View style={styles.customerAvatar}>
                  <User size={24} color="#FFF" />
               </View>
               <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{job?.customerName || 'Зочин'}</Text>
                  <Text style={styles.tripPrice}>₮{(job?.price || 0).toLocaleString()}</Text>
               </View>
               
               <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.msgBtn]}
                    onPress={() => Alert.alert('Message', 'Coming soon')}
                  >
                    <MessageCircle size={20} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => job?.customerPhone ? Linking.openURL(`tel:${job.customerPhone}`) : Alert.alert('Info', 'No phone number')}
                  >
                    <Phone size={20} color="#FFF" />
                  </TouchableOpacity>
               </View>
            </View>

            {/* Trip Stats */}
            {status === 'in_progress' && (
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Clock size={14} color="#888" />
                  <Text style={styles.statValue}>{formatTime(tripStats.duration)}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Navigation size={14} color="#888" />
                  <Text style={styles.statValue}>{tripStats.distance.toFixed(2)} км</Text>
                </View>
              </View>
            )}

            {/* Address Info */}
            <View style={styles.addressContainer}>
               <View style={styles.addressRow}>
                  <View style={[styles.timelineDot, { backgroundColor: status === 'pickup' ? theme.colors.primary : '#555' }]} />
                  <View style={styles.addressContent}>
                    <Text style={styles.addressLabel}>{status === 'pickup' ? 'АВАХ ЦЭГ' : 'ХҮРГЭХ ЦЭГ'}</Text>
                    <Text style={styles.addressText} numberOfLines={2}>
                      {status === 'pickup' ? job?.pickupLocation?.address : job?.dropoffLocation?.address}
                    </Text>
                  </View>
               </View>
            </View>

            {/* Main Action Button */}
            <TouchableOpacity 
              style={styles.mainButtonContainer}
              onPress={handleAction}
              disabled={loading}
            >
              <LinearGradient
                colors={status === 'pickup' ? [theme.colors.primary, '#F59E0B'] : ['#10B981', '#059669']}
                style={styles.mainButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#1A1A1A" />
                ) : (
                  <>
                    <Text style={styles.mainButtonText}>
                      {status === 'pickup' ? 'АЯЛАЛ ЭХЛҮҮЛЭХ' : 'АЯЛАЛ ДУУСГАХ'}
                    </Text>
                    <View style={styles.iconCircle}>
                      <ChevronRight size={24} color={status === 'pickup' ? theme.colors.primary : '#10B981'} />
                    </View>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </LinearGradient>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  recenterBtn: {
    position: 'absolute',
    right: 20,
    top: 100,
    backgroundColor: 'rgba(30,30,30,0.9)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  navText: {
    color: '#1A1A1A',
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 12,
  },
  bottomPanelWrapper: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
  },
  cockpitPanel: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 12,
    borderRadius: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tripPrice: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBtn: {
    backgroundColor: '#333',
  },
  callBtn: {
    backgroundColor: '#059669',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 10,
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 20,
  },
  statValue: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: '600',
  },
  addressContainer: {
    marginBottom: 24,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  addressContent: {
    flex: 1,
  },
  addressLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 4,
  },
  addressText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '500',
  },
  mainButtonContainer: {
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  mainButton: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingLeft: 24,
  },
  mainButtonText: {
    color: '#1A1A1A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carMarkerGlow: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    opacity: 0.3,
  },
  destinationMarker: {
    alignItems: 'center',
  },
  destinationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  destinationArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: theme.colors.primary,
    marginTop: -2,
  },
});
