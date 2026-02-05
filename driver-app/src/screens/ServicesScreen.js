import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../constants/theme';
import { Car, Truck, Package, Shield, Zap, Crown, Share2 } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - theme.spacing.l * 2 - theme.spacing.m) / COLUMN_COUNT;

const SERVICES = [
  {
    id: 'delivery',
    title: 'Шуурхай Хүргэлт',
    subtitle: 'Найдвартай хүргэлт',
    icon: Package,
    color: '#f97316',
    bgColor: '#f5f5f5'
  },
  {
    id: 'towing',
    title: 'Ачилт',
    subtitle: 'Машин ачих үйлчилгээ',
    icon: Truck,
    color: '#ef4444',
    bgColor: '#f5f5f5'
  },
  {
    id: 'share',
    title: 'Дуудлага хуваалцах',
    subtitle: 'Бусадтай хуваалцах',
    icon: Share2,
    color: '#8b5cf6',
    bgColor: '#f5f5f5'
  }
];

export default function ServicesScreen() {
  const [role, setRole] = useState(null);
  const [vehicleType, setVehicleType] = useState(null);
  const navigation = useNavigation();

  useEffect(() => {
    loadRole();
  }, []);

  const loadRole = async () => {
    try {
      const data = await AsyncStorage.getItem('driver_data');
      if (data) {
        const driver = JSON.parse(data);
        setRole(driver.role || 'taxi');
        setVehicleType(driver.vehicleType || 'Ride');
      }
    } catch (e) {
      console.error('Failed to load driver role', e);
    }
  };

  const getFilteredServices = () => {
    // Always show 'share' option
    const shareService = SERVICES.find(s => s.id === 'share');
    let filtered = [];

    if (!role) filtered = [];
    else if (role === 'tow' || vehicleType === 'Tow') {
      filtered = [SERVICES.find(s => s.id === 'towing')];
    } else if (role === 'delivery' || vehicleType === 'Cargo') {
      filtered = [SERVICES.find(s => s.id === 'delivery')];
    } else {
      // Taxi role: nothing specific since we deleted all taxi services
      // Just show share
      filtered = [];
    }
    
    // Add Share option at the end if not already present
    // Filter out undefined in case find fails
    return [...filtered, shareService].filter(Boolean);
  };

  const handlePress = (item) => {
    if (item.id === 'share') {
      navigation.navigate('ShareJob');
    }
  };

  const renderItem = ({ item }) => {
    const Icon = item.icon;
    
    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => handlePress(item)}
      >
        <View style={styles.iconContainer}>
          <Icon size={48} color={item.color} strokeWidth={1.5} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Үйлчилгээ</Text>
        <Text style={styles.headerSubtitle}>
          {role === 'tow' ? 'Танд зөвхөн ачилтын үйлчилгээ харагдана' : 'Танд санал болгож буй үйлчилгээнүүд'}
        </Text>
      </View>
      
      <FlatList
        data={getFilteredServices()}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={COLUMN_COUNT}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: theme.spacing.l,
    marginBottom: theme.spacing.l,
  },
  headerTitle: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  headerSubtitle: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingHorizontal: theme.spacing.l,
    paddingBottom: 100, // Space for bottom tab bar
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: theme.spacing.m,
  },
  card: {
    width: ITEM_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.m,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    height: 160,
    ...theme.shadows.small,
  },
  iconContainer: {
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  }
});
