import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { Input } from '../components/Input';
import { GoldButton } from '../components/GoldButton';
import { User, Mail, Phone, Camera } from 'lucide-react-native';
import { API_URL } from '../config';
import { uploadToCloudinary } from '../utils/cloudinary';

export default function ProfileSettingsScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    profilePhoto: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}`);
      const data = await response.json();
      if (response.ok) {
        // Split name if firstName/lastName are missing
        const nameParts = data.name ? data.name.split(' ') : ['', ''];
        setProfile({
          firstName: data.firstName || nameParts.slice(1).join(' ') || '',
          lastName: data.lastName || nameParts[0] || '',
          email: data.email,
          phone: data.phone,
          profilePhoto: data.profilePhoto
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission needed', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await handleUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleUpload = async (asset) => {
    try {
      setUploading(true);
      const imageUrl = await uploadToCloudinary(asset);
      setProfile(prev => ({ ...prev, profilePhoto: imageUrl }));
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
      
      if (response.ok) {
        const updatedData = await response.json();
        Alert.alert('Амжилттай', 'Профайл амжилттай шинэчлэгдлээ', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Алдаа', 'Профайл шинэчлэхэд алдаа гарлаа');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Профайл засах" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            {profile.profilePhoto ? (
              <Image source={{ uri: profile.profilePhoto }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{fontSize: 24, color: theme.colors.textSecondary}}>
                  {profile.lastName?.[0]}{profile.firstName?.[0]}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.cameraButton} onPress={handleImagePick} disabled={uploading}>
              {uploading ? (
                <ActivityIndicator size="small" color={theme.colors.black} />
              ) : (
                <Camera size={20} color={theme.colors.black} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input
              label="Овог"
              value={profile.lastName}
              onChangeText={(text) => setProfile({...profile, lastName: text})}
              icon={<User size={20} color={theme.colors.textSecondary} />}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Нэр"
              value={profile.firstName}
              onChangeText={(text) => setProfile({...profile, firstName: text})}
              icon={<User size={20} color={theme.colors.textSecondary} />}
            />
          </View>
        </View>
        
        <Input
          label="И-мэйл"
          value={profile.email}
          onChangeText={(text) => setProfile({...profile, email: text})}
          keyboardType="email-address"
          icon={<Mail size={20} color={theme.colors.textSecondary} />}
        />
        
        <Input
          label="Phone Number"
          value={profile.phone}
          onChangeText={(text) => setProfile({...profile, phone: text})}
          keyboardType="phone-pad"
          icon={<Phone size={20} color={theme.colors.textSecondary} />}
        />

        <View style={styles.spacer} />
        
        <GoldButton 
          title="SAVE CHANGES" 
          onPress={handleSave} 
          loading={saving}
        />
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  spacer: {
    height: theme.spacing.xl,
  }
});
