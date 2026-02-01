import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { User, Home, DollarSign, HelpCircle, ChevronRight, CreditCard, Wallet, History } from 'lucide-react-native';
import { API_URL } from '../config';

export default function ProfileScreen({ navigation, route }) {
  const { driverId } = route.params || { driverId: 'Unknown' };
  const [driverName, setDriverName] = useState(route.params?.driverName || 'Partner');
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchDriverInfo = async () => {
      if (!driverId || driverId === 'Unknown') return;
      try {
        // Fetch profile
        const response = await fetch(`${API_URL}/api/driver/${driverId}`);
        if (response.ok) {
          const data = await response.json();
          setDriverName(data.name || 'Partner');
          // If wallet data is included in driver object
          if (data.wallet) {
            setWalletBalance(data.wallet.balance || 0);
          }
        }
        
        // Fetch specific wallet info to be sure (and get fresh balance)
        const walletRes = await fetch(`${API_URL}/api/driver/${driverId}/wallet`);
        if (walletRes.ok) {
          const walletData = await walletRes.json();
          setWalletBalance(walletData.balance || 0);
        }
      } catch (error) {
        console.error("Failed to fetch driver info", error);
      }
    };

    const unsubscribe = navigation.addListener('focus', () => {
      fetchDriverInfo();
    });

    fetchDriverInfo();

    return unsubscribe;
  }, [navigation, driverId]);
  
  const MenuOption = ({ title, onPress, icon, isLast, value }) => (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.menuOption, isLast && styles.menuOptionLast]}>
        <View style={styles.menuLeft}>
           {icon && <View style={styles.menuIcon}>{icon}</View>}
           <Text style={styles.menuText}>{title}</Text>
        </View>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {value && <Text style={styles.menuValue}>{value}</Text>}
          <ChevronRight color={theme.colors.textSecondary} size={20} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
             <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{driverName ? driverName[0] : 'U'}</Text>
             </View>
             <View style={styles.onlineBadge} />
          </View>
          <Text style={styles.driverName}>{driverName}</Text>
          <Text style={styles.driverId}>ID: {driverId}</Text>
          <View style={styles.ratingContainer}>
             <Text style={styles.ratingText}>⭐ 4.9</Text>
             <Text style={styles.ratingCount}>(150+ ажил)</Text>
          </View>
        </View>

        {/* Wallet Section */}
        <TouchableOpacity 
          style={styles.walletCard} 
          onPress={() => navigation.navigate('Wallet', { driverId })}
        >
          <View style={styles.walletInfo}>
            <View style={styles.walletIconContainer}>
              <Wallet size={24} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={styles.walletLabel}>Миний данс</Text>
              <Text style={styles.walletBalance}>{walletBalance.toLocaleString()}₮</Text>
            </View>
          </View>
          <View style={styles.rechargeButton}>
            <Text style={styles.rechargeText}>Цэнэглэх</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Хувийн мэдээлэл</Text>
        <View style={styles.menuGroup}>
          <MenuOption 
            title="Хувийн мэдээлэл" 
            icon={<User size={20} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('ProfileSettings', { driverId })} 
          />
          <View style={styles.divider} />
          <MenuOption 
            title="Тээврийн хэрэгсэл" 
            icon={<Home size={20} color={theme.colors.primary} />} 
            onPress={() => navigation.navigate('VehicleSettings', { driverId: route.params?.driverId })} 
          />
          <View style={styles.divider} />
          <MenuOption 
            title="Баримт бичиг" 
            icon={<DollarSign size={20} color={theme.colors.primary} />} 
            onPress={() => navigation.navigate('Documents', { driverId: route.params?.driverId })} 
            isLast
          />
        </View>

        <Text style={styles.sectionTitle}>Бусад</Text>
        <View style={styles.menuGroup}>
          <MenuOption 
            title="Ажлын түүх" 
            icon={<History size={20} color={theme.colors.textSecondary} />} // Changed icon
            onPress={() => navigation.navigate('JobHistory')} 
          />
          <View style={styles.divider} />
          <MenuOption 
            title="Мэдэгдэл" 
            icon={<HelpCircle size={20} color={theme.colors.textSecondary} />} 
            onPress={() => navigation.navigate('NotificationSettings')} 
          />
          <View style={styles.divider} />
          <MenuOption 
            title="Тусламж" 
            icon={<HelpCircle size={20} color={theme.colors.textSecondary} />}
            onPress={() => navigation.navigate('Support')} 
            isLast
          />
        </View>
        
        <TouchableOpacity style={styles.logoutButton} onPress={() => navigation.replace('Login')}>
          <Text style={styles.logoutText}>Гарах</Text>
        </TouchableOpacity>
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
    paddingTop: 60, 
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.m,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.success,
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  driverName: {
    ...theme.typography.h2,
    fontSize: 24,
    marginBottom: 4,
  },
  driverId: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.s,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ratingText: {
    fontWeight: 'bold',
    marginRight: 4,
    color: theme.colors.text,
  },
  ratingCount: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  sectionTitle: {
    ...theme.typography.h3,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
    color: theme.colors.textSecondary,
    fontSize: 14,
    textTransform: 'uppercase',
  },
  menuGroup: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    overflow: 'hidden',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.surface,
  },
  menuOptionLast: {
    borderBottomWidth: 0,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: theme.spacing.m,
    width: 24,
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  menuValue: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.background,
    marginLeft: 50,
  },
  logoutButton: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.m,
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  // Wallet Styles
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.l,
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40', // 25% opacity
    elevation: 2,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  walletInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20', // 12% opacity
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.m,
  },
  walletLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  walletBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  rechargeButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rechargeText: {
    color: theme.colors.black,
    fontWeight: '600',
    fontSize: 14,
  }
});
