import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ChatHeaderProps {
  title: string;
  onExport: () => void;
  exporting: boolean;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({ title, onExport, exporting }) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
        {title}
      </Text>
      
      <TouchableOpacity 
        onPress={onExport} 
        disabled={exporting} 
        style={styles.exportButton}
      >
        <Ionicons 
          name="document-text-outline" 
          size={24} 
          color={exporting ? "#8E8E93" : "#007AFF"} 
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingHorizontal: 16,
    paddingBottom: 10,
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
    color: '#1C1C1E',
    marginHorizontal: 10,
    textAlign: 'center',
  },
  exportButton: {
    padding: 8,
  },
});

export default ChatHeader;
