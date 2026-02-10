import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../store/slices/authSlice';
import { RootState, AppDispatch } from '../store';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { theme } from '../constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react-native';
import { CodeInput } from '../components/CodeInput';

const { width, height } = Dimensions.get('window');

type RootStackParamList = {
  VerifyOtp: { phone: string };
};

type VerifyOtpScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOtp'>;

const VerifyOtpScreen = () => {
  const [otp, setOtp] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<VerifyOtpScreenRouteProp>();
  const { phone } = route.params || {};
  const { isLoading: loading, error, isAuthenticated } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated) {
      // Navigate to Home or handle successful login
    }
  }, [isAuthenticated, navigation]);

  const handleVerify = async () => {
    if (!otp || otp.length < 4) {
      Alert.alert('Алдаа', 'Баталгаажуулах код 4 оронтой байх ёстой');
      return;
    }
    
    try {
      await dispatch(verifyOtp({ phone, otp })).unwrap();
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
                <ArrowLeft size={24} color="#fff" />
              </BlurView>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <ShieldCheck size={48} color={theme.colors.primary} />
            </View>
            
            <Text style={styles.title}>Баталгаажуулалт</Text>
            <Text style={styles.subtitle}>
              Таны <Text style={styles.phoneHighlight}>{phone}</Text> дугаарт илгээсэн 4 оронтой кодыг оруулна уу
            </Text>

            <View style={styles.inputContainer}>
              <CodeInput
                value={otp}
                onChangeText={setOtp}
                length={4}
                disabled={loading}
              />
            </View>

            <TouchableOpacity 
              style={styles.verifyButton}
              onPress={handleVerify}
              disabled={loading || otp.length < 4}
            >
              <LinearGradient
                colors={loading ? ['#333', '#333'] : [theme.colors.primary, '#E5A000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Баталгаажуулж байна...' : 'Баталгаажуулах'}
                </Text>
                {!loading && <CheckCircle size={20} color="#000" style={styles.buttonIcon} />}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.resendButton}
              onPress={() => {
                // Implement resend logic
                Alert.alert('Info', 'Resend functionality to be implemented');
              }}
            >
              <Text style={styles.resendText}>Код дахин илгээх</Text>
            </TouchableOpacity>
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
    borderRadius: 200,
    opacity: 0.15,
  },
  orb1: {
    width: 300,
    height: 300,
    top: -50,
    right: -50,
  },
  orb2: {
    width: 250,
    height: 250,
    bottom: -50,
    left: -50,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  backButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: 44,
    height: 44,
  },
  backButtonBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.2)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  phoneHighlight: {
    color: '#fff',
    fontWeight: '600',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 40,
  },
  verifyButton: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  resendButton: {
    marginTop: 24,
    padding: 12,
  },
  resendText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
});

export default VerifyOtpScreen;
