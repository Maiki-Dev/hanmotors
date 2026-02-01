import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { theme } from '../constants/theme';
import { Header } from '../components/Header';
import { PremiumCard } from '../components/PremiumCard';
import { Phone, MessageSquare, AlertTriangle, FileText } from 'lucide-react-native';

const SupportOption = ({ title, description, icon, onPress }) => (
  <TouchableOpacity onPress={onPress}>
    <PremiumCard style={styles.optionCard}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
    </PremiumCard>
  </TouchableOpacity>
);

export default function SupportScreen({ navigation }) {
  const handleCallSupport = () => {
    Linking.openURL('tel:77001234');
  };

  return (
    <View style={styles.container}>
      <Header title="Тусламж" onBack={() => navigation.goBack()} />
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>Бид танд хэрхэн туслах вэ?</Text>
        
        <SupportOption 
          title="Лавлах руу залгах" 
          description="Оператортой холбогдох"
          icon={<Phone color={theme.colors.primary} size={24} />}
          onPress={handleCallSupport}
        />

        <SupportOption 
          title="Асуудал мэдээлэх" 
          description="Апп эсвэл аялалтай холбоотой асуудал?"
          icon={<AlertTriangle color={theme.colors.error} size={24} />}
          onPress={() => {}}
        />

        <SupportOption 
          title="Шуд чат" 
          description="Дэмжлэгийн багтай чатлах"
          icon={<MessageSquare color={theme.colors.info} size={24} />}
          onPress={() => {}}
        />

        <SupportOption 
          title="Түгээмэл асуулт & Заавар" 
          description="Апп ашиглах заавар"
          icon={<FileText color={theme.colors.textSecondary} size={24} />}
          onPress={() => {}}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    padding: theme.spacing.l,
  },
  greeting: {
    ...theme.typography.h2,
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.m,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    ...theme.typography.body,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionDesc: {
    ...theme.typography.caption,
  }
});
