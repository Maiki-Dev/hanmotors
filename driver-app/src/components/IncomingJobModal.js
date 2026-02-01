import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity } from 'react-native';
import { theme } from '../constants/theme';
import { GoldButton } from './GoldButton';
import { MapPin, Clock, CircleDollarSign, Car, Truck, Anchor } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const IncomingJobModal = ({ visible, job, onAccept, onDecline }) => {
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (visible) {
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onDecline(); // Auto decline
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [visible]);

  if (!job) return null;

  const getIcon = () => {
    switch (job.serviceType) {
      case 'Cargo': return <Truck size={32} color={theme.colors.black} />;
      case 'Tow': return <Anchor size={32} color={theme.colors.black} />;
      default: return <Car size={32} color={theme.colors.black} />;
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.serviceIcon}>
              {getIcon()}
            </View>
            <View>
              <Text style={styles.serviceType}>{job.serviceType}</Text>
              <Text style={styles.distance}>2.5 км зайтай</Text>
            </View>
            <View style={styles.timerContainer}>
              <Text style={styles.timerText}>{timeLeft}с</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Тооцоолсон орлого</Text>
            <Text style={styles.price}>₮{job.price?.toLocaleString() || '0'}</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.locationRow}>
              <MapPin size={20} color={theme.colors.primary} />
              <Text style={styles.locationText} numberOfLines={1}>{job.pickupLocation?.address}</Text>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.locationRow}>
              <MapPin size={20} color={theme.colors.success} />
              <Text style={styles.locationText} numberOfLines={1}>{job.dropoffLocation?.address}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
              <Text style={styles.declineText}>ТАТГАЛЗАХ</Text>
            </TouchableOpacity>
            <GoldButton 
              title="ЗАХИАЛГА АВАХ" 
              onPress={onAccept} 
              style={styles.acceptButton}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: theme.colors.overlay,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: theme.colors.surface, // Or theme.colors.glass if we want glass effect
    margin: theme.spacing.m,
    marginBottom: theme.spacing.xl, // Lift up a bit
    borderRadius: 30,
    padding: theme.spacing.l,
    borderWidth: 1,
    borderColor: theme.colors.primary, // Gold border for "Incoming" attention
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  serviceIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(251, 191, 36, 0.2)', // Glassy primary
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  serviceType: {
    ...theme.typography.h2,
    fontSize: 20,
  },
  distance: {
    ...theme.typography.caption,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  timerContainer: {
    marginLeft: 'auto',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: theme.colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  timerText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    fontWeight: 'bold',
    fontSize: 16,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.surfaceLight,
    marginVertical: theme.spacing.m,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.l,
    backgroundColor: theme.colors.surfaceLight, // Subtle background
    padding: theme.spacing.m,
    borderRadius: 20,
  },
  priceLabel: {
    ...theme.typography.caption,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  price: {
    ...theme.typography.h1,
    fontSize: 36,
    color: theme.colors.success,
    textShadowColor: 'rgba(34, 197, 94, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  routeContainer: {
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.s,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.s,
  },
  locationText: {
    ...theme.typography.body,
    marginLeft: theme.spacing.m,
    flex: 1,
    fontSize: 16,
  },
  routeLine: {
    height: 24,
    borderLeftWidth: 2,
    borderLeftColor: theme.colors.surfaceLight,
    marginLeft: 10, // Adjusted for larger icons if needed
    marginVertical: 4,
    borderStyle: 'dashed', // Dashed line for route
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.m,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 30, // Pill shape
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  declineText: {
    ...theme.typography.button,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  acceptButton: {
    flex: 2,
    borderRadius: 30, // Pill shape match
  }
});
