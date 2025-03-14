import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSettingsStore } from './store/settings';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

const LanguageScreen = () => {
  const { language, setLanguage } = useSettingsStore();
  const { colors } = useTheme();

  const languages = [
    { value: 'ja', label: '日本語', icon: 'language' as const },
    { value: 'en', label: 'English', icon: 'language' as const },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {languages.map((lang) => (
        <TouchableOpacity
          key={lang.value}
          style={[
            styles.option,
            language === lang.value && styles.selectedOption,
            { backgroundColor: colors.card }
          ]}
          onPress={() => setLanguage(lang.value as 'ja' | 'en')}
        >
          <MaterialIcons
            name={lang.icon}
            size={24}
            color={language === lang.value ? colors.primary : colors.text}
          />
          <Text style={[styles.label, { color: colors.text }]}>{lang.label}</Text>
          {language === lang.value && (
            <MaterialIcons
              name="check"
              size={24}
              color={colors.primary}
              style={styles.checkIcon}
            />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
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

export default LanguageScreen;
