import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, SafeAreaView, ScrollView } from 'react-native';
import { useSettingsStore } from './store/settings';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { useRouter } from 'expo-router';

const ThemeScreen = () => {
  const { theme, setTheme } = useSettingsStore();
  const { colors } = useTheme();
  const router = useRouter();

  const themes = [
    { value: 'system', label: '端末設定に合わせる', icon: 'phone-android' },
    { value: 'light', label: 'ライトモード', icon: 'wb-sunny' },
    { value: 'dark', label: 'ダークモード', icon: 'nights-stay' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>テーマ設定</Text>
        </View>
      {themes.map((t) => (
        <TouchableOpacity
          key={t.value}
          style={[
            styles.option,
            theme === t.value && styles.selectedOption,
            { backgroundColor: colors.card }
          ]}
          onPress={() => setTheme(t.value as 'light' | 'dark' | 'system')}
        >
          <MaterialIcons
            name={t.icon as any}
            size={24}
            color={theme === t.value ? colors.primary : colors.text}
          />
          <Text style={[styles.label, { color: colors.text }]}>{t.label}</Text>
          {theme === t.value && (
            <MaterialIcons
              name="check"
              size={24}
              color={colors.primary}
              style={styles.checkIcon}
            />
          )}
        </TouchableOpacity>
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
  selectedOption: {
    borderWidth: 2,
  },
  label: {
    fontSize: 16,
    marginLeft: 16,
    flex: 1,
  },
  checkIcon: {
    marginLeft: 'auto',
  },
});

export default ThemeScreen;
