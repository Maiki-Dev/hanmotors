import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, Calendar, Clock, DollarSign } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { PremiumCard } from '../components/PremiumCard';

const JobHistoryScreen = ({ navigation }) => {
  // Mock data
  const [jobs, setJobs] = useState([
    {
      id: '1',
      date: '2025-05-15',
      time: '14:30',
      pickup: 'Sukhbaatar Square',
      dropoff: 'Zaisan Memorial',
      price: 15000,
      status: 'completed',
      service: 'Ride'
    },
    {
      id: '2',
      date: '2025-05-14',
      time: '09:15',
      pickup: 'Shangri-La Mall',
      dropoff: 'Chinggis Khaan Airport',
      price: 45000,
      status: 'completed',
      service: 'Cargo'
    },
    {
      id: '3',
      date: '2025-05-12',
      time: '18:45',
      pickup: 'State Department Store',
      dropoff: 'Encanto Town',
      price: 12000,
      status: 'cancelled',
      service: 'Ride'
    }
  ]);

  const renderItem = ({ item }) => (
    <PremiumCard style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <View style={styles.dateContainer}>
          <Calendar size={14} color={theme.colors.textSecondary} />
          <Text style={styles.dateText}>{item.date} • {item.time}</Text>
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
          <Text style={styles.locationText}>{item.pickup}</Text>
        </View>
        <View style={styles.line} />
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.locationText}>{item.dropoff}</Text>
        </View>
      </View>

      <View style={styles.jobFooter}>
        <Text style={styles.serviceText}>{item.service}</Text>
        <View style={styles.priceContainer}>
          <DollarSign size={16} color={theme.colors.primary} />
          <Text style={styles.priceText}>{item.price?.toLocaleString() || '0'} ₮</Text>
        </View>
      </View>
    </PremiumCard>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ажлын түүх</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={jobs}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
});

export default JobHistoryScreen;
