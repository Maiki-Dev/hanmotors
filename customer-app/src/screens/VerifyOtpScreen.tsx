import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { authService } from '../services/api';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/slices/authSlice';

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
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.verifyOtp(phone, otp);
      const { customer, token } = response.data;
      
      dispatch(setCredentials({ user: customer, token }));
      
      // Navigation will be handled by the AppNavigator based on auth state
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verification</Text>
      <Text style={styles.subtitle}>Enter the code sent to {phone}</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="1234"
          placeholderTextColor={theme.colors.textSecondary}
          keyboardType="number-pad"
          maxLength={4}
          value={otp}
          onChangeText={setOtp}
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
          <Text style={styles.buttonText}>Verify</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.l,
    justifyContent: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.s,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xl,
  },
  inputContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.m,
    padding: theme.spacing.m,
    marginBottom: theme.spacing.l,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    ...theme.typography.body,
    color: theme.colors.text,
    textAlign: 'center',
    letterSpacing: 10,
    fontSize: 24,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.m,
    borderRadius: theme.borderRadius.m,
    alignItems: 'center',
  },
  buttonText: {
    ...theme.typography.button,
  },
});

export default VerifyOtpScreen;
