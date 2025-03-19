import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getChatRoomById, updateChatRoomMessages } from './services/chatRoomService';
import { sendMessageToLessonAI } from './services/lessonAIService';
import { ChatRoom, ChatMessage } from './types/chatRoom';
import { useAuthStore } from './store/auth';
import { StatusBar } from 'expo-status-bar';
import { Timestamp } from 'firebase/firestore';
import ChatsHeader from './components/ui/ChatsHeader';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  // チャットルームデータの読み込み
  useEffect(() => {
    const loadChatRoom = async () => {
      if (!id || !user) return;

      try {
        console.log(`チャットルーム(ID: ${id})を読み込みます...`);
        const roomData = await getChatRoomById(id);

        if (!roomData) {
          console.log(`チャットルーム(ID: ${id})が見つかりませんでした`);
          Alert.alert(
            'エラー',
            'チャットルームが見つかりませんでした。',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        if (roomData.userId !== user.uid) {
          console.log('アクセス権限エラー: このチャットルームへのアクセス権限がありません');
          Alert.alert(
            'アクセス権限エラー',
            'このチャットルームにアクセスする権限がありません。',
            [{ text: 'OK', onPress: () => router.back() }]
          );
          return;
        }

        console.log('チャットルーム読み込み成功:', {
          id: roomData.id,
          title: roomData.title,
          messagesCount: roomData.messages?.length || 0,
          modelType: roomData.modelType || 'standard',
          conversationId: roomData.conversationId || 'なし'
        });

        setChatRoom(roomData);
      } catch (error) {
        console.error('チャットルーム読み込みエラー:', error);
        Alert.alert(
          'エラー',
          'チャットルームの読み込み中にエラーが発生しました。',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } finally {
        setInitialLoading(false);
      }
    };

    loadChatRoom();
  }, [id, user, router]);

  // メッセージ送信時にスクロールを最下部へ
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatRoom?.messages]);

  // メッセージを送信する
  const handleSend = async () => {
    if (!message.trim() || !chatRoom || loading || !user) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: message.trim(),
      sender: 'user',
      timestamp: Timestamp.now(),
    };

    try {
      setLoading(true);

      // UIを更新
      setChatRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages || [], userMessage],
        };
      });
      
      setMessage('');

      console.log('AIにメッセージを送信:', {
        roomId: chatRoom.id,
        conversationId: chatRoom.conversationId,
        modelType: chatRoom.modelType,
        messageLength: message.trim().length
      });

      // Dify APIに送信
      const response = await sendMessageToLessonAI(
        message.trim(),
        chatRoom.id,
        chatRoom.modelType,
        chatRoom.conversationId
      );

      // AI応答をメッセージリストに追加
      const aiMessage: ChatMessage = {
        id: `msg_${Date.now() + 1}`,
        content: response.answer,
        sender: 'ai',
        timestamp: Timestamp.now(),
      };

      const updatedMessages = [...(chatRoom.messages || []), userMessage, aiMessage];

      // チャットルームを更新
      setChatRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: updatedMessages,
          conversationId: response.conversationId || prev.conversationId,
        };
      });

      // Firestoreのチャットルームを更新
      await updateChatRoomMessages(chatRoom.id, updatedMessages);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>チャットルームを読み込んでいます...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      
      <ChatsHeader title={chatRoom?.title || 'チャット'} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {chatRoom?.messages && chatRoom.messages.length > 0 ? (
            chatRoom.messages.map((msg, index) => (
              <View
                key={msg.id || index}
                style={[
                  styles.messageContainer,
                  msg.sender === 'user'
                    ? styles.userMessageContainer
                    : styles.aiMessageContainer,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    msg.sender === 'user'
                      ? styles.userMessageBubble
                      : styles.aiMessageBubble,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.content}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                メッセージはありません。最初のメッセージを送信しましょう！
              </Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="メッセージを入力..."
            placeholderTextColor="#888"
            multiline
            numberOfLines={4}
            maxLength={1000}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendButton, !message.trim() && styles.disabledButton]}
            onPress={handleSend}
            disabled={!message.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Ionicons name="send" size={24} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f8fc',
  },
  container: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessageBubble: {
    backgroundColor: '#4285F4',
  },
  aiMessageBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  messageText: {
    fontSize: 16,
    color: '#333',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 200,
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: '#4285F4',
    width: 44,
    height: 44,
    borderRadius: 22,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#B0C4DE',
  },
});
