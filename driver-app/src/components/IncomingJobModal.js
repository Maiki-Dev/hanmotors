import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { theme } from '../constants/theme';
import { MapPin, Clock, Truck, Car, Anchor, X, Check, Navigation } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export const IncomingJobModal = ({ visible, job, onAccept, onDecline, userLocation }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(100))[0];

  useEffect(() => {
    if (visible && job) {
      // Calculate remaining time based on creation time (2 mins = 120s)
      const created = job.createdAt ? new Date(job.createdAt).getTime() : Date.now();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - created) / 1000);
      const initialTimeLeft = Math.max(0, 120 - elapsedSeconds);

      setTimeLeft(initialTimeLeft);
      
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 15,
        })
      ]).start();

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
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(100);
    }
  }, [visible, job]);

  if (!job) return null;

  const getIcon = () => {
    switch (job.serviceType) {
      case 'Cargo': return <Truck size={32} color={theme.colors.primary} />;
      case 'Tow': return <Anchor size={32} color={theme.colors.primary} />;
      default: return <Car size={32} color={theme.colors.primary} />;
    }
  };

  // Calculate distance from driver to pickup if userLocation is provided
  const getDistanceText = () => {
    if (!userLocation || !job.pickupLocation?.coordinates) return 'Зай тодорхойгүй';
    
    // Simple Haversine approximation or just placeholder if complex math is needed
    // For now, let's assume we want to show it if we have it. 
    // Since I don't want to import heavy math utils here, I'll keep it simple or use the one from job if available.
    // If job has 'distance' field (trip distance), show that.
    
    // Let's show the trip distance (pickup to dropoff) which is more relevant for price
    // And maybe driver-to-pickup distance if available in job metadata (often calculated by backend)
    return job.distance ? `${job.distance.toFixed(1)} км` : '';
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Animated.View style={[
          styles.card, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.serviceInfo}>
              <View style={styles.iconContainer}>
                {getIcon()}
              </View>
              <View>
                <Text style={styles.serviceType}>{job.serviceType || 'Service'}</Text>
                <Text style={styles.subText}>Шинэ захиалга</Text>
              </View>
            </View>
            <View style={styles.timerWrapper}>
              <Text style={[styles.timerText, timeLeft < 10 && styles.timerUrgent]}>
                {timeLeft}
              </Text>
              <Text style={styles.secText}>сек</Text>
            </View>
          </View>

          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>ТООЦООЛСОН ОРЛОГО</Text>
            <Text style={styles.priceValue}>₮{job.price?.toLocaleString() || '0'}</Text>
          </View>

          {/* Route Section */}
          <View style={styles.routeSection}>
            <View style={styles.timelineContainer}>
              <View style={[styles.dot, styles.pickupDot]} />
              <View style={styles.line} />
              <View style={[styles.dot, styles.dropoffDot]} />
            </View>
            
            <View style={styles.addressesContainer}>
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Авах хаяг</Text>
                <Text style={styles.addressText} numberOfLines={2}>
                  {job.pickupLocation?.address || 'Хаяг тодорхойгүй'}
                </Text>
              </View>
              
              <View style={styles.addressSpacer} />
              
              <View style={styles.addressRow}>
                <Text style={styles.addressLabel}>Хүргэх хаяг</Text>
                <Text style={styles.addressText} numberOfLines={2}>
                  {job.dropoffLocation?.address || 'Хаяг тодорхойгүй'}
                </Text>
              </View>
            </View>
          </View>

          {/* Additional Info Grid */}
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <Navigation size={20} color={theme.colors.textSecondary} />
              <Text style={styles.gridText}>{getDistanceText()}</Text>
            </View>
            {/* Can add more info here like payment type */}
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.declineButton} 
              onPress={onDecline}
              activeOpacity={0.7}
            >
              <X size={28} color="#FF4444" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.acceptButton} 
              onPress={onAccept}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptText}>ЗАХИАЛГА АВАХ</Text>
              <View style={styles.acceptIconBg}>
                <Check size={24} color="#000" />
              </View>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  serviceType: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    color: '#888',
    fontSize: 12,
  },
  timerWrapper: {
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timerUrgent: {
    color: '#FF4444',
  },
  secText: {
    color: '#666',
    fontSize: 10,
    marginTop: -2,
  },
  priceSection: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#252525',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  priceLabel: {
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  priceValue: {
    color: theme.colors.primary,
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(251, 191, 36, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  routeSection: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineContainer: {
    alignItems: 'center',
    width: 24,
    marginRight: 12,
    paddingVertical: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  pickupDot: {
    borderColor: theme.colors.primary,
    backgroundColor: '#1A1A1A',
  },
  dropoffDot: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#333',
    marginVertical: 4,
  },
  addressesContainer: {
    flex: 1,
  },
  addressRow: {
    minHeight: 40,
    justifyContent: 'center',
  },
  addressSpacer: {
    height: 16,
  },
  addressLabel: {
    color: '#666',
    fontSize: 10,
    marginBottom: 2,
  },
  addressText: {
    color: '#EEE',
    fontSize: 15,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  gridText: {
    color: '#CCC',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A1010',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  acceptButton: {
    flex: 1,
    height: 64,
    backgroundColor: theme.colors.primary,
    borderRadius: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingLeft: 24,
  },
  acceptText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  acceptIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

