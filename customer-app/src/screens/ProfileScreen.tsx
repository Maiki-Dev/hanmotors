import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Modal, TextInput, Dimensions, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import { customerService } from '../services/api';
import { API_URL } from '../config';
import { io } from 'socket.io-client';
import { LogOut, User, Shield, HelpCircle, Settings, Star, ChevronRight, Edit3, Wallet, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // QPay State
  const [qpayVisible, setQpayVisible] = useState(false);
  const [qpayInvoice, setQpayInvoice] = useState<any>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  useEffect(() => {
    fetchProfile();
    
    let socket: any;
    if (user?._id) {
        socket = io(API_URL);
        socket.emit('customerJoin', user._id);

        // Listen for wallet updates
        socket.on('walletUpdated', (data: any) => {
            setProfile((prev: any) => ({
                ...prev,
                wallet: data.balance,
                transactions: data.transactions
            }));
        });
    }

    return () => {
        if (socket) socket.disconnect();
    };
  }, [user]);

  const fetchProfile = async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await customerService.getProfile(user._id);
      setProfile(response.data);
    } catch (error) {
      console.log('Error fetching profile', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    setEditName(profile?.name || user?.name || '');
    setEditEmail(profile?.email || user?.email || '');
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!user?._id) return;
    
    try {
        await customerService.updateProfile(user._id, { name: editName, email: editEmail });
        Alert.alert('Амжилттай', 'Мэдээлэл шинэчлэгдлээ');
        setEditModalVisible(false);
        fetchProfile();
    } catch (error: any) {
        Alert.alert('Алдаа', error.response?.data?.message || 'Мэдээлэл шинэчлэхэд алдаа гарлаа');
    }
  };

  const handleTopUp = async () => {
    if (!user?._id) {
      Alert.alert('Алдаа', 'Хэрэглэгчийн мэдээлэл олдсонгүй');
      return;
    }

    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      Alert.alert('Алдаа', 'Зөв дүн оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/payment/qpay/create-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: user._id, amount: Number(topUpAmount) })
      });
      
      const data = await response.json();

      if (response.ok && (data.qr_image || data.qPay_shortUrl)) {
        setQpayInvoice(data);
        setModalVisible(false);
        setQpayVisible(true);
        setTopUpAmount('');
      } else {
        const errorMessage = data.details 
          ? `${data.message}\n\n${typeof data.details === 'object' ? JSON.stringify(data.details) : data.details}`
          : (data.message || 'QPay нэхэмжлэх үүсгэхэд алдаа гарлаа.');
        Alert.alert('Алдаа', errorMessage);
      }
    } catch (error: any) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!qpayInvoice) return;
    
    setCheckingPayment(true);
    try {
        const response = await fetch(`${API_URL}/api/payment/qpay/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                invoiceId: qpayInvoice.invoice_id,
                customerId: user?._id 
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            Alert.alert('Амжилттай', 'Төлбөр төлөгдлөө!');
            setQpayVisible(false);
            setQpayInvoice(null);
            fetchProfile(); 
        } else {
            Alert.alert('Мэдээлэл', 'Төлбөр хараахан төлөгдөөгүй байна.');
        }
    } catch (error) {
        Alert.alert('Алдаа', 'Төлбөр шалгахад алдаа гарлаа');
    } finally {
        setCheckingPayment(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Гарах',
      'Та гарахдаа итгэлтэй байна уу?',
      [
        { text: 'Болиулах', style: 'cancel' },
        { 
          text: 'Гарах', 
          style: 'destructive',
          onPress: () => dispatch(logout()) 
        }
      ]
    );
  };

  const renderMenuItem = (icon: React.ReactNode, title: string, color: string, isLast = false, onPress?: () => void) => (
    <TouchableOpacity 
      style={[styles.menuItem, isLast && styles.lastMenuItem]} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.menuIconBox, { backgroundColor: `${color}20` }]}>
        {icon}
      </View>
      <Text style={[styles.menuText, title === 'Гарах' && { color: theme.colors.error }]}>{title}</Text>
      <ChevronRight size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, '#1a2138', '#0f1322']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative background elements */}
      <LinearGradient
        colors={[theme.colors.primary, 'transparent']}
        style={[styles.orb, styles.orb1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.secondary]}
                style={styles.avatarGradient}
              >
                <View style={styles.avatarInner}>
                  <User size={40} color={theme.colors.text} />
                </View>
              </LinearGradient>
              <TouchableOpacity style={styles.editIcon} onPress={openEditModal}>
                <BlurView intensity={50} tint="dark" style={styles.editIconBlur}>
                  <Edit3 size={14} color={theme.colors.text} />
                </BlurView>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.name}>{profile?.name || user?.phone || 'Зочин'}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            
            <View style={styles.statsRow}>
              {profile?.rating && (
                <BlurView intensity={30} tint="dark" style={styles.statBadge}>
                  <Star size={14} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.statText}>{profile.rating.toFixed(1)}</Text>
                </BlurView>
              )}
              
              <BlurView intensity={30} tint="dark" style={[styles.statBadge, styles.walletBadge]}>
                <Wallet size={14} color={theme.colors.primary} />
                <Text style={[styles.statText, { color: theme.colors.primary }]}>
                  {profile?.wallet?.toLocaleString() || 0}₮
                </Text>
              </BlurView>
              
              <TouchableOpacity 
                onPress={() => setModalVisible(true)}
              >
                 <LinearGradient
                    colors={[theme.colors.primary, '#f5ba31']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.topUpButton}
                  >
                  <Text style={styles.topUpText}>+</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Хувийн тохиргоо</Text>
            <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
              {renderMenuItem(<User size={20} color={theme.colors.primary} />, 'Хувийн мэдээлэл засах', theme.colors.primary, false, openEditModal)}
              {renderMenuItem(<Shield size={20} color="#4CAF50" />, 'Нууцлал ба Аюулгүй байдал', '#4CAF50')}
              {renderMenuItem(<Settings size={20} color="#9C27B0" />, 'Тохиргоо', '#9C27B0', true)}
            </BlurView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Бусад</Text>
            <BlurView intensity={30} tint="dark" style={styles.menuContainer}>
              {renderMenuItem(<HelpCircle size={20} color="#FF9800" />, 'Тусламж & Дэмжлэг', '#FF9800')}
              {renderMenuItem(<LogOut size={20} color={theme.colors.error} />, 'Гарах', theme.colors.error, true, handleLogout)}
            </BlurView>
          </View>

          <Text style={styles.versionText}>Хувилбар 1.0.0</Text>
        </ScrollView>
      </SafeAreaView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setEditModalVisible(false)}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <User size={32} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.modalTitle}>Мэдээлэл засах</Text>
            
            <Text style={styles.inputLabel}>Нэр</Text>
            <TextInput
              style={styles.input}
              placeholder="Таны нэр"
              placeholderTextColor={theme.colors.textSecondary}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.inputLabel}>И-мэйл</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleUpdateProfile}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#f5ba31']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.confirmButtonText}>Хадгалах</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </BlurView>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalContainer}>
          <BlurView intensity={80} tint="dark" style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <Wallet size={32} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.modalTitle}>Хэтэвч цэнэглэх</Text>
            <Text style={styles.modalSubtitle}>Цэнэглэх дүнгээ оруулна уу</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Дүн (₮)"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              autoFocus
            />
            
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleTopUp}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, '#f5ba31']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={styles.confirmButtonText}>Цэнэглэх</Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </BlurView>
      </Modal>
      <Modal
        animationType="fade"
        transparent={true}
        visible={qpayVisible}
        onRequestClose={() => setQpayVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalContainer}>
          <BlurView intensity={90} tint="dark" style={[styles.modalContent, { padding: 0 }]}>
             <ScrollView contentContainerStyle={{ padding: 24, alignItems: 'center', width: '100%' }}>
                <TouchableOpacity 
                style={[styles.closeButton, { top: 16, right: 16, zIndex: 10 }]} 
                onPress={() => setQpayVisible(false)}
                >
                <X size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>QPay Төлбөр</Text>
                
                <View style={styles.qrContainer}>
                    {qpayInvoice?.qr_image ? (
                        <Image 
                            source={{ uri: `data:image/png;base64,${qpayInvoice.qr_image}` }} 
                            style={styles.qrImage}
                        />
                    ) : (
                        <ActivityIndicator color={theme.colors.primary} />
                    )}
                </View>
                
                <Text style={styles.qrInstruction}>
                    Банкны аппликейшнээр уншуулж төлнө үү.
                </Text>

                {qpayInvoice?.urls && (
                <View style={styles.bankListContainer}>
                    <Text style={styles.bankListTitle}>Банкны апп сонгох:</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.bankList}
                    >
                    {qpayInvoice.urls.map((bank: any, index: number) => (
                        <TouchableOpacity 
                        key={index} 
                        style={styles.bankItem}
                        onPress={() => Linking.openURL(bank.link)}
                        >
                        <Image source={{ uri: bank.logo }} style={styles.bankLogo} />
                        <Text style={styles.bankName} numberOfLines={1}>{bank.name}</Text>
                        </TouchableOpacity>
                    ))}
                    </ScrollView>
                </View>
                )}

                <TouchableOpacity 
                style={styles.confirmButton}
                onPress={checkPaymentStatus}
                disabled={checkingPayment}
                >
                <LinearGradient
                    colors={[theme.colors.primary, '#f5ba31']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                >
                    {checkingPayment ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text style={styles.confirmButtonText}>Төлбөр шалгах</Text>
                    )}
                </LinearGradient>
                </TouchableOpacity>
            </ScrollView>
          </BlurView>
        </BlurView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 150,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -50,
    left: -100,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    marginBottom: 15,
    position: 'relative',
  },
  avatarGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 15,
    overflow: 'hidden',
  },
  editIconBlur: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 5,
  },
  phone: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  walletBadge: {
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.2)',
  },
  statText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
    color: theme.colors.textPrimary,
  },
  topUpButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topUpText: {
    color: theme.colors.black,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: -2,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 15,
    marginLeft: 5,
  },
  menuContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 1,
  },
  modalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.3)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginLeft: 4,
    fontSize: 14,
  },
  input: {
    width: '100%',
    height: 56,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    marginBottom: 24,
    fontSize: 18,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  confirmButton: {
    width: '100%',
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrContainer: {
    width: 200,
    height: 200,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 20,
    overflow: 'hidden',
  },
  qrImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  qrInstruction: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    marginBottom: 20,
    fontSize: 14,
  },
  bankListContainer: {
    width: '100%',
    marginBottom: 20,
  },
  bankListTitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    marginBottom: 10,
  },
  bankList: {
    paddingBottom: 10,
  },
  bankItem: {
    alignItems: 'center',
    marginRight: 15,
    width: 60,
  },
  bankLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: 5,
    resizeMode: 'contain',
    backgroundColor: 'white',
  },
  bankName: {
    fontSize: 10,
    textAlign: 'center',
    color: theme.colors.textSecondary,
  },
});

export default ProfileScreen;
