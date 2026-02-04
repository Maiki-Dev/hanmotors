import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { rideService } from '../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { MapPin, Calendar, Clock, ChevronRight } from 'lucide-react-native';

const RideHistoryScreen = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

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

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.date}>
          <Calendar size={14} color={theme.colors.textSecondary} /> 
          {' '}{new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>

      <View style={styles.row}>
        <MapPin size={16} color={theme.colors.success} />
        <Text style={styles.address} numberOfLines={1}>{item.pickupLocation?.address || 'Pickup'}</Text>
      </View>
      
      <View style={styles.connector} />
      
      <View style={styles.row}>
        <MapPin size={16} color={theme.colors.error} />
        <Text style={styles.address} numberOfLines={1}>{item.dropoffLocation?.address || 'Dropoff'}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.price}>{item.price?.toLocaleString()}₮</Text>
        <ChevronRight color={theme.colors.textSecondary} size={20} />
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return theme.colors.success;
      case 'cancelled': return theme.colors.error;
      case 'in_progress': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Rides</Text>
      <FlatList
        data={trips}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchHistory} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>No rides yet</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginLeft: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  list: {
    padding: theme.spacing.m,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.s,
  },
  date: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
  },
  status: {
    ...theme.typography.caption,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  address: {
    ...theme.typography.body,
    marginLeft: theme.spacing.s,
    color: theme.colors.text,
    flex: 1,
  },
  connector: {
    height: 10,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
    marginLeft: 7,
    marginVertical: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.s,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.s,
  },
  price: {
    ...theme.typography.h3,
    color: theme.colors.primary,
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 50,
  },
});

export default RideHistoryScreen;
