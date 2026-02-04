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
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

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
  
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState('Sedan');

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
        serviceType: 'Tow',
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
        
        <View style={[styles.inputRow, { zIndex: 1000 }]}>
          <MapPin color={theme.colors.error} size={20} />
          <GooglePlacesAutocomplete
            placeholder='Where to?'
            onPress={(data, details = null) => {
              if (details) {
                setDropoff({
                  address: data.description,
                  lat: details.geometry.location.lat,
                  lng: details.geometry.location.lng,
                });
              }
            }}
            query={{
              key: GOOGLE_MAPS_APIKEY,
              language: 'en',
            }}
            fetchDetails={true}
            enablePoweredByContainer={false}
            styles={{
              container: {
                flex: 1,
              },
              textInputContainer: {
                backgroundColor: 'transparent',
                marginLeft: theme.spacing.s,
                borderTopWidth: 0,
                borderBottomWidth: 0,
                width: '100%',
              },
              textInput: {
                backgroundColor: 'transparent',
                height: 44,
                borderRadius: 0,
                paddingVertical: 0,
                paddingHorizontal: 0,
                fontSize: 16,
                color: theme.colors.text,
              },
              listView: {
                position: 'absolute',
                top: 44,
                left: -35, // Adjust to cover the icon space if needed, or keep it aligned
                width: '120%', // Make it wider to cover
                backgroundColor: theme.colors.surface,
                borderRadius: 5,
                elevation: 5,
                zIndex: 1000,
              },
              row: {
                backgroundColor: theme.colors.surface,
              },
              description: {
                color: theme.colors.text,
              }
            }}
          />
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
    zIndex: 10, // Ensure it's above other elements if needed
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    marginBottom: 0,
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
    zIndex: -1, // Ensure fare container is behind autocomplete list
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
    zIndex: -1,
  },
  requestButtonText: {
    ...theme.typography.button,
  },
});

export default RideRequestScreen;
