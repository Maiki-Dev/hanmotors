import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { API_URL } from '../config';
import { theme } from '../constants/theme';
import { GoldButton } from '../components/GoldButton';
import { Input } from '../components/Input';
import { Phone, KeyRound, ArrowLeft } from 'lucide-react-native';

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
        Alert.alert('OTP илгээгдлээ', `Таны код: ${data.dev_otp}`); // Show dev OTP
        setStep(2);
      } else {
        Alert.alert('Алдаа', data.message || 'OTP илгээж чадсангүй. Бүртгэлтэй эсэхээ шалгана уу.');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа. Дахин оролдоно уу.');
      console.error(error);
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
        navigation.replace('Main', { driverId: data._id, driverName: data.name });
      } else {
        Alert.alert('Алдаа', data.message || 'OTP буруу байна');
      }
    } catch (error) {
      Alert.alert('Алдаа', 'Сүлжээний алдаа. Дахин оролдоно уу.');
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
        <View style={styles.header}>
          <View style={styles.logoContainer}>
             <Text style={styles.logoText}>X</Text>
          </View>
          <Text style={styles.title}>XAN MOTORS</Text>
          <Text style={styles.subtitle}>ЖОЛООЧИЙН ПРЕМИУМ АПП</Text>
        </View>

        <View style={styles.form}>
          {step === 1 ? (
            <>
              <Text style={styles.label}>Утасны дугаараа оруулна уу</Text>
              <Input
                placeholder="99112233"
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
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.m,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  title: {
    ...theme.typography.h1,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.caption,
    letterSpacing: 2,
    color: theme.colors.textSecondary,
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
  registerLink: {
    marginTop: theme.spacing.l,
    alignItems: 'center',
  },
  registerText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
  },
  registerHighlight: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  }
});
