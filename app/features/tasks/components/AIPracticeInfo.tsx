import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIPracticeInfoProps {
  loading: boolean;
  chatRoomTitle: string | null;
  onOpenChatRoom: () => void;
}

export const AIPracticeInfo: React.FC<AIPracticeInfoProps> = ({
  loading,
  chatRoomTitle,
  onOpenChatRoom,
}) => {
  return (
    <View style={styles.aiInfoContainer}>
      <View style={styles.aiInfoHeader}>
        <Ionicons name="musical-notes-outline" size={20} color="#007AFF" />
        <Text style={styles.aiInfoTitle}>AI生成練習メニュー</Text>
      </View>
      
      {loading ? (
        <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
      ) : chatRoomTitle ? (
        <TouchableOpacity
          style={styles.chatRoomButton}
          onPress={onOpenChatRoom}
        >
          <Text style={styles.chatRoomText}>
            チャットルーム「{chatRoomTitle}」から生成されました
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#8E8E93" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  aiInfoContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  aiInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  loader: {
    marginVertical: 8,
  },
  chatRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  chatRoomText: {
    fontSize: 14,
    color: '#3A3A3C',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default AIPracticeInfo;
