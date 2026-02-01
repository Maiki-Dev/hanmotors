import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { GoldButton } from '../components/GoldButton';
import { Truck, Car, Anchor } from 'lucide-react-native'; // Anchor as Tow hook substitute
import { API_URL } from '../config';

const VehicleTypeOption = ({ type, icon, selected, onSelect }) => (
  <TouchableOpacity 
    style={[styles.typeOption, selected && styles.typeOptionSelected]} 
    onPress={() => onSelect(type)}
  >
    <View style={styles.iconWrapper}>
      {icon}
    </View>
    <Text style={[styles.typeText, selected && styles.typeTextSelected]}>{type}</Text>
  </TouchableOpacity>
);

export default function VehicleSettingsScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vehicle, setVehicle] = useState({
    model: '',
    year: '',
    plateNumber: '',
    color: '',
  });
  const [vehicleType, setVehicleType] = useState('Ride');

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}`);
      const data = await response.json();
      if (response.ok) {
        setVehicleType(data.vehicleType || 'Ride');
        if (data.vehicle) {
          setVehicle({
            model: data.vehicle.model || '',
            year: data.vehicle.year || '',
            plateNumber: data.vehicle.plateNumber || '',
            color: data.vehicle.color || '',
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/vehicle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle,
          vehicleType
        })
      });
      
      if (response.ok) {
        Alert.alert('Амжилттай', 'Тээврийн хэрэгслийн мэдээлэл шинэчлэгдлээ');
      } else {
        Alert.alert('Алдаа', 'Тээврийн хэрэгсэл шинэчлэхэд алдаа гарлаа');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Тээврийн хэрэгсэл" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Үйлчилгээний төрөл</Text>
        <View style={styles.typesContainer}>
          <VehicleTypeOption 
            type="Tow" 
            icon={<Anchor size={24} color={vehicleType === 'Tow' ? theme.colors.black : theme.colors.textSecondary} />}
            selected={true}
            onSelect={() => {}}
          />
        </View>

        <Text style={styles.sectionTitle}>Vehicle Details</Text>
        
        <Input
          label="Model"
          placeholder="Toyota Prius"
          value={vehicle.model}
          onChangeText={(text) => setVehicle({...vehicle, model: text})}
        />
        
        <Input
          label="Year"
          placeholder="2015"
          value={vehicle.year}
          onChangeText={(text) => setVehicle({...vehicle, year: text})}
          keyboardType="numeric"
        />
        
        <Input
          label="Plate Number"
          placeholder="1234 UBA"
          value={vehicle.plateNumber}
          onChangeText={(text) => setVehicle({...vehicle, plateNumber: text})}
          autoCapitalize="characters"
        />

        <Input
          label="Color"
          placeholder="Silver"
          value={vehicle.color}
          onChangeText={(text) => setVehicle({...vehicle, color: text})}
        />

        <View style={styles.spacer} />
        
        <GoldButton 
          title="SAVE VEHICLE" 
          onPress={handleSave} 
          loading={saving}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.l,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    marginTop: theme.spacing.s,
  },
  typesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  typeOption: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  typeOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  iconWrapper: {
    marginBottom: theme.spacing.s,
  },
  typeText: {
    ...theme.typography.caption,
    fontWeight: '600',
  },
  typeTextSelected: {
    color: theme.colors.black,
  },
  spacer: {
    height: theme.spacing.xl,
  }
});
