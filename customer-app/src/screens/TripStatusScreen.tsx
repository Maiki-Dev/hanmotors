import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { useRoute, useNavigation } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { Phone, MessageCircle, Star, Shield, ArrowLeft } from 'lucide-react-native';
import { socket } from '../services/socket';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

const { width, height } = Dimensions.get('window');

const TripStatusScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [trip, setTrip] = useState(route.params?.trip);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [eta, setEta] = useState<string>('');

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

    // Join room for this trip? Or just listen to global events filtered by ID
    // Ideally backend should put us in a room, but we can listen to general events for now
    
    const handleTripUpdate = (updatedTrip: any) => {
      if (updatedTrip._id === trip._id) {
        setTrip(updatedTrip);
      }
    };

    const handleDriverAccepted = (data: any) => {
      if (data.tripId === trip._id) {
        // Refresh trip to get driver details
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
            Alert.alert('Ride Completed', 'You have arrived at your destination.', [
                { text: 'OK', onPress: () => navigation.navigate('HomeTab') }
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

  const getStatusMessage = () => {
    switch (trip.status) {
      case 'pending': return 'Finding you a driver...';
      case 'accepted': return 'Driver is on the way';
      case 'in_progress': return 'Ride in progress';
      case 'completed': return 'Ride completed';
      case 'cancelled': return 'Ride cancelled';
      default: return 'Processing...';
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride request?',
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Cancel', 
          style: 'destructive',
          onPress: async () => {
            try {
              await rideService.cancelTrip(trip._id);
              navigation.navigate('HomeTab');
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel trip');
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.searchingText}>Finding nearby drivers...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelText}>Cancel Request</Text>
            </TouchableOpacity>
        </View>
      );
    }

    // Mock driver display if backend doesn't populate fully yet or for demo
    // Ideally trip.driver would be an object
    const driverName = trip.driver?.name || "Driver Assigned";
    const vehicleInfo = trip.driver?.vehicle ? `${trip.driver.vehicle.color} ${trip.driver.vehicle.model}` : "Vehicle Info";
    const plateNumber = trip.driver?.vehicle?.plateNumber || "1234";

    return (
      <View style={styles.driverContainer}>
        <View style={styles.driverHeader}>
            <View>
                <Text style={styles.driverName}>{driverName}</Text>
                <Text style={styles.vehicleInfo}>{vehicleInfo}</Text>
                <View style={styles.ratingContainer}>
                    <Star size={14} color="#FFD700" fill="#FFD700" />
                    <Text style={styles.ratingText}>4.8</Text>
                </View>
            </View>
            <View style={styles.plateContainer}>
                <Text style={styles.plateText}>{plateNumber}</Text>
            </View>
        </View>

        <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
                <Phone size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
                <MessageCircle size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
                <Shield size={20} color={theme.colors.text} />
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
            <Marker coordinate={{ latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerDot, { backgroundColor: 'green' }]} />
                </View>
            </Marker>
            
            <Marker coordinate={{ latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }}>
                <View style={styles.markerContainer}>
                    <View style={[styles.markerDot, { backgroundColor: 'red' }]} />
                </View>
            </Marker>

            {driverLocation && (
                 <Marker coordinate={{ latitude: driverLocation.lat, longitude: driverLocation.lng }}>
                     <Image 
                        source={
                            (trip.serviceType === 'Ride' || trip.serviceType === 'Sedan') 
                            ? require('../assets/car_icon.png') 
                            : require('../assets/tow-truck.png')
                        } 
                        style={{ width: 40, height: 40, resizeMode: 'contain' }} 
                     />
                 </Marker>
            )}

            <MapViewDirections
                origin={{ latitude: trip.pickupLocation.lat, longitude: trip.pickupLocation.lng }}
                destination={{ latitude: trip.dropoffLocation.lat, longitude: trip.dropoffLocation.lng }}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={3}
                strokeColor={theme.colors.primary}
            />
        </MapView>

        <View style={styles.bottomSheet}>
            <Text style={styles.statusTitle}>{getStatusMessage()}</Text>
            <View style={styles.divider} />
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
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingBottom: 40,
  },
  statusTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.m,
  },
  searchingContainer: {
    alignItems: 'center',
    padding: theme.spacing.m,
  },
  searchingText: {
    ...theme.typography.body,
    marginTop: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },
  cancelButton: {
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.l,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.m,
  },
  cancelText: {
    color: theme.colors.error,
  },
  driverContainer: {
    
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  driverName: {
    ...theme.typography.h3,
  },
  vehicleInfo: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratingText: {
    marginLeft: 4,
    ...theme.typography.caption,
  },
  plateContainer: {
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.s,
    borderRadius: theme.borderRadius.s,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  plateText: {
    ...theme.typography.body,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  }
});

export default TripStatusScreen;
