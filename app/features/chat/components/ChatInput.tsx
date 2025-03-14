import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  message: string;
  onChangeMessage: (text: string) => void;
  onSend: () => void;
  sending: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  message,
  onChangeMessage,
  onSend,
  sending,
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={onChangeMessage}
        placeholder="メッセージを入力..."
        placeholderTextColor="#8E8E93"
        multiline
        maxLength={1000}
        editable={!sending}
      />
      
      <TouchableOpacity
        style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
        onPress={onSend}
        disabled={!message.trim() || sending}
      >
        {sending ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="send" size={20} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#1C1C1E',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
});

export default ChatInput;
