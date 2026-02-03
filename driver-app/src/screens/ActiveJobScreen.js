import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking, Platform, Image, Dimensions, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { job: paramJob, trip: paramTrip, driverId, driverInfo, mapMode = 'dark', showsTraffic = false } = route.params || {};
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
    
    // Animate immediately if we have location
    if (userLocation && mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
        heading: userLocation.heading || 0,
        pitch: 45,
        zoom: 17
      }, { duration: 500 });
    }
  };

  const startRecenterTimer = (delayMs) => {
    const d = typeof delayMs === 'number' ? delayMs : (statusRef.current === 'in_progress' ? 1500 : 5000);
    if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
    recenterTimeoutRef.current = setTimeout(() => {
      setIsFollowing(true);
    }, d);
  };

  const handlePanDrag = () => {
      // User is manually moving the map - stop following
      setIsFollowing(false);
      if (recenterTimeoutRef.current) clearTimeout(recenterTimeoutRef.current);
      // Optional: Auto-recenter after 10 seconds of inactivity if in progress
      if (statusRef.current === 'in_progress') {
         startRecenterTimer(10000);
      } else {
         startRecenterTimer();
      }
  };

  const statusRef = useRef(status);
  const isFollowingRef = useRef(isFollowing);
  const lastLocRef = useRef(null);
  const lastRouteFetchRef = useRef(null);
  const socketRef = useRef(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const hasPerformedInitialFit = useRef(false);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    statusRef.current = status;
    // Reset initial fit flag when status changes so we can re-fit to new route
    hasPerformedInitialFit.current = false;
  }, [status]);

  // Handle Initial Map Fitting when Location/Map becomes ready
  useEffect(() => {
    if (isMapReady && userLocation && mapRef.current && !hasPerformedInitialFit.current) {
      if ((status === 'pickup' || status === 'in_progress') && targetLocation) {
        
        // Data validation for dropoff
        if (status === 'in_progress' && (!job?.dropoffLocation || !job.dropoffLocation.lat)) {
          Alert.alert("Анхаар", "Хүргэх хаягийн байршил тодорхойгүй байна.");
        }

        // Temporarily disable auto-follow to show the full route
        setIsFollowing(false); 
        fitMapToRoute();
        
        // Resume auto-follow after 4 seconds
        setTimeout(() => {
          setIsFollowing(true);
        }, 4000);
      } else {
        // Just center on user if no specific route logic
        mapRef.current.animateCamera({
          center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
          heading: userLocation.heading || 0,
          pitch: 45,
          zoom: 17
        }, { duration: 500 });
      }
      hasPerformedInitialFit.current = true;
    }
  }, [isMapReady, userLocation, status]);

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
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
      autoConnect: true,
    });
    if (driverId) {
      socketRef.current.emit('driverJoin', driverId);
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [driverId]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (statusRef.current === 'pickup' || statusRef.current === 'in_progress') {
        e.preventDefault();
        Alert.alert('Анхаар', 'Ажил идэвхтэй байна. Дэлгэцийг солих боломжгүй.');
      }
    });
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (statusRef.current === 'pickup' || statusRef.current === 'in_progress') {
        return true;
      }
      return false;
    });
    const parent = navigation.getParent && navigation.getParent();
    let unsubTab;
    if (parent && parent.addListener) {
      unsubTab = parent.addListener('tabPress', (e) => {
        if (statusRef.current === 'pickup' || statusRef.current === 'in_progress') {
          e.preventDefault();
        }
      });
    }
    return () => {
      unsubscribe && unsubscribe();
      backSub && backSub.remove();
      unsubTab && unsubTab();
    };
  }, [navigation]);

  // Listen for admin/backend status updates and reflect in UI
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const jobId = job?._id;
    const onJobUpdated = (updatedTrip) => {
      try {
        if (String(updatedTrip._id) !== String(jobId)) return;
        const tripDriverId = typeof updatedTrip.driver === 'string' ? updatedTrip.driver : (updatedTrip.driver?._id || updatedTrip.driver?.id);
        if (driverId && String(tripDriverId) !== String(driverId)) return;
        if (updatedTrip.status === 'accepted') {
          setStatus('pickup');
        } else if (updatedTrip.status === 'in_progress') {
          setStatus('in_progress');
        } else if (updatedTrip.status === 'completed') {
          setStatus('completed');
          navigation.navigate('Main');
        } else if (updatedTrip.status === 'cancelled') {
          setStatus('completed');
          Alert.alert('Цуцлагдсан', 'Аялал цуцлагдлаа.', [
            { text: 'OK' }
          ]);
        }
      } catch (e) {}
    };
    const onTripStarted = ({ tripId }) => {
      if (String(tripId) === String(jobId)) setStatus('in_progress');
    };
    const onTripCompleted = ({ tripId }) => {
      if (String(tripId) === String(jobId)) {
        setStatus('completed');
        navigation.navigate('Main');
      }
    };
    socket.on('jobUpdated', onJobUpdated);
    socket.on('tripStarted', onTripStarted);
    socket.on('tripCompleted', onTripCompleted);
    return () => {
      socket.off('jobUpdated', onJobUpdated);
      socket.off('tripStarted', onTripStarted);
      socket.off('tripCompleted', onTripCompleted);
    };
  }, [job?._id, driverId]);

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
  const getBearing = (lat1, lon1, lat2, lon2) => {
    const p1 = lat1 * (Math.PI / 180);
    const p2 = lat2 * (Math.PI / 180);
    const dl = (lon2 - lon1) * (Math.PI / 180);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    const t = Math.atan2(y, x);
    return (t * (180 / Math.PI) + 360) % 360;
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
    let subscription;

    const startLocationTracking = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const handleLocationUpdate = (loc) => {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        let heading = loc.coords.heading;
        
        if ((heading === null || typeof heading === 'undefined') && lastLocRef.current) {
          heading = getBearing(lastLocRef.current.latitude, lastLocRef.current.longitude, lat, lng);
        }
        
        setUserLocation({
          latitude: lat,
          longitude: lng,
          heading,
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
              lat,
              lng
            );
            if (d > 0.003) {
              setTripStats(prev => ({ ...prev, distance: prev.distance + d }));
              lastLocRef.current = { latitude: lat, longitude: lng };
            }
          } else {
            lastLocRef.current = { latitude: lat, longitude: lng };
          }
        }

        // Auto-follow logic using Ref to avoid stale closure
        if (isFollowingRef.current && mapRef.current) {
           mapRef.current.animateCamera({
              center: { latitude: lat, longitude: lng },
              heading: heading || 0,
              pitch: 45,
              zoom: 17
           }, { duration: 500 });
        }
      };

      // 1. Start Watcher IMMEDIATELY (Parallel)
      Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 5,
        },
        handleLocationUpdate
      ).then(sub => subscription = sub);

      // 2. Try to get current position once (Parallel)
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest })
        .then(loc => {
           handleLocationUpdate(loc);
        })
        .catch(e => console.log("Initial location error:", e));
    };

    startLocationTracking();

    return () => {
      if (subscription) subscription.remove();
    };
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
          setStatus('completed');
          navigation.navigate('Main');
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
        customMapStyle={mapMode === 'dark' ? darkMapStyle : []}
        mapType={mapMode === 'hybrid' ? 'hybrid' : 'standard'}
        showsTraffic={showsTraffic}
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
            if (status === 'pickup') {
              fitMapToRoute();
            } else if (userLocation && mapRef.current) {
              mapRef.current.animateCamera({
                center: { latitude: userLocation.latitude, longitude: userLocation.longitude },
                heading: userLocation.heading || 0,
                pitch: 45,
                zoom: 17
              }, { duration: 500 });
            }
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

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top Floating Header */}
        <View style={styles.topContainer} pointerEvents="box-none">
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
        <View style={styles.bottomPanelWrapper} pointerEvents="box-none">
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
