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
  const [useHttpDirect, setUseHttpDirect] = useState(false);
  const theme = useTheme();
  const { user } = useAuthStore();

  const toggleHttpDirect = () => {
    setUseHttpDirect(!useHttpDirect);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
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
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    borderColor: '#EEEEEE',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
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
    padding: 8,
    borderRadius: 20,
    marginLeft: 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#A0A0A0',
    opacity: 0.7,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  switchLabel: {
    fontSize: 12,
    marginRight: 4,
    color: '#666666',
  },
});
