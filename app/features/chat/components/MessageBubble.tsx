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
  showAvatar = false,
}) => {
  const isUser = role === 'user';
  const isAI = role === 'ai';
  
  return (
    <View style={[
      styles.messageRow,
      isUser ? styles.userMessageRow : styles.aiMessageRow,
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
        !showAvatar && (isUser ? styles.userBubbleWider : styles.aiBubbleWider)
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
          <View style={styles.streamingContainer}>
            <View style={styles.typingIndicator}>
              <View style={[styles.typingDot, styles.typingDot1]} />
              <View style={[styles.typingDot, styles.typingDot2]} />
              <View style={[styles.typingDot, styles.typingDot3]} />
            </View>
          </View>
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
    paddingHorizontal: 6,
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
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
    backgroundColor: '#6E56CF',
    marginLeft: 'auto',
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F7F7F8',
    marginRight: 'auto',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  userBubbleWider: {
    maxWidth: '90%',
  },
  aiBubbleWider: {
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#343541',
  },
  streamingContainer: {
    marginTop: 6,
    height: 20,
    justifyContent: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 20,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 2,
    backgroundColor: '#9AA3AF',
    opacity: 0.7,
  },
  typingDot1: {
    animationName: 'bounce',
    animationDuration: '1s',
    animationIterationCount: 'infinite',
  },
  typingDot2: {
    animationName: 'bounce',
    animationDuration: '1s',
    animationDelay: '0.2s',
    animationIterationCount: 'infinite',
  },
  typingDot3: {
    animationName: 'bounce',
    animationDuration: '1s',
    animationDelay: '0.4s',
    animationIterationCount: 'infinite',
  },
  streamingIndicator: {
    marginTop: 4,
    alignSelf: 'center',
  },
});

export default MessageBubble; 