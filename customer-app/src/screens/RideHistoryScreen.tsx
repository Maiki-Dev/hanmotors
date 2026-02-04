import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { theme } from '../constants/theme';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MapPin, Calendar, Clock, ChevronRight, History } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
      case 'completed': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
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
    <TouchableOpacity style={styles.card}>
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
          <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
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
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
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
          <RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor={theme.colors.primary} />
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.m,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  list: {
    padding: theme.spacing.m,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
    marginVertical: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  address: {
    fontSize: 16,
    color: theme.colors.text,
    flex: 1,
  },
  connector: {
    height: 16,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    marginLeft: 4.5,
    marginVertical: 2,
    borderStyle: 'dashed',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.surfaceLight,
    paddingTop: 12,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 4,
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
