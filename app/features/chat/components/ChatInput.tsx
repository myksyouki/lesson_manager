import React from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatInputProps {
  message: string;
  onChangeMessage: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  roomId: string;
  instrument: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  message,
  onChangeMessage,
  onSend,
  sending,
  roomId,
  instrument,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={onChangeMessage}
          placeholder="メッセージを入力..."
          multiline
          maxLength={2000}
          placeholderTextColor="#888"
          editable={!sending}
        />
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[styles.iconButton, styles.sendButton, !message.trim() && styles.disabledButton]}
            onPress={onSend}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: '#F8F8F8',
  },
  buttonGroup: {
    flexDirection: 'row',
    marginLeft: 8,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  sendButton: {
    backgroundColor: '#4285F4',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
