import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Text, Switch } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useAuthStore } from '../../../store/auth';

interface ChatInputProps {
  onSend: (text: string, useHttpDirect: boolean) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export default function ChatInput({
  onSend,
  isLoading = false,
  placeholder = 'メッセージを入力...',
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [useHttpDirect, setUseHttpDirect] = useState(false);
  const theme = useTheme();
  const { user } = useAuthStore();

  const handleSend = () => {
    if (message.trim() && !isLoading) {
      onSend(message.trim(), useHttpDirect);
      setMessage('');
    }
  };

  const toggleHttpDirect = () => {
    setUseHttpDirect(!useHttpDirect);
  };

  const iconColor = theme.colors.textSecondary;
  const isComposerDisabled = isLoading || disabled;

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, {
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border,
      }]}>
        <View style={styles.switchContainer}>
          <Text style={[styles.switchLabel, { color: theme.colors.textSecondary }]}>
            HTTP直接呼び出し
          </Text>
          <Switch
            value={useHttpDirect}
            onValueChange={toggleHttpDirect}
            trackColor={{ false: '#767577', true: theme.colors.primary }}
            thumbColor={useHttpDirect ? theme.colors.primaryLight : '#f4f3f4'}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            style={[styles.input, { color: theme.colors.text }]}
            placeholder={placeholder}
            placeholderTextColor={theme.colors.textSecondary}
            value={message}
            onChangeText={setMessage}
            multiline
            editable={!isComposerDisabled}
            onSubmitEditing={handleSend}
          />

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleSend}
            disabled={isComposerDisabled || !message.trim()}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <MaterialIcons name="send" size={20} color="#fff" />
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
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  inputContainer: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 12,
    fontSize: 16,
    lineHeight: 20,
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 4,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});
