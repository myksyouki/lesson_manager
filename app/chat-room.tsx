import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
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
import { ChatInput } from './features/chat/components/ChatInput';

// チャットルーム画面のメインコンポーネント
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  // チャットルームデータの読み込み
  useEffect(() => {
    const loadChatRoom = async () => {
      if (!id || !user) {
        setLoading(false);
        return;
      }
      
      try {
        const roomId = Array.isArray(id) ? id[0] : id;
        const roomData = await getChatRoomById(roomId);
        
        if (!roomData) {
          Alert.alert('エラー', 'チャットルームが見つかりませんでした');
          router.back();
          return;
        }
        
        setChatRoom(roomData);
      } catch (error) {
        console.error('チャットルーム読み込みエラー:', error);
        Alert.alert('エラー', 'チャットルームの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    loadChatRoom();
  }, [id, user, router]);
  
  // メッセージが更新されたらスクロール
  useEffect(() => {
    if (chatRoom?.messages?.length) {
      // 少し遅延させてからスクロールダウン
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [chatRoom?.messages]);
  
  // 最新メッセージまでスクロール
  const scrollToBottom = () => {
    if (flatListRef.current && chatRoom?.messages?.length) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // メッセージを送信する
  const handleSend = async () => {
    if (!message.trim() || !chatRoom || !user || sending) return;
    
    try {
      setSending(true);
      
      // ユーザーメッセージの作成
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: message,
        sender: 'user',
        timestamp: Timestamp.now()
      };
      
      // 新しいメッセージ配列を作成
      const updatedMessages = [
        ...(chatRoom.messages || []),
        userMessage
      ];
      
      // ローカルでの状態更新
      setChatRoom({
        ...chatRoom,
        messages: updatedMessages
      });
      
      // メッセージ入力をクリア
      setMessage('');
      
      // メッセージを送信してAIの応答を取得
      console.log('AIにメッセージを送信:', message);
      const aiResponse = await sendMessageToLessonAI(
        message, 
        chatRoom.conversationId,
        chatRoom.modelType
      );
      
      if (!aiResponse || !aiResponse.success) {
        throw new Error('AIからの応答の取得に失敗しました');
      }
      
      // AI応答メッセージの作成
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse.answer,
        sender: 'ai',
        timestamp: Timestamp.now()
      };
      
      // 新しいメッセージ配列を作成
      const finalMessages = [
        ...updatedMessages,
        aiMessage
      ];
      
      // 会話ID更新
      const updatedChatRoom = {
        ...chatRoom,
        messages: finalMessages,
        conversationId: aiResponse.conversationId || chatRoom.conversationId
      };
      
      // ローカルの状態を更新
      setChatRoom(updatedChatRoom);
      
      // Firestoreに保存
      await updateChatRoomMessages(chatRoom.id, [userMessage, aiMessage]);
      
      // 少し遅延させてからスクロールダウン
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };
  
  // チャットメッセージの表示コンポーネント
  const renderItem = ({ item }: { item: ChatMessage }) => {
    const isUserMessage = item.sender === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUserMessage ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUserMessage ? styles.userMessageBubble : styles.aiMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUserMessage ? { color: '#FFFFFF' } : { color: '#333333' }
          ]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  };
  
  // 空のメッセージリストの表示
  const renderEmptyMessages = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        メッセージがありません。{'\n'}
        会話を始めましょう！
      </Text>
    </View>
  );
  
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4285F4" />
          <Text style={styles.loadingText}>チャットルームを読み込み中...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      
      <ChatsHeader title={chatRoom?.title || 'チャット'} onBackPress={() => router.back()} />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.messagesContainer}>
          {chatRoom?.messages?.length ? (
            <FlatList
              ref={flatListRef}
              data={chatRoom.messages}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.messagesContent}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
            />
          ) : (
            renderEmptyMessages()
          )}
        </View>
        
        <ChatInput
          message={message}
          onChangeMessage={setMessage}
          onSend={handleSend}
          sending={sending}
        />
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
});
