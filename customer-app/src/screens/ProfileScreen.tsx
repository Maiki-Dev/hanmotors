import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView, Modal, TextInput } from 'react-native';
import { theme } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import { customerService } from '../services/api';
import { LogOut, User, Shield, HelpCircle, Settings, Star, ChevronRight, Edit3, Wallet } from 'lucide-react-native';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');

  useEffect(() => {
    fetchProfile();
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

  const handleTopUp = async () => {
    if (!user?._id) {
      Alert.alert('Алдаа', 'Хэрэглэгчийн мэдээлэл олдсонгүй');
      return;
    }

    if (!topUpAmount || isNaN(Number(topUpAmount)) || Number(topUpAmount) <= 0) {
      Alert.alert('Алдаа', 'Зөв дүн оруулна уу');
      return;
    }

    try {
      await customerService.topUpWallet(user._id, Number(topUpAmount));
      Alert.alert('Амжилттай', 'Таны хэтэвч амжилттай цэнэглэгдлээ');
      setModalVisible(false);
      setTopUpAmount('');
      fetchProfile();
    } catch (error: any) {
      Alert.alert('Алдаа', 'Хэтэвч цэнэглэхэд алдаа гарлаа: ' + (error.response?.data?.message || error.message));
      console.log('TopUp Error:', error.response?.status, error.response?.data);
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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
            <View style={styles.avatarContainer}>
                <View style={styles.avatarPlaceholder}>
                     <User size={40} color={theme.colors.textSecondary} />
                </View>
                <TouchableOpacity style={styles.editIcon}>
                    <Edit3 size={16} color="white" />
                </TouchableOpacity>
            </View>
            <Text style={styles.name}>{profile?.name || user?.phone || 'Зочин'}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            
            {profile?.rating && (
            <View style={styles.ratingContainer}>
                <Star size={16} color="#FFD700" fill="#FFD700" />
                <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
            </View>
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                <View style={[styles.ratingContainer, { backgroundColor: theme.colors.primary, marginTop: 0 }]}>
                    <Wallet size={16} color="white" />
                    <Text style={[styles.ratingText, { color: 'white' }]}>
                        {profile?.wallet?.toLocaleString() || 0}₮
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[styles.ratingContainer, { backgroundColor: '#4CAF50', marginTop: 0 }]}
                    onPress={() => setModalVisible(true)}
                >
                    <Text style={[styles.ratingText, { color: 'white', marginLeft: 0 }]}>Цэнэглэх</Text>
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Хувийн тохиргоо</Text>
            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#E3F2FD' }]}>
                        <User size={20} color="#1565C0" />
                    </View>
                    <Text style={styles.menuText}>Хувийн мэдээлэл засах</Text>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#E8F5E9' }]}>
                        <Shield size={20} color="#2E7D32" />
                    </View>
                    <Text style={styles.menuText}>Нууцлал ба Аюулгүй байдал</Text>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#F3E5F5' }]}>
                        <Settings size={20} color="#7B1FA2" />
                    </View>
                    <Text style={styles.menuText}>Тохиргоо</Text>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>
        </View>

        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Бусад</Text>
            <View style={styles.menuContainer}>
                <TouchableOpacity style={styles.menuItem}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#FFF3E0' }]}>
                        <HelpCircle size={20} color="#EF6C00" />
                    </View>
                    <Text style={styles.menuText}>Тусламж & Дэмжлэг</Text>
                    <ChevronRight size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.menuItem, styles.lastMenuItem]} onPress={handleLogout}>
                    <View style={[styles.menuIconBox, { backgroundColor: '#FFEBEE' }]}>
                        <LogOut size={20} color="#C62828" />
                    </View>
                    <Text style={[styles.menuText, { color: theme.colors.error }]}>Гарах</Text>
                </TouchableOpacity>
            </View>
        </View>

        <Text style={styles.versionText}>Хувилбар 1.0.0</Text>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Хэтэвч цэнэглэх</Text>
            <TextInput
              style={styles.input}
              placeholder="Дүн (₮)"
              keyboardType="numeric"
              value={topUpAmount}
              onChangeText={setTopUpAmount}
              placeholderTextColor="#999"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleTopUp}
              >
                <Text style={styles.confirmButtonText}>Цэнэглэх</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  confirmButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.surfaceLight,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
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
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
    color: theme.colors.text,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 15,
    marginLeft: 5,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.surfaceLight,
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
    color: theme.colors.text,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 20,
  },
});

export default ProfileScreen;
