import React from 'react';
import { View, Text, StyleSheet, Switch, Platform, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useNotificationStore } from './store/notifications';
import type { NotificationSettings } from './store/notifications';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

const NotificationScreen = () => {
  const { settings, setSettings } = useNotificationStore();
  const { colors } = useTheme();
  const router = useRouter();

  const notificationOptions = [
    {
      label: 'レッスンリマインダー',
      value: 'lessonReminder',
      icon: 'notifications',
    },
    {
      label: '新着メッセージ',
      value: 'newMessage',
      icon: 'message',
    },
    {
      label: 'システムアップデート',
      value: 'systemUpdate',
      icon: 'system-update',
    },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>通知設定</Text>
        </View>

        {notificationOptions.map((option) => (
          <View
            key={option.value}
            style={[
              styles.option,
              { backgroundColor: colors.card }
            ]}
          >
            <MaterialIcons
              name={option.icon as any}
              size={24}
              color={colors.text}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              {option.label}
            </Text>
            <Switch
              value={settings[option.value as keyof NotificationSettings]}
              onValueChange={(value) =>
                setSettings({
                  ...settings,
                  [option.value]: value,
                })
              }
              trackColor={{ true: colors.primary }}
              thumbColor={Platform.OS === 'android' ? colors.primary : undefined}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  label: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
});

export default NotificationScreen;
