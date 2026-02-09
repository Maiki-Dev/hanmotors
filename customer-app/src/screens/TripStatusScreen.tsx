import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Platform, Animated, Linking, PanResponder, ScrollView, TextInput, StatusBar } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { Phone, MessageCircle, Star, Shield, ArrowLeft, MapPin, User, X, Zap, Circle, Clock } from 'lucide-react-native';
import { socket } from '../services/socket';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mapStyle } from '../constants/mapStyle';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');
const BOTTOM_SHEET_MIN_HEIGHT = 350;
const BOTTOM_SHEET_MAX_HEIGHT = height * 0.8;

const TripStatusScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  
  const [trip, setTrip] = useState(route.params?.trip);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<any[]>([]);
  
  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Bottom Sheet Animations
  const panY = useRef(new Animated.Value(0)).current;
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const isCancelling = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (sheetExpanded) {
            // If expanded, allow dragging down (positive dy)
            if (gestureState.dy > 0) {
                panY.setValue(gestureState.dy);
            }
        } else {
            // If collapsed, allow dragging up (negative dy)
            if (gestureState.dy < 0) {
                panY.setValue(gestureState.dy);
            }
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (sheetExpanded) {
            // If dragging down significantly, collapse
            if (gestureState.dy > 100) {
                collapseSheet();
            } else {
                expandSheet();
            }
        } else {
            // If dragging up significantly, expand
            if (gestureState.dy < -100) {
                expandSheet();
            } else {
                collapseSheet();
            }
        }
      }
    })
  ).current;

  const expandSheet = () => {
    Animated.spring(panY, {
      toValue: -(BOTTOM_SHEET_MAX_HEIGHT - BOTTOM_SHEET_MIN_HEIGHT),
      useNativeDriver: false,
      friction: 8
    }).start(() => setSheetExpanded(true));
  };

  const collapseSheet = () => {
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: false,
      friction: 8
    }).start(() => setSheetExpanded(false));
  };

  useEffect(() => {
    if (trip?.status === 'pending') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else if (trip?.status === 'cancelled') {
        if (!isCancelling.current) {
            Alert.alert('Аялал цуцлагдлаа', 'Жолооч эсвэл систем аяллыг цуцалсан байна.', [
                { text: 'ОК', onPress: () => navigation.navigate('HomeTab') }
            ]);
            const timer = setTimeout(() => {
                navigation.navigate('HomeTab');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }
  }, [trip?.status]);

  const fetchTripDetails = async () => {
    if (!user?._id) return;
    try {
      const response = await rideService.getActiveTrip(user._id);
      if (response.data && response.data._id === trip._id) {
         setTrip(response.data);
      }
    } catch (error) {
      console.log('Error fetching trip details', error);
    }
  };

  useEffect(() => {
    if (!trip?._id) return;
    if (!socket) return;
    
    const handleTripUpdate = (updatedTrip: any) => {
      if (updatedTrip._id === trip._id) {
        setTrip(updatedTrip);
      }
    };

    const handleDriverAccepted = (data: any) => {
      if (data.tripId === trip._id) {
        fetchTripDetails();
      }
    };

    const handleDriverLocation = (data: any) => {
        if (trip.driver && data.driverId === trip.driver._id) {
            setDriverLocation(data.location);
        }
    };

    const handleTripCompleted = (data: any) => {
        if (data.tripId === trip._id) {
            Alert.alert('Аялал дууслаа', 'Та зорьсон газартаа ирлээ.', [
                { text: 'ОК', onPress: () => navigation.navigate('HomeTab') }
            ]);
        }
    };

    const handleTripStarted = (data: any) => {
        if (data.tripId === trip._id) {
            setTrip((prev: any) => ({ ...prev, status: 'in_progress' }));
            fetchTripDetails();
        }
    };

    socket.on('tripUpdated', handleTripUpdate);
    socket.on('driverAccepted', handleDriverAccepted);
    socket.on('driverLocationUpdated', handleDriverLocation); 
    socket.on('tripCompleted', handleTripCompleted);
    socket.on('tripStarted', handleTripStarted);

    return () => {
      if (socket) {
        socket.off('tripUpdated', handleTripUpdate);
        socket.off('driverAccepted', handleDriverAccepted);
        socket.off('driverLocationUpdated', handleDriverLocation);
        socket.off('tripCompleted', handleTripCompleted);
        socket.off('tripStarted', handleTripStarted);
      }
    };
  }, [trip, user]);

  // OSRM Route Fetching
  useEffect(() => {
    if (trip?.pickupLocation && trip?.dropoffLocation) {
        const fetchRoute = async () => {
            try {
                // Using OSRM public demo server
                const response = await fetch(
                    `http://router.project-osrm.org/route/v1/driving/${trip.pickupLocation.lng},${trip.pickupLocation.lat};${trip.dropoffLocation.lng},${trip.dropoffLocation.lat}?overview=full&geometries=geojson`
                );
                const result = await response.json();
                if (result.code === 'Ok' && result.routes.length) {
                    const points = result.routes[0].geometry.coordinates.map((arr: number[]) => ({
                        latitude: arr[1],
                        longitude: arr[0]
                    }));
                    setRouteCoordinates(points);
                }
            } catch (error) {
                console.error("OSRM Route fetch error:", error);
            }
        };
        fetchRoute();
    }
  }, [trip?.pickupLocation, trip?.dropoffLocation]);

  useEffect(() => {
    if (trip && mapRef.current) {
        const coordinates = [
            { latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng },
            { latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }
        ];
        
        if (driverLocation) {
            coordinates.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
        }

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: BOTTOM_SHEET_MIN_HEIGHT + 50, left: 50 },
            animated: true,
        });
    }
  }, [trip, driverLocation]);

  const getStatusMessage = () => {
    switch (trip.status) {
      case 'pending': return 'Жолооч хайж байна...';
      case 'accepted': return 'Жолооч тань руу ирж байна ...';
      case 'in_progress': return 'Аялал эхэллээ';
      case 'completed': return 'Аялал дууслаа';
      case 'cancelled': return 'Аялал цуцлагдлаа';
      default: return 'Түр хүлээнэ үү...';
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Аялал цуцлах',
      'Та аялал цуцлахдаа итгэлтэй байна уу?',
      [
        { text: 'Үгүй', style: 'cancel' },
        { 
          text: 'Тийм, цуцлах', 
          style: 'destructive',
          onPress: async () => {
            isCancelling.current = true;
            try {
              await rideService.cancelTrip(trip._id);
              navigation.navigate('HomeTab');
            } catch (error) {
              isCancelling.current = false;
              Alert.alert('Алдаа', 'Аялал цуцлахад алдаа гарлаа');
            }
          }
        }
      ]
    );
  };

  const renderDriverInfo = () => {
    if (!trip.driver && trip.status === 'pending') {
      return (
        <View style={styles.searchingContainer}>
            <Animated.View style={[styles.searchingAnimation, { transform: [{ scale: pulseAnim }] }]}>
                <View style={styles.radarCircle}>
                   <ActivityIndicator size="large" color={theme.colors.text} />
                </View>
            </Animated.View>
            <Text style={styles.searchingText}>Ойр хавьд жолооч хайж байна...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <X size={20} color={theme.colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.cancelText}>Захиалга цуцлах</Text>
            </TouchableOpacity>
        </View>
      );
    }

    const driverName = trip.driver?.name || "Жолооч";
    const vehicleColor = trip.driver?.vehicle?.color || "Хар";
    const vehicleModel = trip.driver?.vehicle?.model || "Toyota Prius";
    const plateNumber = trip.driver?.vehicle?.plateNumber || "---";

    return (
      <View style={styles.driverContent}>
        
        {/* Header Status */}
        <View style={styles.statusHeader}>
            <View style={styles.dragIndicator} />
            <Text style={styles.statusTitle}>{getStatusMessage()}</Text>
            <View style={styles.timeContainer}>
                <Clock size={12} color={theme.colors.textSecondary} style={{marginRight: 4}} />
                <Text style={styles.statusTime}>1 мин 8 сек • 313м</Text>
            </View>
        </View>

        {/* Car & Driver Card */}
        <View style={styles.driverCard}>
             <View style={styles.vehicleRow}>
                <View>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={[styles.colorDot, {backgroundColor: theme.colors.primary}]} />
                        <Text style={styles.vehicleText}>{vehicleColor}</Text>
                    </View>
                    <Text style={styles.vehicleModelText}>{vehicleModel}</Text>
                </View>
                <View style={styles.plateContainer}>
                    <Text style={styles.plateNumber}>{plateNumber}</Text>
                </View>
             </View>

             <View style={styles.divider} />

             <View style={styles.driverProfileRow}>
                 <View style={styles.driverAvatarContainer}>
                    <Text style={styles.driverInitials}>{driverName.charAt(0)}</Text>
                 </View>
                 <View style={styles.driverNameContainer}>
                    <Text style={styles.driverName}>{driverName}</Text>
                    <View style={styles.ratingContainer}>
                        <Star size={14} color="#FFD700" fill="#FFD700" />
                        <Text style={styles.ratingText}>5.0</Text>
                    </View>
                 </View>
                 
                 <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.roundButton} onPress={() => {
                        const phone = trip.driver?.phone;
                        if(phone) Linking.openURL(`tel:${phone}`);
                    }}>
                        <Phone size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.roundButton, {backgroundColor: theme.colors.surfaceLight}]}>
                         <MessageCircle size={20} color={theme.colors.text} />
                    </TouchableOpacity>
                 </View>
             </View>

             <View style={styles.messageInputContainer}>
                <View style={styles.messageInputWrapper}>
                    <MessageCircle size={20} color={theme.colors.textSecondary} />
                    <TextInput 
                        placeholder="Жолооч руу зурвас бичих ..." 
                        placeholderTextColor={theme.colors.textSecondary}
                        style={styles.messageInput} 
                        editable={false} 
                    />
                </View>
             </View>
        </View>

        {/* Trip Details (Visible when expanded) */}
        <View style={styles.tripDetailsContainer}>
            <Text style={styles.sectionTitle}>Миний аялал</Text>
            
            <View style={styles.timelineContainer}>
                <View style={styles.locationRow}>
                    <View style={styles.locationIconContainer}>
                        <View style={[styles.locationDot, { backgroundColor: theme.colors.success }]} />
                        <View style={styles.verticalLine} />
                    </View>
                    <View style={styles.locationTextContainer}>
                        <Text style={styles.locationLabel}>Суух хаяг</Text>
                        <Text style={styles.locationValue} numberOfLines={1}>{trip.pickupLocation.address}</Text>
                    </View>
                </View>

                <View style={styles.locationRow}>
                     <View style={styles.locationIconContainer}>
                         <View style={[styles.locationDot, { backgroundColor: theme.colors.error }]} />
                    </View>
                    <View style={styles.locationTextContainer}>
                        <Text style={styles.locationLabel}>Буух хаяг</Text>
                        <Text style={styles.locationValue} numberOfLines={1}>{trip.dropoffLocation.address}</Text>
                    </View>
                </View>
            </View>
            
            <View style={{marginTop: 20}}>
                <Text style={styles.sectionTitle}>Төлбөр</Text>
                <View style={styles.paymentRow}>
                    <Text style={styles.paymentLabel}>Нийт төлбөр</Text>
                    <Text style={styles.paymentValue}>{trip.price}₮</Text>
                </View>
            </View>

        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        <View style={[styles.header, { top: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={styles.backButton}>
                <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
        </View>

        <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            // customMapStyle={mapStyle}
            showsTraffic={true}
            initialRegion={{
                latitude: trip.pickupLocation.lat,
                longitude: trip.pickupLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
        >
            <Marker coordinate={{ latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerIcon, { backgroundColor: theme.colors.success }]}>
                        <MapPin color="white" size={20} />
                    </View>
                </View>
            </Marker>
            
            <Marker coordinate={{ latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerIcon, { backgroundColor: theme.colors.error }]}>
                        <MapPin color="white" size={20} />
                    </View>
                </View>
            </Marker>

            {driverLocation && (
                 <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}>
                     <View style={styles.driverMarker}>
                        <Image 
                            source={require('../../assets/car_icon.png')} 
                            style={{ width: 40, height: 40, resizeMode: 'contain' }} 
                        />
                     </View>
                 </Marker>
            )}

            {routeCoordinates.length > 0 ? (
                <Polyline
                    coordinates={routeCoordinates}
                    strokeWidth={5}
                    strokeColor="#FFD700"
                />
            ) : (
                <Polyline
                    coordinates={[
                        { latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng },
                        { latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }
                    ]}
                    strokeWidth={5}
                    strokeColor="#FFD700"
                    lineDashPattern={[10, 10]}
                />
            )}
        </MapView>

        <Animated.View 
            style={[
                styles.bottomSheetContainer, 
                { 
                    height: BOTTOM_SHEET_MAX_HEIGHT,
                    transform: [{ translateY: panY }]
                }
            ]}
            {...panResponder.panHandlers}
        >
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <ScrollView 
                contentContainerStyle={styles.bottomSheetBlur}
                scrollEnabled={sheetExpanded}
                showsVerticalScrollIndicator={false}
            >
                {renderDriverInfo()}
            </ScrollView>
        </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    position: 'absolute',
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  map: {
    flex: 1,
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 20,
    backgroundColor: 'transparent',
  },
  bottomSheetBlur: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 110 : 100, // Increased to clear floating tab bar
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  statusHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTime: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  driverContent: {
    width: '100%',
    paddingBottom: 20,
  },
  driverCard: {
      backgroundColor: theme.colors.surfaceLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  vehicleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
  },
  colorDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 8,
  },
  vehicleText: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '600',
  },
  vehicleModelText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginTop: 2,
  },
  plateContainer: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  plateNumber: {
      fontSize: 14,
      fontWeight: 'bold',
      color: theme.colors.text,
  },
  divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: 16,
  },
  driverProfileRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  driverAvatarContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
  },
  driverInitials: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.primaryDark,
  },
  driverNameContainer: {
      flex: 1,
  },
  driverName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 4,
  },
  ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  ratingText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginLeft: 4,
  },
  actionButtons: {
      flexDirection: 'row',
  },
  roundButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 12,
  },
  messageInputContainer: {
      marginTop: 16,
  },
  messageInputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
  },
  messageInput: {
      flex: 1,
      marginLeft: 10,
      color: theme.colors.text,
      fontSize: 14,
  },
  tripDetailsContainer: {
      marginTop: 24,
      paddingHorizontal: 4,
  },
  sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 16,
  },
  timelineContainer: {
      borderLeftWidth: 2,
      borderLeftColor: theme.colors.border,
      marginLeft: 7,
      paddingLeft: 20,
      paddingVertical: 4,
  },
  locationRow: {
      marginBottom: 24,
  },
  locationIconContainer: {
      position: 'absolute',
      left: -27,
      top: 0,
      alignItems: 'center',
  },
  locationDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: theme.colors.surface,
  },
  verticalLine: {
      width: 2,
      height: 30,
      backgroundColor: theme.colors.border,
      marginTop: 4,
  },
  locationTextContainer: {
      flex: 1,
  },
  locationLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginBottom: 2,
  },
  locationValue: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
  },
  paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceLight,
      padding: 16,
      borderRadius: 12,
      marginTop: 8,
  },
  paymentLabel: {
      fontSize: 14,
      color: theme.colors.text,
  },
  paymentValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.primaryDark,
  },
  searchingContainer: {
      alignItems: 'center',
      paddingVertical: 40,
  },
  searchingAnimation: {
      width: 100,
      height: 100,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
  },
  radarCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
  },
  searchingText: {
      fontSize: 16,
      color: theme.colors.text,
      marginBottom: 20,
      fontWeight: '500',
  },
  cancelButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceLight,
      borderWidth: 1,
      borderColor: theme.colors.error,
  },
  cancelText: {
      color: theme.colors.error,
      fontWeight: '600',
  },
  markerContainer: {
    padding: 4,
  },
  markerIcon: {
    padding: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  driverMarker: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default TripStatusScreen;
