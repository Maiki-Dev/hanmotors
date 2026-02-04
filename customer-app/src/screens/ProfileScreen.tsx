import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { theme } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import { customerService } from '../services/api';
import { LogOut, User, Shield, HelpCircle, Settings, Star, ChevronRight, Edit3 } from 'lucide-react-native';

const ProfileScreen = () => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
