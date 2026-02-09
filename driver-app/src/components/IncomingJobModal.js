import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, TouchableOpacity, Animated, Platform } from 'react-native';
import { theme } from '../constants/theme';
import { MapPin, Clock, Truck, Car, Anchor, X, Check, Navigation, User, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur'; // Check if available, otherwise fallback to View

const { width } = Dimensions.get('window');

export const IncomingJobModal = ({ visible, job, onAccept, onDecline, userLocation }) => {
  const [timeLeft, setTimeLeft] = useState(30);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(100))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    if (visible && job) {
      // Calculate remaining time
      const created = job.createdAt ? new Date(job.createdAt).getTime() : Date.now();
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - created) / 1000);
      const initialTimeLeft = Math.max(0, 120 - elapsedSeconds);

      setTimeLeft(initialTimeLeft);
      
      // Entrance Animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 12,
          stiffness: 100,
        })
      ]).start();

      // Pulse Animation for Timer
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          })
        ])
      ).start();

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
      case 'Cargo': return <Truck size={28} color="#FFF" />;
      case 'Tow': return <Anchor size={28} color="#FFF" />;
      default: return <Car size={28} color="#FFF" />;
    }
  };

  const getDistanceText = () => {
    return job.distance ? `${job.distance.toFixed(1)} км` : '...';
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Background Blur Effect */}
        {Platform.OS === 'ios' ? (
          <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        ) : (
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        )}

        <Animated.View style={[
          styles.cardContainer, 
          { 
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          
          {/* Main Card */}
          <LinearGradient
            colors={['#2A2A2A', '#1A1A1A']}
            style={styles.card}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Top Badge - Service Type */}
            <View style={styles.headerBadge}>
              <LinearGradient
                colors={[theme.colors.primary, '#F59E0B']}
                style={styles.serviceIconBadge}
              >
                {getIcon()}
              </LinearGradient>
              <View style={styles.headerTextContainer}>
                <Text style={styles.serviceTitle}>{job.serviceType || 'Service'}</Text>
                <Text style={styles.serviceSubtitle}>Шинэ дуудлага ирлээ</Text>
              </View>
              <View style={styles.timerContainer}>
                 <Animated.Text style={[styles.timerText, { transform: [{ scale: pulseAnim }] }]}>
                   {timeLeft}
                 </Animated.Text>
                 <Text style={styles.timerLabel}>сек</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Price - The Hero */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>ОРЛОГО</Text>
              <Text style={styles.priceValue}>
                {job.price?.toLocaleString() || '0'}
                <Text style={styles.currencySymbol}>₮</Text>
              </Text>
            </View>

            {/* Additional Services (Bonuses) */}
            {job.additionalServices && job.additionalServices.length > 0 && (
              <View style={styles.bonusContainer}>
                <Text style={styles.bonusLabel}>НЭМЭЛТ БОНУС</Text>
                <View style={styles.bonusList}>
                  {job.additionalServices.map((service, index) => (
                    <View key={index} style={styles.bonusItem}>
                      <View style={styles.bonusIcon}>
                        <Check size={12} color="#1A1A1A" />
                      </View>
                      <Text style={styles.bonusText}>{service.name}</Text>
                      <Text style={styles.bonusPrice}>+{service.price?.toLocaleString()}₮</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Customer Info (Modern Glass-like Box) */}
            {(job.customerName || job.customerPhone) && (
              <View style={styles.customerBox}>
                <View style={styles.customerRow}>
                  <View style={styles.customerAvatar}>
                    <User size={16} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.customerName}>
                    {job.customerName || job.customerPhone}
                  </Text>
                </View>
                {job.customerName && job.customerPhone && (
                  <View style={styles.customerRow}>
                    <View style={styles.customerAvatar}>
                      <Phone size={16} color={theme.colors.textSecondary} />
                    </View>
                    <Text style={styles.customerPhone}>{job.customerPhone}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Route Visualization */}
            <View style={styles.routeContainer}>
              <View style={styles.routeRow}>
                <View style={styles.routeIconContainer}>
                   <View style={[styles.dot, styles.pickupDot]} />
                   <View style={styles.line} />
                   <View style={[styles.dot, styles.dropoffDot]} />
                </View>
                <View style={styles.routeInfo}>
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>АВАХ</Text>
                    <Text style={styles.locationText} numberOfLines={1}>{job.pickupLocation?.address || 'Тодорхойгүй'}</Text>
                  </View>
                  <View style={styles.locationSpacer} />
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>ХҮРГЭХ</Text>
                    <Text style={styles.locationText} numberOfLines={1}>{job.dropoffLocation?.address || 'Тодорхойгүй'}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Distance Badge */}
            <View style={styles.metaContainer}>
              <View style={styles.metaBadge}>
                <Navigation size={14} color="#BBB" />
                <Text style={styles.metaText}>{getDistanceText()}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionContainer}>
              <TouchableOpacity 
                style={styles.declineButton}
                onPress={onDecline}
                activeOpacity={0.7}
              >
                <X size={32} color="#EF4444" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.acceptButtonWrapper}
                onPress={onAccept}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[theme.colors.primary, '#F59E0B']}
                  style={styles.acceptButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.acceptText}>ХҮЛЭЭН АВАХ</Text>
                  <Check size={24} color="#1A1A1A" strokeWidth={3} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  cardContainer: {
    width: width - 32,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 25,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  serviceIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  serviceTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  serviceSubtitle: {
    color: '#AAA',
    fontSize: 12,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timerText: {
    color: theme.colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  timerLabel: {
    color: '#666',
    fontSize: 9,
    marginTop: -2,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 12,
  },
  priceContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  priceLabel: {
    color: '#666',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 4,
  },
  priceValue: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '900',
    textShadowColor: 'rgba(251, 191, 36, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  currencySymbol: {
    fontSize: 24,
    color: theme.colors.primary,
  },
  bonusContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
    width: '100%',
  },
  bonusLabel: {
    color: '#10B981', // Green for bonus
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  bonusList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)', // Light green bg
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bonusIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  bonusText: {
    color: '#E0E0E0',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 6,
  },
  bonusPrice: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerAvatar: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  customerName: {
    color: '#EEE',
    fontSize: 15,
    fontWeight: '600',
  },
  customerPhone: {
    color: '#999',
    fontSize: 13,
  },
  routeContainer: {
    marginBottom: 16,
  },
  routeRow: {
    flexDirection: 'row',
  },
  routeIconContainer: {
    alignItems: 'center',
    width: 20,
    marginRight: 12,
    paddingVertical: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  pickupDot: {
    backgroundColor: '#1A1A1A',
    borderColor: theme.colors.primary,
  },
  dropoffDot: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#333',
    marginVertical: 4,
    borderRadius: 1,
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationItem: {
    minHeight: 32,
    justifyContent: 'center',
  },
  locationSpacer: {
    height: 12,
  },
  locationLabel: {
    color: '#555',
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  locationText: {
    color: '#DDD',
    fontSize: 14,
    fontWeight: '500',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  metaText: {
    color: '#CCC',
    fontSize: 13,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  declineButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2A1010',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  acceptButtonWrapper: {
    flex: 1,
    height: 60,
    borderRadius: 30,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  acceptButton: {
    flex: 1,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  acceptText: {
    color: '#1A1A1A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
