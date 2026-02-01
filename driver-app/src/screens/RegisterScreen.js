import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';
import { Input } from '../components/Input';
import { Header } from '../components/Header';
import { API_URL } from '../config';

export default function RegisterScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    email: '',
    password: '',
    plateNumber: '',
    model: '',
    year: '',
    color: ''
  });

  const handleRegister = async () => {
    if (!formData.lastName || !formData.firstName || !formData.phone || !formData.email || !formData.password) {
      Alert.alert('Алдаа', 'Бүх талбарыг бөглөнө үү');
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
          }
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Бүртгэл амжилттай', 
          'Таны бүртгэлийн хүсэлт илгээгдлээ. Админ шалгаж баталгаажуулсны дараа та нэвтрэх боломжтой болно. Танд SMS-ээр мэдэгдэх болно.', 
          [
            { text: 'Ойлголоо', onPress: () => navigation.navigate('Login') }
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
  }
});
