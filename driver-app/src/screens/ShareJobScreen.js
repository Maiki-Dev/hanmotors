import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { theme } from '../constants/theme';
import { ArrowLeft, MapPin, DollarSign, Navigation, Truck, Car, Package } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function ShareJobScreen({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [driverId, setDriverId] = useState(null);
  
  const [form, setForm] = useState({
    pickup: '',
    dropoff: '',
    price: '',
    phone: '',
    serviceType: 'taxi', // Default
    distance: '5' // Mock distance for now
  });

  useEffect(() => {
    loadDriver();
  }, []);

  const loadDriver = async () => {
    try {
      const id = await AsyncStorage.getItem('driver_id');
      setDriverId(id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleShare = async (isSelf = false) => {
    if (!form.pickup || !form.dropoff || !form.price) {
      Alert.alert('Дутуу мэдээлэл', 'Эхлэх цэг, очих цэг болон үнийг оруулна уу.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        driverId,
        pickup: { address: form.pickup, lat: 47.9188, lng: 106.9176 }, // Mock coords
        dropoff: { address: form.dropoff, lat: 47.9200, lng: 106.9200 }, // Mock coords
        price: Number(form.price),
        serviceType: form.serviceType,
        distance: Number(form.distance),
        duration: 15, // Mock duration
        customerPhone: form.phone
      };

      const endpoint = isSelf ? '/api/driver/trip/self' : '/api/driver/trip/share';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (isSelf) {
            Alert.alert(
                'Амжилттай', 
                'Аялал эхэллээ. Таныг идэвхтэй аялал руу шилжүүлж байна.',
                [{ text: 'OK', onPress: () => navigation.popToTop() }] // Go back to Home/ActiveJob
            );
        } else {
            Alert.alert(
                'Амжилттай', 
                'Дуудлага амжилттай бүртгэгдлээ. Бусад жолооч нар руу илгээгдлээ.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
      } else {
        Alert.alert('Алдаа', data.message || 'Дуудлага бүртгэхэд алдаа гарлаа');
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={theme.colors.text} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Дуудлага хуваалцах</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.description}>
          Та өөрөө явах боломжгүй дуудлагаа бусад жолооч нартай хуваалцаарай. 
          Аялал амжилттай дууссаны дараа танд <Text style={styles.highlight}>5000₮</Text> бонус орно.
        </Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Эхлэх цэг</Text>
          <View style={styles.inputContainer}>
            <MapPin color={theme.colors.primary} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Хаяг оруулах..."
              value={form.pickup}
              onChangeText={(text) => setForm({...form, pickup: text})}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Очих цэг</Text>
          <View style={styles.inputContainer}>
            <Navigation color={theme.colors.primary} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Хаяг оруулах..."
              value={form.dropoff}
              onChangeText={(text) => setForm({...form, dropoff: text})}
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Үнэ (₮)</Text>
          <View style={styles.inputContainer}>
            <DollarSign color={theme.colors.primary} size={20} />
            <TextInput
              style={styles.input}
              placeholder="Жишээ: 10000"
              value={form.price}
              onChangeText={(text) => setForm({...form, price: text})}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Төрөл</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity 
              style={[styles.typeButton, form.serviceType === 'taxi' && styles.typeButtonActive]}
              onPress={() => setForm({...form, serviceType: 'taxi'})}
            >
              <Car color={form.serviceType === 'taxi' ? theme.colors.background : theme.colors.text} size={24} />
              <Text style={[styles.typeText, form.serviceType === 'taxi' && styles.typeTextActive]}>Taxi</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.typeButton, form.serviceType === 'tow' && styles.typeButtonActive]}
              onPress={() => setForm({...form, serviceType: 'tow'})}
            >
              <Truck color={form.serviceType === 'tow' ? theme.colors.background : theme.colors.text} size={24} />
              <Text style={[styles.typeText, form.serviceType === 'tow' && styles.typeTextActive]}>Ачилт</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.typeButton, form.serviceType === 'delivery' && styles.typeButtonActive]}
              onPress={() => setForm({...form, serviceType: 'delivery'})}
            >
              <Package color={form.serviceType === 'delivery' ? theme.colors.background : theme.colors.text} size={24} />
              <Text style={[styles.typeText, form.serviceType === 'delivery' && styles.typeTextActive]}>Хүргэлт</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.submitButton, { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.primary, flex: 1, marginRight: 8 }]}
              onPress={() => handleShare(true)} // Self
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.colors.primary }]}>ӨӨРӨӨ ЯВАХ</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.submitButton, { flex: 1, marginLeft: 8, marginTop: 0 }]}
              onPress={() => handleShare(false)} // Share
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={styles.submitButtonText}>ХУВААЛЦАХ</Text>
              )}
            </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.l,
    marginBottom: theme.spacing.l,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.l,
    paddingBottom: 40,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  highlight: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  typeTextActive: {
    color: theme.colors.background,
  },
  buttonContainer: {
      flexDirection: 'row',
      marginTop: 24,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24, // Keep for backward compatibility if used alone
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.background,
  },
});