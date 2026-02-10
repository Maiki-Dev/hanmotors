import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { theme } from '../constants/theme';
import { authService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Phone, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string };
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('Алдаа', 'Утасны дугаараа оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.requestOtp(phone);
      
      if (response.data.dev_otp) {
        Alert.alert('Info', `Dev OTP: ${response.data.dev_otp}`);
      }
      
      navigation.navigate('VerifyOtp', { phone });
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'OTP илгээж чадсангүй');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Dynamic Background */}
      <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={['#0F1115', '#1A1D26', '#0F1115']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Decorative Orbs */}
          <View style={[styles.orb, { top: -100, right: -100, backgroundColor: theme.colors.primary, opacity: 0.1 }]} />
          <View style={[styles.orb, { bottom: -100, left: -100, backgroundColor: theme.colors.info, opacity: 0.05 }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.logoContainer}>
           <View style={styles.logoBox}>
              <Text style={styles.logoText}>K</Text>
           </View>
           <Text style={styles.appName}>KHAN MOTORS</Text>
           <Text style={styles.brandSubtitle}>PREMIUM SERVICE</Text>
        </View>

        <View style={styles.formContainer}>
          <BlurView intensity={30} tint="dark" style={styles.glassCard}>
            <Text style={styles.title}>Тавтай морилно уу</Text>
            <Text style={styles.instructionText}>Үргэлжлүүлэхийн тулд утасны дугаараа оруулна уу</Text>

            <View style={styles.inputWrapper}>
              <View style={styles.inputContainer}>
                <Phone size={20} color={theme.colors.primary} style={styles.inputIcon} />
                <View style={styles.verticalDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Утасны дугаар"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <TouchableOpacity 
              style={styles.button}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
                  <ArrowRight size={20} color="#000" />
                </>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  orb: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logoBox: {
    width: 64,
    height: 64,
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  formContainer: {
    width: '100%',
  },
  glassCard: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 32,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    height: 56,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default LoginScreen;
