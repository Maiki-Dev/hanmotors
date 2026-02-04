import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ArrowLeft, MapPin, Car, DollarSign } from 'lucide-react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import { GOOGLE_MAPS_APIKEY } from '../config';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

type RootStackParamList = {
  RideRequest: { 
    pickup: { address: string; lat: number; lng: number };
  };
  TripStatus: { trip: any };
};

type RideRequestScreenRouteProp = RouteProp<RootStackParamList, 'RideRequest'>;
type RideRequestScreenNavigationProp = StackNavigationProp<RootStackParamList, 'RideRequest'>;

const RideRequestScreen = () => {
  const route = useRoute<RideRequestScreenRouteProp>();
  const navigation = useNavigation<RideRequestScreenNavigationProp>();
  const user = useSelector((state: RootState) => state.auth.user);
  
  const [pickup, setPickup] = useState(route.params?.pickup || null);
  const [dropoff, setDropoff] = useState<{ address: string; lat: number; lng: number } | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState('');
  
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('Sedan');

  // Mock Dropoff selection (In real app, use Google Places Autocomplete)
  const handleDropoffSubmit = async () => {
    // Simulating geocoding for "Ulaanbaatar" or whatever user types
    // For demo, let's just pick a random point near pickup
    if (!pickup) return;
    
    // Just a mock coordinate offset for demo
    const mockLat = pickup.lat + 0.02; 
    const mockLng = pickup.lng + 0.02;
    
    setDropoff({
      address: dropoffAddress || "Selected Destination",
      lat: mockLat,
      lng: mockLng
    });
  };

  const calculatePrice = (distKm: number) => {
    // Simple mock pricing
    const base = 5000;
    const perKm = 1500;
    return Math.ceil((base + distKm * perKm) / 100) * 100;
  };

  const handleDirectionsReady = (result: any) => {
    setDistance(result.distance);
    setDuration(result.duration);
    setPrice(calculatePrice(result.distance));
  };

  const handleRequestRide = async () => {
    if (!pickup || !dropoff) return;
    
    setLoading(true);
    try {
      const response = await rideService.requestRide({
        customerId: user?._id || 'guest',
        pickup,
        dropoff,
        vehicleType: selectedVehicle,
        distance
      });
      
      Alert.alert('Success', 'Ride requested successfully!');
      // Navigate to Trip Status or Tracking screen
      navigation.navigate('TripStatus', { trip: response.data }); 
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Ride</Text>
      </View>

      {/* Map Preview */}
      <View style={styles.mapContainer}>
        {pickup && (
          <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
              latitude: pickup.lat,
              longitude: pickup.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" />
            {dropoff && <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} pinColor="blue" title="Dropoff" />}
            
            {pickup && dropoff && (
              <MapViewDirections
                origin={{ latitude: pickup.lat, longitude: pickup.lng }}
                destination={{ latitude: dropoff.lat, longitude: dropoff.lng }}
                apikey={GOOGLE_MAPS_APIKEY}
                strokeWidth={3}
                strokeColor={theme.colors.primary}
                onReady={handleDirectionsReady}
              />
            )}
          </MapView>
        )}
      </View>

      {/* Inputs & Actions */}
      <View style={styles.actionSheet}>
        <View style={styles.inputRow}>
          <MapPin color={theme.colors.success} size={20} />
          <Text style={styles.inputText} numberOfLines={1}>{pickup?.address}</Text>
        </View>
        
        <View style={styles.connector} />
        
        <View style={styles.inputRow}>
          <MapPin color={theme.colors.error} size={20} />
          <TextInput 
            style={styles.input}
            placeholder="Where to?"
            placeholderTextColor={theme.colors.textSecondary}
            value={dropoffAddress}
            onChangeText={setDropoffAddress}
            onSubmitEditing={handleDropoffSubmit}
          />
          {/* Mock button to simulate 'Done' on keyboard if needed */}
          <TouchableOpacity onPress={handleDropoffSubmit}>
             <Text style={{color: theme.colors.primary}}>Set</Text>
          </TouchableOpacity>
        </View>

        {dropoff && (
          <>
            <View style={styles.divider} />
            
            <View style={styles.fareContainer}>
              <View>
                <Text style={styles.fareLabel}>Estimated Fare</Text>
                <Text style={styles.fareValue}>{price.toLocaleString()}₮</Text>
              </View>
              <View>
                 <Text style={styles.fareLabel}>Distance</Text>
                 <Text style={styles.fareValue}>{distance.toFixed(1)} km</Text>
              </View>
              <View>
                 <Text style={styles.fareLabel}>Time</Text>
                 <Text style={styles.fareValue}>{Math.ceil(duration)} min</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.requestButton}
              onPress={handleRequestRide}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <Text style={styles.requestButtonText}>Confirm Ride</Text>
              )}
            </TouchableOpacity>
          </>
        )}
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    paddingTop: 50, // Safe area
    backgroundColor: theme.colors.surface,
    zIndex: 1,
  },
  backButton: {
    padding: theme.spacing.s,
  },
  headerTitle: {
    ...theme.typography.h3,
    marginLeft: theme.spacing.m,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  actionSheet: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.l,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
  },
  inputText: {
    ...theme.typography.body,
    marginLeft: theme.spacing.m,
    flex: 1,
  },
  input: {
    ...theme.typography.body,
    marginLeft: theme.spacing.m,
    flex: 1,
    color: theme.colors.text,
  },
  connector: {
    height: 10,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.textSecondary,
    marginLeft: 29, // align with icons
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.m,
  },
  fareContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.l,
  },
  fareLabel: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  fareValue: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  requestButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  requestButtonText: {
    ...theme.typography.button,
  },
});

export default RideRequestScreen;
