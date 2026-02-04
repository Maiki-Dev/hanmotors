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

const { width, height } = Dimensions.get('window');

const TripStatusScreen = () => {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const mapRef = useRef<MapView>(null);
  
  const [trip, setTrip] = useState(route.params?.trip);
  const [driverLocation, setDriverLocation] = useState<any>(null);
  const [eta, setEta] = useState<string>('');

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
    socket.on('driverLocationUpdate', handleDriverLocation); // Assuming this event exists
    socket.on('tripCompleted', handleTripCompleted);

    return () => {
      if (socket) {
        socket.off('tripUpdated', handleTripUpdate);
        socket.off('driverAccepted', handleDriverAccepted);
        socket.off('driverLocationUpdate', handleDriverLocation);
        socket.off('tripCompleted', handleTripCompleted);
      }
    };
  }, [trip]);

  const fetchTripDetails = async () => {
      // In a real app, you'd fetch the trip again to get populated driver info
      // For now we might need an endpoint or just rely on what we have
      // Assuming we have a getTrip endpoint or similar, otherwise we might rely on socket data
  };

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

  const renderDriverInfo = () => {
    if (!trip.driver && trip.status === 'pending') {
      return (
        <View style={styles.searchingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.searchingText}>Finding nearby drivers...</Text>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
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
                     <Image source={require('../assets/car-icon.png')} style={{ width: 30, height: 30, resizeMode: 'contain' }} />
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
    backgroundColor: theme.colors.surface,
    padding: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingBottom: 40,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 10,
  },
  searchingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  searchingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    backgroundColor: theme.colors.error,
  },
  cancelText: {
    color: 'white',
    fontWeight: 'bold',
  },
  driverContainer: {
    marginTop: 10,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  vehicleInfo: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    marginLeft: 5,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  plateContainer: {
    backgroundColor: theme.colors.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  plateText: {
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  markerContainer: {
    padding: 5,
    backgroundColor: 'white',
    borderRadius: 15,
    elevation: 3,
  },
  markerDot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
  }
});

export default TripStatusScreen;
