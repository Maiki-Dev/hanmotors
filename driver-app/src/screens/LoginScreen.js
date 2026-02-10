import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, Image } from 'react-native';
import { API_URL } from '../config';
import { theme } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';
import { Input } from '../components/Input';
import { Phone, KeyRound, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async () => {
    if (!phone) {
      Alert.alert('Алдаа', 'Утасны дугаараа оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/driver/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      
      if (response.ok) {
        if (data.exists === false) {
           Alert.alert('Бүртгэлгүй', 'Таны утасны дугаар бүртгэлгүй байна. Бүртгүүлэх үү?', [
             { text: 'Үгүй', style: 'cancel' },
             { text: 'Тийм', onPress: () => navigation.navigate('Register', { phone }) }
           ]);
        } else {
           setStep(2);
           if (data.dev_otp) {
             Alert.alert('Амжилттай', `Баталгаажуулах код: ${data.dev_otp}`);
           } else {
             Alert.alert('Амжилттай', 'Баталгаажуулах код илгээгдлээ');
           }
        }
      } else {
        // Check if user doesn't exist (some backends return 404/200 with flag)
        if (data.exists === false || data.message === 'Driver not found') {
            Alert.alert('Бүртгэлгүй', 'Таны утасны дугаар бүртгэлгүй байна. Бүртгүүлэх үү?', [
                { text: 'Үгүй', style: 'cancel' },
                { text: 'Тийм', onPress: () => navigation.navigate('Register', { phone }) }
              ]);
        } else {
            Alert.alert('Алдаа', data.message || 'OTP илгээхэд алдаа гарлаа');
        }
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Алдаа', `OTP илгээхэд алдаа гарлаа: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp) {
      Alert.alert('Алдаа', 'OTP кодоо оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/driver/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('driver_id', data._id);
        await AsyncStorage.setItem('driver_data', JSON.stringify(data));
        navigation.replace('Main', { driverId: data._id, driverName: data.name });
      } else {
        Alert.alert('Алдаа', data.message || 'Нэвтрэхэд алдаа гарлаа');
      }
    } catch (error) {
      Alert.alert('Алдаа', `Баталгаажуулалт амжилтгүй: ${error.message}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
          <Text style={styles.brandSubtitle}>ЖОЛООЧИЙН ПРЕМИУМ АПП</Text>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              <Text style={styles.label}>Утасны дугаараа оруулна уу</Text>
              <Input
                placeholder="Утасны дугаар"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                autoCapitalize="none"
                icon={<Phone size={20} color={theme.colors.textSecondary} />}
              />
              <View style={styles.spacer} />
              <GoldButton 
                title="ҮРГЭЛЖЛҮҮЛЭХ" 
                onPress={handleRequestOTP} 
                loading={loading}
              />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => setStep(1)} style={styles.backLink}>
                <ArrowLeft size={16} color={theme.colors.textSecondary} />
                <Text style={styles.backText}>Дугаар солих</Text>
              </TouchableOpacity>
              
              <Text style={styles.label}>Илгээсэн кодыг оруулна уу: {phone}</Text>
              <Input
                placeholder="0000"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                autoCapitalize="none"
                icon={<KeyRound size={20} color={theme.colors.textSecondary} />}
                maxLength={4}
              />
              <View style={styles.spacer} />
              <GoldButton 
                title="БАТАЛГААЖУУЛАХ & НЭВТРЭХ" 
                onPress={handleVerifyOTP} 
                loading={loading}
              />
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
  },
  content: {
    padding: theme.spacing.l,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoImage: {
    width: 180,
    height: 150,
    marginBottom: 0,
  },
  brandSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    letterSpacing: 4,
    marginTop: theme.spacing.s,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  label: {
    ...theme.typography.body,
    marginBottom: theme.spacing.s,
    color: theme.colors.textSecondary,
  },
  spacer: {
    height: theme.spacing.l,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.l,
  },
  backText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },
});
