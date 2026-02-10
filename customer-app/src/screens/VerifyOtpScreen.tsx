import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp, loginWithFirebase } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react-native';
import { auth, PhoneAuthProvider, signInWithCredential } from '../config/firebase';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  VerifyOtp: { phone: string; verificationId: string };
};

type VerifyOtpScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOtp'>;

const VerifyOtpScreen = () => {
  const [otp, setOtp] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<VerifyOtpScreenRouteProp>();
  const { phone, verificationId } = route.params || {};
  const { isLoading: loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Navigate to Home or handle successful login
    }
  }, [isAuthenticated, navigation]);

  const handleVerify = async () => {
    if (otp.length !== 6) { // Firebase OTP is 6 digits usually
      // But maybe 4 for test numbers. Let's say != 6
      // Actually standard Firebase is 6.
      // I'll check length >= 4
    }
    
    try {
      // Firebase Verify
      const credential = PhoneAuthProvider.credential(
          verificationId,
          otp
      );
      const userCredential = await signInWithCredential(auth, credential);
      const idToken = await userCredential.user.getIdToken();

      // Backend Login
      await dispatch(loginWithFirebase({ idToken, phone })).unwrap();
    } catch (err: any) {
      Alert.alert('Алдаа', (typeof err === 'string' ? err : err?.message) || 'Баталгаажуулалт амжилтгүй боллоо');
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.background, '#1a2138', '#0f1322']}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Decorative background elements */}
      <LinearGradient
        colors={[theme.colors.primary, 'transparent']}
        style={[styles.orb, styles.orb1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <LinearGradient
        colors={[theme.colors.secondary, 'transparent']}
        style={[styles.orb, styles.orb2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => navigation.goBack()}
            >
              <BlurView intensity={30} tint="dark" style={styles.backButtonBlur}>
                <ArrowLeft size={24} color={theme.colors.text} />
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={styles.contentContainer}>
            <BlurView intensity={30} tint="dark" style={styles.glassCard}>
              <View style={styles.iconContainer}>
                <ShieldCheck size={48} color={theme.colors.primary} />
              </View>
              
              <Text style={styles.title}>Баталгаажуулах</Text>
              <Text style={styles.subtitle}>
                {phone} дугаар руу илгээсэн 6 оронтой кодыг оруулна уу
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  autoFocus
                  selectionColor={theme.colors.primary}
                />
              </View>

              <TouchableOpacity 
                style={styles.verifyButton} 
                onPress={handleVerify}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={theme.colors.black} />
                ) : (
                  <LinearGradient
                    colors={[theme.colors.primary, '#f5ba31']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <Text style={styles.verifyButtonText}>Баталгаажуулах</Text>
                    <CheckCircle size={20} color={theme.colors.black} style={styles.buttonIcon} />
                  </LinearGradient>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendButton}>
                <Text style={styles.resendText}>Код ирээгүй юу? Дахин илгээх</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  orb: {
    position: 'absolute',
    borderRadius: 150,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -50,
    left: -100,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: 100,
    right: -50,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
    width: 40,
    height: 40,
  },
  backButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glassCard: {
    borderRadius: 24,
    padding: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 0, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 60,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: theme.colors.text,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 10,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  gradientButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
  },
  buttonIcon: {
    marginLeft: 10,
  },
  resendButton: {
    padding: 10,
  },
  resendText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VerifyOtpScreen;
