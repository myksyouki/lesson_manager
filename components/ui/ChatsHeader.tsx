import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export interface ChatsHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  showEditButton?: boolean;
  onEditPress?: () => void;
  showModelSelectButton?: boolean;
  onModelSelectPress?: () => void;
}

const ChatsHeader: React.FC<ChatsHeaderProps> = ({ 
  title, 
  showBackButton = true,
  onBackPress, 
  showEditButton = false,
  onEditPress,
  showModelSelectButton = false,
  onModelSelectPress
}) => {
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
      {showBackButton && (
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      <View style={styles.buttonContainer}>
        {showModelSelectButton && onModelSelectPress && (
          <TouchableOpacity onPress={onModelSelectPress} style={styles.actionButton}>
            <MaterialIcons name="switch-access-shortcut" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
        {showEditButton && onEditPress && (
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    height: 56,
    width: '100%',
  },
  backButton: {
    padding: 8,
    zIndex: 10,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginLeft: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    minWidth: 80,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
    zIndex: 10,
  },
});

export default ChatsHeader; 