import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

export const HomeHeader: React.FC = () => {
  const navigateToProfile = () => {
    router.push('/profile');
  };

  const navigateToSettings = () => {
    router.push('/settings');
  };

  return (
    <View style={styles.header}>
      <Text style={styles.title}>最近の課題</Text>
      <View style={styles.headerIcons}>
        <TouchableOpacity style={styles.profileButton} onPress={navigateToProfile}>
          <Ionicons name="person" size={28} color="#1a73e8" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingsButton} onPress={navigateToSettings}>
          <MaterialIcons name="settings" size={28} color="#1a73e8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  headerIcons: {
    flexDirection: 'row',
  },
  profileButton: {
    marginRight: 16,
    padding: 4,
  },
  settingsButton: {
    padding: 4,
  },
});

export default HomeHeader;
