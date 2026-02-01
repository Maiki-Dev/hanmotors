import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, FlatList } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { GoldButton } from '../components/GoldButton';
import { CreditCard, History, Plus } from 'lucide-react-native';
import { API_URL } from '../config';

export default function WalletScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWallet();
  }, []);

  const fetchWallet = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/wallet`);
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance || 0);
        setTransactions(data.transactions || []);
      }
    } catch (error) {
      console.error('Failed to fetch wallet', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async (amount) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/wallet/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, method: 'Card' })
      });
      
      if (response.ok) {
        const data = await response.json();
        setBalance(data.balance);
        setTransactions(data.transactions);
        Alert.alert('Амжилттай', `${amount.toLocaleString()}₮ цэнэглэгдлээ.`);
      } else {
        Alert.alert('Алдаа', 'Цэнэглэхэд алдаа гарлаа.');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setLoading(false);
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionIcon}>
        {item.type === 'credit' ? (
          <Plus size={20} color={theme.colors.success} />
        ) : (
          <CreditCard size={20} color={theme.colors.error} />
        )}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc}>{item.description}</Text>
        <Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
      </View>
      <Text style={[
        styles.transactionAmount, 
        { color: item.type === 'credit' ? theme.colors.success : theme.colors.text }
      ]}>
        {item.type === 'credit' ? '+' : '-'}{item.amount.toLocaleString()}₮
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Миний данс" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Үлдэгдэл</Text>
          <Text style={styles.balanceAmount}>{balance.toLocaleString()}₮</Text>
          <Text style={styles.balanceSubtext}>Хан Моторс хэтэвч</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(5000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>5,000₮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(10000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>10,000₮</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRecharge(20000)}>
            <View style={styles.actionIcon}>
              <Plus size={24} color={theme.colors.white} />
            </View>
            <Text style={styles.actionText}>20,000₮</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Гүйлгээний түүх</Text>
        {transactions.length === 0 ? (
          <Text style={styles.emptyText}>Гүйлгээ хийгдээгүй байна</Text>
        ) : (
          transactions.map((item, index) => (
            <View key={index}>
              {renderTransaction({ item })}
              {index < transactions.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        )}
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
  balanceCard: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.l,
    padding: theme.spacing.xl,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  balanceLabel: {
    color: theme.colors.black,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    opacity: 0.8,
  },
  balanceAmount: {
    color: theme.colors.black,
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  balanceSubtext: {
    color: theme.colors.black,
    fontSize: 12,
    opacity: 0.6,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    width: '30%',
    elevation: 2,
  },
  actionIcon: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    color: theme.colors.text,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginTop: 20,
  }
});
