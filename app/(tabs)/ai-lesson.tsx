import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function AILessonScreen() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([
    {
      id: 1,
      type: 'ai',
      text: 'こんにちは！レッスンについて何かお手伝いできることはありますか？',
    },
  ]);

  const handleSend = () => {
    if (!message.trim()) return;

    setChat((prev) => [
      ...prev,
      { id: Date.now(), type: 'user', text: message.trim() },
    ]);
    setMessage('');

    // AIの応答をシミュレート
    setTimeout(() => {
      setChat((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          type: 'ai',
          text: 'ご質問ありがとうございます。現在、AIアシスタント機能は開発中です。',
        },
      ]);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AIレッスン</Text>
        </View>

        <ScrollView style={styles.chatContainer}>
          {chat.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.type === 'user' ? styles.userMessage : styles.aiMessage,
              ]}>
              <Text style={[
                styles.messageText,
                message.type === 'user' ? styles.userMessageText : styles.aiMessageText
              ]}>
                {message.text}
              </Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="メッセージを入力"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!message.trim()}>
            <Ionicons
              name="send"
              size={26} // Larger icon
              color={message.trim() ? '#007AFF' : '#C7C7CC'}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 30, // Larger title
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  chatContainer: {
    flex: 1,
    padding: 20,
  },
  messageContainer: {
    maxWidth: '85%', // Wider messages
    marginBottom: 16,
    padding: 16, // Increased padding
    borderRadius: 20, // Increased border radius
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  messageText: {
    fontSize: 17, // Larger font size
    lineHeight: 24, // Increased line height
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: '#1C1C1E',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  input: {
    flex: 1,
    minHeight: 48, // Increased height
    maxHeight: 120,
    backgroundColor: '#F2F2F7',
    borderRadius: 24, // Increased border radius
    paddingHorizontal: 18, // Increased padding
    paddingVertical: 12, // Increased padding
    marginRight: 12,
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sendButton: {
    width: 48, // Larger button
    height: 48, // Larger button
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24, // Make it circular
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});