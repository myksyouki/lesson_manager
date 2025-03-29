import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ChatsHeaderProps {
  title: string;
  onBackPress?: () => void;
  onEditPress?: () => void;
  onExportPress?: () => void;
}

const ChatsHeader: React.FC<ChatsHeaderProps> = ({ title, onBackPress, onEditPress, onExportPress }) => {
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
      <View style={styles.buttonContainer}>
        {onExportPress && (
          <TouchableOpacity onPress={onExportPress} style={styles.actionButton}>
            <Ionicons name="checkbox-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {onEditPress && (
          <TouchableOpacity onPress={onEditPress} style={styles.actionButton}>
            <MaterialIcons name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>
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
  buttonContainer: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
});

export default ChatsHeader; 