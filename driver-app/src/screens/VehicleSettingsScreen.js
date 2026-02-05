import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Anchor } from 'lucide-react-native';
import { API_URL } from '../config';

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value || '-'}</Text>
  </View>
);

export default function VehicleSettingsScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState(null);
  const [vehicleType, setVehicleType] = useState('Ride');

  useEffect(() => {
    fetchVehicle();
  }, []);

  const fetchVehicle = async () => {
    try {
      const response = await fetch(`${API_URL}/api/driver/${driverId}`);
      const data = await response.json();
      if (response.ok) {
        setVehicleType(data.vehicleType || 'Ride');
        setVehicle(data.vehicle);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Тээврийн хэрэгсэл" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Үйлчилгээний төрөл</Text>
        <View style={styles.typeCard}>
            <View style={styles.iconWrapper}>
               <Anchor size={24} color={theme.colors.black} />
            </View>
            <Text style={styles.typeText}>
              {vehicleType === 'Tow' ? 'Ачигч машин' : 
               vehicleType === 'Ride' ? 'Суудлын машин' : 
               vehicleType === 'Cargo' ? 'Ачааны машин' : vehicleType}
            </Text>
        </View>

        <Text style={styles.sectionTitle}>Тээврийн хэрэгслийн мэдээлэл</Text>
        
        <View style={styles.detailsCard}>
           <DetailRow label="Марк / Загвар" value={vehicle?.model} />
           <View style={styles.divider} />
           <DetailRow label="Үйлдвэрлэсэн он" value={vehicle?.year} />
           <View style={styles.divider} />
           <DetailRow label="Улсын дугаар" value={vehicle?.plateNumber} />
           <View style={styles.divider} />
           <DetailRow label="Өнгө" value={vehicle?.color} />
        </View>

        <Text style={styles.infoText}>
           Тээврийн хэрэгслийн мэдээллийг өөрчлөхийн тулд админтай холбогдоно уу.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: theme.spacing.l,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    marginTop: theme.spacing.s,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  typeCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
  },
  iconWrapper: {
    marginRight: theme.spacing.m,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 20,
  },
  typeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
  },
  detailsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.l,
  },
  detailRow: {
    paddingVertical: theme.spacing.s,
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.s,
  },
  infoText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  }
});
