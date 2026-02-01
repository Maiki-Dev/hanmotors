import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Bell, Volume2 } from 'lucide-react-native';
import { theme } from '../constants/theme';
import { PremiumCard } from '../components/PremiumCard';

const NotificationSettingsScreen = ({ navigation }) => {
  const [settings, setSettings] = useState({
    pushEnabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    promoEnabled: false
  });

  const toggleSwitch = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const SettingItem = ({ title, description, icon: Icon, value, onValueChange }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Icon size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingDescription}>{description}</Text>
        </View>
      </View>
      <Switch
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={value ? theme.colors.text : '#f4f3f4'}
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft color={theme.colors.text} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Мэдэгдэл</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <PremiumCard style={styles.card}>
          <SettingItem
            title="Push мэдэгдэл"
            description="Шинэ захиалгын мэдэгдэл авах"
            icon={Bell}
            value={settings.pushEnabled}
            onValueChange={() => toggleSwitch('pushEnabled')}
          />
          <View style={styles.divider} />
          <SettingItem
            title="Дуут дохио"
            description="Захиалга ирэхэд дуугарна"
            icon={Volume2}
            value={settings.soundEnabled}
            onValueChange={() => toggleSwitch('soundEnabled')}
          />
        </PremiumCard>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  content: {
    padding: 20,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 75,
  },
});

export default NotificationSettingsScreen;
