import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

export type MessageRole = 'user' | 'ai' | 'system';

export interface MessageBubbleProps {
  content: string;
  role: MessageRole;
  timestamp?: Date;
  isStreaming?: boolean;
  containerStyle?: ViewStyle;
  textStyle?: TextStyle;
  showAvatar?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  role,
  timestamp,
  isStreaming = false,
  containerStyle,
  textStyle,
  showAvatar = true,
}) => {
  const isUser = role === 'user';
  const isAI = role === 'ai';
  
  return (
    <View style={[
      styles.messageRow,
      containerStyle
    ]}>
      {/* AIアバター (ユーザーメッセージでは非表示) */}
      {!isUser && showAvatar && (
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="chatbubble-ellipses" size={18} color="#FFFFFF" />
          </View>
        </View>
      )}
      
      {/* メッセージ本文 */}
      <View style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.aiBubble,
      ]}>
        <Text style={[
          styles.messageText,
          isUser ? styles.userText : styles.aiText,
          textStyle
        ]}>
          {content}
        </Text>
        
        {/* ストリーミング中の表示 */}
        {isStreaming && (
          <ActivityIndicator 
            size="small" 
            color={isUser ? "#FFFFFF" : "#333333"} 
            style={styles.streamingIndicator} 
          />
        )}
      </View>
      
      {/* ユーザーアバター (AIメッセージでは非表示) */}
      {isUser && showAvatar && (
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.userAvatar]}>
            <Ionicons name="person" size={18} color="#FFFFFF" />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    marginHorizontal: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7C4DFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatar: {
    backgroundColor: '#4285F4',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 12,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#7C4DFF',
    marginLeft: 'auto',
    borderTopRightRadius: 2,
  },
  aiBubble: {
    backgroundColor: '#F5F5F7',
    marginRight: 'auto',
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#1F1F1F',
  },
  streamingIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 8,
  },
});

export default MessageBubble; 