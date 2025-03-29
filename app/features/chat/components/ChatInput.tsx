import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Switch } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useAuthStore } from '../../../store/auth';

interface ChatInputProps {
  message: string;
  onChangeMessage: (text: string) => void;
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
  const [useHttpDirect, setUseHttpDirect] = useState(true);
  const theme = useTheme();
  const { user } = useAuthStore();

  const toggleHttpDirect = () => {
    setUseHttpDirect(!useHttpDirect);
  };

  return (
    <View style={styles.container}>
      <View style={styles.switchContainer}>
        <Text style={styles.switchLabel}>
          HTTP直接呼び出し
        </Text>
        <Switch
          value={useHttpDirect}
          onValueChange={toggleHttpDirect}
          trackColor={{ false: '#767577', true: '#4285F4' }}
          thumbColor={useHttpDirect ? '#8BB4F7' : '#f4f3f4'}
        />
      </View>
      
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
        
        <TouchableOpacity
          style={[styles.sendButton, !message.trim() && styles.disabledButton]}
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 0,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#f7f8fc',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  switchLabel: {
    fontSize: 12,
    marginRight: 4,
    color: '#666666',
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
