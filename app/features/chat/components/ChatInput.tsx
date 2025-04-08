import React, { useState, useRef } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Platform, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme';
import { useAuthStore } from '../../../../store/auth';

export interface ChatInputProps {
  message: string;
  onChangeMessage: (message: string) => void;
  onSend: () => void;
  sending: boolean;
  roomId: string;
  instrument: string;
}

export function ChatInput({
  message,
  onChangeMessage,
  onSend,
  sending,
  roomId,
  instrument,
}: ChatInputProps) {
  const theme = useTheme();
  const { user } = useAuthStore();
  const inputRef = useRef<TextInput>(null);
  
  // フォーカスイベントの抑制するために単一のイベントハンドラを使用
  const handleMessageChange = (text: string) => {
    onChangeMessage(text);
  };
  
  // 送信後キーボードを閉じる
  const handleSendPress = () => {
    onSend();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={message}
          onChangeText={handleMessageChange}
          placeholder="メッセージを入力..."
          multiline
          maxLength={2000}
          placeholderTextColor="#888"
          editable={!sending}
        />
        
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.disabledButton]}
          onPress={handleSendPress}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="send" size={22} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#f7f8fc',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    backgroundColor: '#F8F8F8',
    paddingHorizontal: 12,
    paddingVertical: 0,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    paddingVertical: 4,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4285F4',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
});

// デフォルトエクスポートを追加
export default ChatInput;
