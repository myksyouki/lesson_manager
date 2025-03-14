import React from 'react';
import { 
  View,
  Text,
  StyleSheet,
  Switch,
  Platform,
  ScrollView,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { useSettingsStore } from './store/settings';
import { useTheme } from '@react-navigation/native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const SyncScreen = () => {
  const { syncEnabled, toggleSync } = useSettingsStore();
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>データ同期</Text>
        </View>

        <View style={styles.content}>
          <View style={[styles.option, { backgroundColor: colors.card }]}>
            <MaterialIcons
              name="sync"
              size={24}
              color={colors.text}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              データ同期
            </Text>
            <Switch
              value={syncEnabled}
              onValueChange={toggleSync}
              trackColor={{ false: '#767577', true: colors.primary }}
              thumbColor={syncEnabled ? colors.primary : '#f4f3f4'}
            />
          </View>
          
          <Text style={[styles.description, { color: colors.text }]}>
            同期を有効にすると、アプリのデータがクラウドに自動的に保存されます。
            オフライン時にもデータにアクセスできます。
          </Text>
        </View>
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
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 32,
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
  description: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
    marginTop: 8,
  },
});

export default SyncScreen;
