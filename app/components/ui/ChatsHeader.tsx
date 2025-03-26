import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ChatsHeaderProps {
  title: string;
  onBackPress?: () => void;
}

const ChatsHeader: React.FC<ChatsHeaderProps> = ({ title, onBackPress }) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
  },
});

export default ChatsHeader; 