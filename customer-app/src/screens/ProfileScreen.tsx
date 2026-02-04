import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { RootState } from '../store';
import { customerService } from '../services/api';
import { LogOut, User, Shield, HelpCircle, Settings, Star } from 'lucide-react-native';

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
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => dispatch(logout()) 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
            <User size={40} color={theme.colors.primary} />
        </View>
        <Text style={styles.name}>{profile?.name || user?.phone || 'Guest User'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        {profile?.email && <Text style={styles.email}>{profile.email}</Text>}
        
        {profile?.rating && (
          <View style={styles.ratingContainer}>
            <Star size={16} color="#FFD700" fill="#FFD700" />
            <Text style={styles.ratingText}>{profile.rating.toFixed(1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
                <User size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.menuText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
                <Shield size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.menuText}>Privacy & Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
                <Settings size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuIcon}>
                <HelpCircle size={20} color={theme.colors.text} />
            </View>
            <Text style={styles.menuText}>Help & Support</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <LogOut size={20} color={theme.colors.error} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  name: {
    ...theme.typography.h2,
    color: theme.colors.text,
    marginBottom: 5,
  },
  phone: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  email: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 5,
  },
  ratingText: {
    ...theme.typography.body,
    fontWeight: 'bold',
    marginLeft: 5,
    color: theme.colors.text,
  },
  menuContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    padding: 10,
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: {
    marginRight: 15,
    width: 30,
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
    marginTop: 10,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.error,
  },
  versionText: {
    textAlign: 'center',
    marginTop: 30,
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
});

export default ProfileScreen;
