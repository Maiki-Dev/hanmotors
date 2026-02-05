import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image } from 'react-native';
import { theme } from '../constants/theme';
import { authService } from '../services/api';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Phone } from 'lucide-react-native';

type RootStackParamList = {
  Login: undefined;
  VerifyOtp: { phone: string };
};

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  // Login Screen with Phone Auth
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
      const response = await authService.login(phone);
      if (response.data.dev_otp) {
        Alert.alert('Код илгээгдлээ', `Таны код: ${response.data.dev_otp}`);
      }
      navigation.navigate('VerifyOtp', { phone });
    } catch (error: any) {
      Alert.alert('Алдаа', error.response?.data?.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
         <View style={styles.logoBox}>
            <Text style={styles.logoText}>K</Text>
         </View>
         <Text style={styles.appName}>KHAN MOTORS</Text>
         <Text style={styles.brandSubtitle}>PREMIUM SERVICE</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Тавтай морилно уу</Text>
        <Text style={styles.instructionText}>Үргэлжлүүлэхийн тулд утасны дугаараа оруулна уу</Text>

        <View style={styles.inputContainer}>
          <Phone size={20} color={theme.colors.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Утасны дугаар"
            placeholderTextColor={theme.colors.textSecondary}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.black} />
          ) : (
            <Text style={styles.buttonText}>Үргэлжлүүлэх</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.l,
  },
  logoContainer: {
    marginTop: 60,
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBox: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.surface,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  brandSubtitle: {
    fontSize: 12,
    letterSpacing: 2,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 30,
    lineHeight: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.text,
    height: '100%',
  },
  button: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
});

export default LoginScreen;
