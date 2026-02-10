import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { theme } from '../constants/theme';
import { authService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Phone, ArrowRight } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth, PhoneAuthProvider, firebaseConfig } from '../config/firebase';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string; verificationId: string };
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const recaptchaVerifier = useRef<any>(null);

  const handleLogin = async () => {
    if (!phone) {
      Alert.alert('Алдаа', 'Утасны дугаараа оруулна уу');
      return;
    }

    setLoading(true);
    try {
      // Firebase Phone Auth
      const formattedPhone = phone.startsWith('+') ? phone : `+976${phone}`;
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current
      );
      
      navigation.navigate('VerifyOtp', { phone, verificationId });
    } catch (error: any) {
      Alert.alert('Алдаа', error.message || 'OTP илгээж чадсангүй');
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
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={firebaseConfig}
        title='Баталгаажуулалт'
        cancelLabel='Хаах'
        attemptInvisibleVerification={true}
      />
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
                  placeholderTextColor={theme.colors.textSecondary}
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
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.black} />
              ) : (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
                  <ArrowRight size={20} color={theme.colors.black} style={{marginLeft: 8}} />
                </View>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>
        
        <Text style={styles.footerText}>Version 1.0.0</Text>
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
    width: 400,
    height: 400,
    borderRadius: 200,
  },
  content: {
    flex: 1,
    padding: theme.spacing.xl,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: theme.colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text,
    letterSpacing: 1,
    marginBottom: 8,
  },
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 4,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  formContainer: {
    marginBottom: 40,
  },
  glassCard: {
    borderRadius: 30,
    padding: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 64,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: 15,
  },
  verticalDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginRight: 15,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.text,
    height: '100%',
    fontWeight: '500',
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 60,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.black,
  },
  footerText: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    color: theme.colors.textTertiary,
    fontSize: 12,
  },
});

export default LoginScreen;
