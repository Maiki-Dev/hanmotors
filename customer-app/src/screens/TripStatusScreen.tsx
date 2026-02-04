import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions, Platform, Animated } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { Phone, MessageCircle, Star, Shield, ArrowLeft, MapPin, User, Navigation, X } from 'lucide-react-native';
import { socket } from '../services/socket';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const TripStatusScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();
  
  const [trip, setTrip] = useState(route.params?.trip);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  
  // Animation for pulsing effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

    socket.on('tripUpdated', handleTripUpdate);
    socket.on('driverAccepted', handleDriverAccepted);
    socket.on('driverLocationUpdated', handleDriverLocation); 
    socket.on('tripCompleted', handleTripCompleted);

    return () => {
      if (socket) {
        socket.off('tripUpdated', handleTripUpdate);
        socket.off('driverAccepted', handleDriverAccepted);
        socket.off('driverLocationUpdated', handleDriverLocation);
        socket.off('tripCompleted', handleTripCompleted);
      }
    };
  }, [trip, user]);

  useEffect(() => {
    if (trip && mapRef.current) {
        // Fit to markers
        const coordinates = [
            { latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng },
            { latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }
        ];
        
        if (driverLocation) {
            coordinates.push({ latitude: driverLocation.lat, longitude: driverLocation.lng });
        }

        mapRef.current.fitToCoordinates(coordinates, {
            edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
            animated: true,
        });
    }
  }, [trip, driverLocation]);

  const getStatusMessage = () => {
    switch (trip.status) {
      case 'pending': return 'Жолооч хайж байна...';
      case 'accepted': return 'Жолооч тань руу ирж байна';
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
            try {
              await rideService.cancelTrip(trip._id);
              navigation.navigate('HomeTab');
            } catch (error) {
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
                   <ActivityIndicator size="large" color={theme.colors.primary} />
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
    const vehicleInfo = trip.driver?.vehicle ? `${trip.driver.vehicle.color} ${trip.driver.vehicle.model}` : "Машин";
    const plateNumber = trip.driver?.vehicle?.plateNumber || "---";

    return (
      <View style={styles.driverInfoContainer}>
        {/* Driver Profile Header */}
        <View style={styles.driverHeader}>
            <View style={styles.driverAvatarContainer}>
                <View style={styles.avatarPlaceholder}>
                    <User size={30} color={theme.colors.textSecondary} />
                </View>
                {/* <Image source={{ uri: driverAvatarUrl }} style={styles.driverAvatar} /> */}
            </View>
            <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{driverName}</Text>
                <View style={styles.ratingRow}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>4.9</Text>
                    <Text style={styles.tripCount}>• 1,240 аялал</Text>
                </View>
            </View>
            <View style={styles.vehiclePlateContainer}>
                <Text style={styles.vehicleModel}>{vehicleInfo}</Text>
                <View style={styles.plateBox}>
                    <Text style={styles.plateText}>{plateNumber}</Text>
                </View>
            </View>
        </View>

        <View style={styles.divider} />

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#E8F5E9' }]}>
                    <Phone size={24} color="#2E7D32" />
                </View>
                <Text style={styles.actionLabel}>Залгах</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#E3F2FD' }]}>
                    <MessageCircle size={24} color="#1565C0" />
                </View>
                <Text style={styles.actionLabel}>Зурвас</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.actionButton, { opacity: 0.5 }]}>
                <View style={[styles.actionIconCircle, { backgroundColor: '#FFF3E0' }]}>
                    <Shield size={24} color="#EF6C00" />
                </View>
                <Text style={styles.actionLabel}>Тусламж</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
        {/* Header Back Button */}
        <View style={[styles.header, { top: insets.top }]}>
            <TouchableOpacity onPress={() => navigation.navigate('HomeTab')} style={styles.backButton}>
                <ArrowLeft color={theme.colors.text} size={24} />
            </TouchableOpacity>
        </View>

        <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
                latitude: trip.pickupLocation.lat,
                longitude: trip.pickupLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
        >
            {/* Pickup Marker */}
            <Marker coordinate={{ latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerIcon, { backgroundColor: theme.colors.success }]}>
                        <MapPin color="white" size={20} />
                    </View>
                </View>
            </Marker>
            
            {/* Dropoff Marker */}
            <Marker coordinate={{ latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerIcon, { backgroundColor: theme.colors.primary }]}>
                        <MapPin color="black" size={20} />
                    </View>
                </View>
            </Marker>

            {/* Driver Marker */}
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

            <MapViewDirections
                origin={{ latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng }}
                destination={{ latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={4}
                strokeColor={theme.colors.primary}
            />
        </MapView>

        {/* Bottom Sheet */}
        <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.dragIndicator} />
            <Text style={styles.statusTitle}>{getStatusMessage()}</Text>
            
            {/* Progress Bar (Visual only) */}
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: trip.status === 'in_progress' ? '60%' : trip.status === 'accepted' ? '30%' : '10%' }]} />
            </View>

            {renderDriverInfo()}
        </View>
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
    width: 40,
    height: 40,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
    marginTop: -30,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
    textAlign: 'center',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 3,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchingAnimation: {
    marginBottom: 30,
    marginTop: 10,
  },
  radarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  searchingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 30,
    fontWeight: '500',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: 30,
  },
  cancelText: {
    color: theme.colors.error,
    fontWeight: '600',
    fontSize: 16,
  },
  driverInfoContainer: {
    marginTop: 10,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  driverAvatarContainer: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  tripCount: {
    marginLeft: 6,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  vehiclePlateContainer: {
    alignItems: 'flex-end',
  },
  vehicleModel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    fontWeight: '500',
  },
  plateBox: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.text,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  plateText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginBottom: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  driverMarker: {
    width: 40,
    height: 40,
  }
});

export default TripStatusScreen;
