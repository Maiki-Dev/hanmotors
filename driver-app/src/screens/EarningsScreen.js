import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { PremiumCard } from '../components/PremiumCard';
import { API_URL } from '../config';
import { DollarSign, TrendingUp, Calendar } from 'lucide-react-native';

export default function EarningsScreen({ route, navigation }) {
  // Get driverId from route params or fallback
  const driverId = route.params?.driverId;
  const [earnings, setEarnings] = useState({
    daily: 0,
    weekly: 0,
    total: 0
  });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEarnings();
  }, [driverId]);

  const fetchEarnings = async () => {
    if (!driverId) return;
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/driver/${driverId}/earnings`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns { earnings: {...}, history: [...] }
        if (data.earnings) {
          setEarnings(data.earnings);
        } else {
          // Fallback if backend structure is different
          setEarnings(data); 
        }
        
        if (data.history && Array.isArray(data.history) && data.history.length > 0) {
           // Map backend history to frontend format if needed, or use directly
           // Backend Trip model: { pickupLocation: { address }, dropoffLocation: { address }, price, createdAt, serviceType }
           const formattedHistory = data.history.map(trip => ({
             id: trip._id,
             date: new Date(trip.createdAt).toLocaleDateString(),
             price: trip.price,
             from: trip.pickupLocation?.address || 'Unknown',
             to: trip.dropoffLocation?.address || 'Unknown',
             type: trip.serviceType
           }));
           setHistory(formattedHistory);
        } else {
           // Keep mock data if no history
           setHistory([
             { id: '1', date: 'Today, 2:30 PM', price: 15000, from: 'Sukhbaatar Sq', to: 'Zaisan', type: 'Ride' },
             { id: '2', date: 'Today, 1:15 PM', price: 8000, from: 'Shangri-La', to: 'Airport', type: 'Ride' },
           ]);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyIcon}>
         <DollarSign size={16} color={theme.colors.primary} />
      </View>
      <View style={styles.historyContent}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyType}>{item.type}</Text>
          <Text style={styles.historyPrice}>₮{item.price?.toLocaleString() || '0'}</Text>
        </View>
        <Text style={styles.historyRoute}>{item.from} → {item.to}</Text>
        <Text style={styles.historyDate}>{item.date}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Орлого" />
      
      <FlatList
        contentContainerStyle={styles.content}
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderHistoryItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchEarnings} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <>
            <View style={styles.summaryContainer}>
              <View style={styles.totalBalanceCard}>
                <Text style={styles.balanceLabel}>Нийт үлдэгдэл</Text>
                <Text style={styles.balanceAmount}>₮{earnings.total?.toLocaleString() || '0'}</Text>
                <View style={styles.balanceTrend}>
                   <TrendingUp size={16} color={theme.colors.success} />
                   <Text style={styles.trendText}>+15% өнгөрсөн сараас</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Өнөөдөр</Text>
                  <Text style={styles.statValue}>₮{earnings.daily?.toLocaleString() || '0'}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statBox}>
                  <Text style={styles.statLabel}>Энэ 7 хоног</Text>
                  <Text style={styles.statValue}>₮{earnings.weekly?.toLocaleString() || '0'}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Сүүлийн гүйлгээнүүд</Text>
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.m,
  },
  summaryContainer: {
    marginBottom: theme.spacing.xl,
  },
  totalBalanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    padding: theme.spacing.l,
    marginBottom: theme.spacing.m,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  balanceLabel: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  balanceTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendText: {
    color: theme.colors.success,
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginHorizontal: theme.spacing.m,
  },
  statLabel: {
    ...theme.typography.caption,
    marginBottom: 4,
  },
  statValue: {
    ...theme.typography.h3,
    fontSize: 18,
  },
  sectionTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    marginBottom: theme.spacing.m,
    marginLeft: 4,
  },
  historyItem: {
    flexDirection: 'row',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: theme.spacing.s,
    alignItems: 'center',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.m,
  },
  historyContent: {
    flex: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyType: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  historyPrice: {
    ...theme.typography.body,
    fontWeight: '700',
    color: theme.colors.success,
  },
  historyRoute: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 10,
    color: theme.colors.textSecondary,
  }
});
