import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { theme } from '../constants/theme';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MapPin, Calendar, Clock, ChevronRight, History } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const RideHistoryScreen = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const insets = useSafeAreaInsets();

  const fetchHistory = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await rideService.getHistory(user._id);
      setTrips(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Дууссан';
      case 'cancelled': return 'Цуцлагдсан';
      case 'in_progress': return 'Явагдаж байна';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      case 'in_progress': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed': return 'rgba(76, 175, 80, 0.1)';
      case 'cancelled': return 'rgba(244, 67, 54, 0.1)';
      case 'in_progress': return 'rgba(255, 215, 0, 0.1)';
      default: return theme.colors.surfaceLight;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity activeOpacity={0.8} style={styles.cardWrapper}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={theme.colors.textSecondary} /> 
            <Text style={styles.dateText}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text style={styles.timeText}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusBgColor(item.status) }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <View style={styles.locationsContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: '#4CAF50' }]} />
            <Text style={styles.address} numberOfLines={1}>{item.pickupLocation?.address || 'Авах цэг'}</Text>
          </View>
          
          <View style={styles.connector} />
          
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.error }]} />
            <Text style={styles.address} numberOfLines={1}>{item.dropoffLocation?.address || 'Хүргэх цэг'}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.price}>{item.price?.toLocaleString()}₮</Text>
          <View style={styles.detailsButton}>
            <Text style={styles.detailsText}>Дэлгэрэнгүй</Text>
            <ChevronRight color={theme.colors.textSecondary} size={16} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <LinearGradient
        colors={[theme.colors.background, '#1a2138', '#0f1322']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative Orbs */}
      <View style={[styles.orb, styles.orb1, { backgroundColor: theme.colors.primary }]} />
      <View style={[styles.orb, styles.orb2, { backgroundColor: theme.colors.secondary }]} />
      
      <View style={[styles.content, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.title}>Миний аялалууд</Text>
        </View>

        <FlatList
          data={trips}
          renderItem={renderItem}
          keyExtractor={(item: any) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={loading} 
              onRefresh={fetchHistory} 
              tintColor={theme.colors.primary} 
              progressBackgroundColor={theme.colors.surface}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <History size={40} color={theme.colors.textSecondary} />
              </View>
              <Text style={styles.emptyText}>Аялал хийгээгүй байна</Text>
              <Text style={styles.emptySubText}>Таны хийсэн аялалууд энд харагдах болно</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  orb: {
    position: 'absolute',
    borderRadius: 150,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -50,
    left: -100,
  },
  orb2: {
    width: 200,
    height: 200,
    bottom: 100,
    right: -50,
  },
  content: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  list: {
    padding: 20,
    paddingBottom: 100,
  },
  cardWrapper: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    padding: 20,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationsContainer: {
    marginBottom: 16,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  address: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  connector: {
    height: 20,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.border,
    marginLeft: 5,
    marginVertical: 2,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  detailsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 4,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});

export default RideHistoryScreen;
