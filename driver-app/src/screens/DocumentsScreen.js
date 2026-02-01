import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { GoldButton } from '../components/GoldButton';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react-native';
import { API_URL } from '../config';

const DocumentItem = ({ title, status, onUpload }) => (
  <View style={styles.docItem}>
    <View style={styles.docInfo}>
      <Text style={styles.docTitle}>{title}</Text>
      <View style={styles.statusRow}>
        {status ? (
          <>
            <CheckCircle size={16} color={theme.colors.success} />
            <Text style={styles.statusTextVerified}>Илгээсэн</Text>
          </>
        ) : (
          <>
            <AlertCircle size={16} color={theme.colors.warning} />
            <Text style={styles.statusTextPending}>Хүлээгдэж байна</Text>
          </>
        )}
      </View>
    </View>
    <TouchableOpacity style={styles.uploadButton} onPress={onUpload}>
      <Upload size={20} color={theme.colors.primary} />
    </TouchableOpacity>
  </View>
);

export default function DocumentsScreen({ navigation, route }) {
  const { driverId } = route.params || {};
  const [documents, setDocuments] = useState({
    licenseUrl: null,
    registrationUrl: null
  });
  const [saving, setSaving] = useState(false);

  // In a real app, this would pick an image and upload to S3/Cloudinary
  // Here we just simulate an upload by setting a dummy URL
  const handleUpload = (type) => {
    Alert.alert(
      'Баримт бичиг оруулах',
      `Үйлдэл сонгоно уу: ${type}`,
      [
        { text: 'Болих', style: 'cancel' },
        { 
          text: 'Зураг авах', 
          onPress: () => simulateUpload(type) 
        },
        { 
          text: 'Зургийн цомгоос сонгох', 
          onPress: () => simulateUpload(type) 
        }
      ]
    );
  };

  const simulateUpload = async (type) => {
    // Simulating upload
    const dummyUrl = `https://fake-url.com/${type}.jpg`;
    const newDocs = { ...documents, [type]: dummyUrl };
    setDocuments(newDocs);

    try {
      setSaving(true);
      const response = await fetch(`${API_URL}/api/driver/${driverId}/documents`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documents: newDocs })
      });
      
      if (response.ok) {
        Alert.alert('Амжилттай', `${type} амжилттай илгээгдлээ`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Баримт бичиг" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Баримт бичгийн тод зургийг оруулна уу. Баталгаажуулалт 24 цаг хүртэл үргэлжилж магадгүй.
        </Text>

        <DocumentItem 
          title="Жолооны үнэмлэх" 
          status={documents.licenseUrl} 
          onUpload={() => handleUpload('licenseUrl')}
        />

        <DocumentItem 
          title="Vehicle Registration" 
          status={documents.registrationUrl} 
          onUpload={() => handleUpload('registrationUrl')}
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
  uploadButton: {
    padding: theme.spacing.s,
    backgroundColor: theme.colors.surfaceLight,
    borderRadius: theme.borderRadius.s,
  }
});
