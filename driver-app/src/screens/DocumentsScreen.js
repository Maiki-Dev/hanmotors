import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { GoldButton } from '../components/GoldButton';
import { Upload, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';
import { API_URL } from '../config';
import { uploadToCloudinary } from '../utils/cloudinary';

const DocumentItem = ({ title, status, onUpload, disabled }) => (
  <View style={[styles.docItem, disabled && styles.docItemDisabled]}>
    <View style={styles.docInfo}>
      <Text style={styles.docTitle}>{title}</Text>
      <View style={styles.statusRow}>
        {status === 'approved' ? (
          <>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text style={styles.statusTextVerified}>Баталгаажсан</Text>
          </>
        ) : status === 'rejected' ? (
          <>
            <XCircle size={16} color={theme.colors.error} />
            <Text style={styles.statusTextRejected}>Татгалзсан</Text>
          </>
        ) : (
          <>
            <AlertCircle size={16} color={theme.colors.warning} />
            <Text style={styles.statusTextPending}>Хүлээгдэж байна</Text>
          </>
        )}
      </View>
    </View>
    <TouchableOpacity 
      style={[styles.uploadButton, disabled && styles.uploadButtonDisabled]} 
      onPress={onUpload}
      disabled={disabled}
    >
      <Upload size={20} color={disabled ? theme.colors.textSecondary : theme.colors.primary} />
    </TouchableOpacity>
  </View>
);

export default function DocumentsScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [documents, setDocuments] = useState({
    license: { url: null, status: 'pending' },
    vehicleRegistration: { url: null, status: 'pending' }
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${API_URL}/api/driver/${driverId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.documents) {
          // Ensure structure matches expectation
          setDocuments({
            license: data.documents.license || { url: null, status: 'pending' },
            vehicleRegistration: data.documents.vehicleRegistration || { url: null, status: 'pending' },
            insurance: data.documents.insurance || { url: null, status: 'pending' }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [driverId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const handleUpload = (type) => {
    if (loading || saving) return; 
    
    Alert.alert(
      'Баримт бичиг оруулах',
      `Үйлдэл сонгоно уу: ${type === 'license' ? 'Жолооны үнэмлэх' : type === 'vehicleRegistration' ? 'Тээврийн хэрэгслийн гэрчилгээ' : 'Даатгал'}`,
      [
        { text: 'Болих', style: 'cancel' },
        { 
          text: 'Зургийн цомгоос сонгох', 
          onPress: () => pickAndUpload(type) 
        }
      ]
    );
  };

  const pickAndUpload = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Эрх шаардлагатай', 'Зураг оруулахын тулд зөвшөөрөл өгнө үү.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await uploadDocument(type, result.assets[0]);
      }
    } catch (error) {
      console.error('ImagePicker Error:', error);
      Alert.alert('Алдаа', 'Зураг сонгоход алдаа гарлаа');
    }
  };

  const uploadDocument = async (type, imageAsset) => {
    try {
      setSaving(true);
      
      // 1. Upload to Cloudinary
      const imageUrl = await uploadToCloudinary(imageAsset);
      
      // 2. Update backend
      const updatedDoc = { url: imageUrl, status: 'pending' };
      const newDocs = { ...documents, [type]: updatedDoc };
      
      const response = await fetch(`${API_URL}/api/driver/${driverId}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: newDocs })
      });
      
      if (response.ok) {
        setDocuments(newDocs);
        Alert.alert('Амжилттай', 'Баримт бичиг амжилттай илгээгдлээ. Шалгахад түр хүлээнэ үү.');
        fetchDocuments(); 
      } else {
        Alert.alert('Алдаа', 'Хадгалахад алдаа гарлаа');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Алдаа', 'Илгээхэд алдаа гарлаа: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="Баримт бичиг" onBack={() => navigation.goBack()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Баримт бичиг" onBack={() => navigation.goBack()} />
      
      <ScrollView 
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        <Text style={styles.description}>
          Баримт бичгийн тод зургийг оруулна уу. Баталгаажуулалт 24 цаг хүртэл үргэлжилж магадгүй.
        </Text>

        <DocumentItem 
          title="Жолооны үнэмлэх" 
          status={documents.license?.status} 
          onUpload={() => handleUpload('license')}
          disabled={saving}
        />

        <DocumentItem 
          title="Тээврийн хэрэгслийн гэрчилгээ" 
          status={documents.vehicleRegistration?.status} 
          onUpload={() => handleUpload('vehicleRegistration')}
          disabled={saving}
        />

        <DocumentItem 
          title="Жолоочийн хариуцлагын даатгал" 
          status={documents.insurance?.status} 
          onUpload={() => handleUpload('insurance')}
          disabled={saving}
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
  description: {
    ...theme.typography.bodySmall,
    marginBottom: theme.spacing.xl,
  },
  docItem: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.surfaceLight,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusTextVerified: {
    ...theme.typography.caption,
    color: theme.colors.success,
    marginLeft: 4,
  },
  statusTextPending: {
    ...theme.typography.caption,
    color: theme.colors.warning,
    marginLeft: 4,
  },
  statusTextRejected: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginLeft: 4,
  },
  uploadButton: {
    padding: theme.spacing.s,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.s,
  },
  docItemDisabled: {
    opacity: 0.6,
  },
  uploadButtonDisabled: {
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
