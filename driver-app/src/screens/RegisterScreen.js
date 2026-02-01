import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform, TouchableOpacity, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { theme } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { API_URL } from '../config';

export default function RegisterScreen({ navigation, route }) {
  const { phone: initialPhone } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [licenseImage, setLicenseImage] = useState(null);
  const [registrationImage, setRegistrationImage] = useState(null);
  
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: initialPhone || '',
    email: '',
    password: '',
    plateNumber: '',
    model: '',
    year: '',
    color: ''
  });

  const pickImage = async (setImage) => {
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
      base64: true,
    });

    if (!result.canceled) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleRegister = async () => {
    if (!formData.lastName || !formData.firstName || !formData.phone || !formData.email || !formData.password) {
      Alert.alert('Алдаа', 'Бүх талбарыг бөглөнө үү');
      return;
    }

    if (!licenseImage || !registrationImage) {
        Alert.alert('Алдаа', 'Бичиг баримтын зургийг оруулна үү');
        return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/driver/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          vehicleType: 'Tow', // Hardcoded
          vehicle: {
            plateNumber: formData.plateNumber,
            model: formData.model,
            year: formData.year,
            color: formData.color
          },
          documents: {
            license: { url: licenseImage, status: 'pending' },
            vehicleRegistration: { url: registrationImage, status: 'pending' }
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Бүртгэл амжилттай', 
          'Та амжилттай бүртгэгдлээ.', 
          [
            { 
              text: 'Ойлголоо', 
              onPress: () => navigation.replace('Main', { driverId: data._id, driverName: data.name }) 
            }
          ]
        );
      } else {
        Alert.alert('Алдаа', data.message || 'Бүртгэл амжилтгүй боллоо');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Алдаа', 'Сүлжээний алдаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Бүртгүүлэх" onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Хувийн мэдээлэл</Text>
          <Input
            label="Овог"
            placeholder="Овог"
            value={formData.lastName}
            onChangeText={(text) => setFormData({...formData, lastName: text})}
          />
          <Input
            label="Нэр"
            placeholder="Нэр"
            value={formData.firstName}
            onChangeText={(text) => setFormData({...formData, firstName: text})}
          />
          <Input
            label="Утас"
            placeholder="99112233"
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            keyboardType="phone-pad"
          />
          <Input
            label="И-мэйл"
            placeholder="name@example.com"
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Нууц үг"
            placeholder="******"
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
            secureTextEntry
          />

          <Text style={styles.sectionTitle}>Тээврийн хэрэгсэл (Ачилтын машин)</Text>
          <Input
            label="Улсын дугаар"
            placeholder="1234 УБА"
            value={formData.plateNumber}
            onChangeText={(text) => setFormData({...formData, plateNumber: text})}
            autoCapitalize="characters"
          />
          <Input
            label="Загвар"
            placeholder="Hyundai Porter"
            value={formData.model}
            onChangeText={(text) => setFormData({...formData, model: text})}
          />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Input
                label="Он"
                placeholder="2015"
                value={formData.year}
                onChangeText={(text) => setFormData({...formData, year: text})}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Input
                label="Өнгө"
                placeholder="Цагаан"
                value={formData.color}
                onChangeText={(text) => setFormData({...formData, color: text})}
              />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Бичиг баримт</Text>
          <Text style={styles.label}>Жолооны үнэмлэх</Text>
          <TouchableOpacity onPress={() => pickImage(setLicenseImage)} style={styles.imagePicker}>
            {licenseImage ? (
              <Image source={{ uri: licenseImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                 <Text style={styles.imagePlaceholder}>Зураг оруулах</Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={styles.label}>Тээврийн хэрэгслийн гэрчилгээ</Text>
          <TouchableOpacity onPress={() => pickImage(setRegistrationImage)} style={styles.imagePicker}>
            {registrationImage ? (
              <Image source={{ uri: registrationImage }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                 <Text style={styles.imagePlaceholder}>Зураг оруулах</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.spacer} />
          
          <GoldButton 
            title="БҮРТГҮҮЛЭХ" 
            onPress={handleRegister} 
            loading={loading}
          />
          <View style={styles.spacer} />
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionTitle: {
    ...theme.typography.h3,
    marginBottom: theme.spacing.m,
    marginTop: theme.spacing.s,
    color: theme.colors.primary
  },
  row: {
    flexDirection: 'row',
  },
  spacer: {
    height: theme.spacing.xl,
  },
  label: {
    ...theme.typography.body,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text
  },
  imagePicker: {
    height: 150,
    backgroundColor: '#F5F5F5',
    borderRadius: theme.roundness,
    marginBottom: theme.spacing.m,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  imagePlaceholder: {
    color: '#999',
    marginTop: 8
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover'
  }
});
