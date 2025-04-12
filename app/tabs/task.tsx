import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function TaskScreen() {
  const theme = useTheme();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.developmentContainer}>
          <MaterialCommunityIcons name="tools" size={80} color={theme.colors.textSecondary} style={styles.icon} />
          <Text style={[styles.developmentText, { color: theme.colors.text }]}>開発中</Text>
          <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>この機能は現在準備中です</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  developmentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  developmentText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
  }
});
