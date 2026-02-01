import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ChevronLeft, Calendar, DollarSign } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { PremiumCard } from '../components/PremiumCard';
import { API_URL } from '../config';
import { io } from 'socket.io-client';

const JobHistoryScreen = ({ navigation, route }) => {
  const { driverId } = route.params || {};
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!driverId) return;
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/earnings`);
      if (response.ok) {
        const data = await response.json();
        // data.history contains the array of trips
        setJobs(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch job history', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
      
      const socket = io(API_URL);
      
      // Listen for trip updates (completion, etc.)
      socket.on('tripUpdated', (updatedTrip) => {
        // If the updated trip belongs to this driver, refresh history
        if (updatedTrip.driver === driverId || (updatedTrip.driver && updatedTrip.driver._id === driverId)) {
          fetchHistory();
        }
      });

      return () => {
        socket.disconnect();
      };
    }, [driverId])
  );

  const renderItem = ({ item }) => {
    const date = new Date(item.createdAt);
    const dateString = date.toLocaleDateString();
    const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <PremiumCard style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.dateContainer}>
            <Calendar size={14} color={theme.colors.textSecondary} />
            <Text style={styles.dateText}>{dateString} • {timeString}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)' }]}>
            <Text style={[styles.statusText, { color: item.status === 'completed' ? '#4CAF50' : '#F44336' }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickupLocation?.address || 'Unknown Pickup'}
            </Text>
          </View>
          <View style={styles.line} />
          <View style={styles.locationRow}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.dropoffLocation?.address || 'Unknown Dropoff'}
            </Text>
          </View>
        </View>

        <View style={styles.jobFooter}>
          <Text style={styles.serviceText}>{item.serviceType}</Text>
          <View style={styles.priceContainer}>
            <DollarSign size={16} color={theme.colors.primary} />
            <Text style={styles.priceText}>{item.price?.toLocaleString() || '0'} ₮</Text>
          </View>
        </View>
      </PremiumCard>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ажлын түүх</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading && jobs.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <Text style={styles.emptyText}>Ажлын түүх хоосон байна</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  jobCard: {
    marginBottom: 15,
    padding: 15,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    marginBottom: 15,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 2,
    height: 15,
    backgroundColor: theme.colors.border,
    marginLeft: 3,
  },
  locationText: {
    color: theme.colors.text,
    fontSize: 16,
    flex: 1,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 10,
  },
  serviceText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  priceText: {
    color: theme.colors.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  }
});

export default JobHistoryScreen;
