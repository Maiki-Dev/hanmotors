import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { theme } from '../constants/theme';
import { authService } from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';
import { Lock, ArrowLeft } from 'lucide-react-native';

type RootStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string };
  Home: undefined;
};

type VerifyOtpScreenRouteProp = RouteProp<RootStackParamList, 'VerifyOtp'>;
type VerifyOtpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VerifyOtp'>;

const VerifyOtpScreen = () => {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const route = useRoute<VerifyOtpScreenRouteProp>();
  const navigation = useNavigation<VerifyOtpScreenNavigationProp>();
  const dispatch = useDispatch();
  const { phone } = route.params;

  const handleVerify = async () => {
    if (!otp) {
      Alert.alert('Алдаа', 'Баталгаажуулах кодыг оруулна уу');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOtp(phone, otp);
      const { customer, token } = response.data;
      
      dispatch(setCredentials({ user: customer, token }));
      
      // Navigation will be handled by the AppNavigator based on auth state
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Код буруу байна');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    // Implement resend logic here
    Alert.alert('Мэдэгдэл', 'Код дахин илгээгдлээ');
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <ArrowLeft size={24} color={theme.colors.text} />
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Lock size={40} color={theme.colors.black} />
        </View>
        <Text style={styles.title}>Баталгаажуулах</Text>
        <Text style={styles.subtitle}>{phone} дугаарт илгээсэн 4 оронтой кодыг оруулна уу</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="0000"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
            autoFocus
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.black} />
          ) : (
            <Text style={styles.buttonText}>Баталгаажуулах</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.resendButton} onPress={handleResend}>
          <Text style={styles.resendText}>Код дахин илгээх</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.l,
  },
  backButton: {
    marginTop: 40,
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconBox: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  content: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  input: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    letterSpacing: 16,
    textAlign: 'center',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.border,
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.black,
  },
  resendButton: {
    alignItems: 'center',
    padding: 10,
  },
  resendText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});

export default VerifyOtpScreen;
