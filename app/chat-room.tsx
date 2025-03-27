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
  Modal,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getChatRoomById, updateChatRoomMessages, updateChatRoom } from './services/chatRoomService';
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
  
  // 編集用の状態
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [updating, setUpdating] = useState(false);

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
        // 編集用の初期値をセット
        setNewTitle(roomData.title);
        setNewTopic(roomData.topic);
      } catch (error) {
        console.error('チャットルーム読み込みエラー:', error);
        Alert.alert('エラー', 'チャットルームの読み込みに失敗しました');
      } finally {
        setLoading(false);
      }
    };
    
    loadChatRoom();
  }, [id, user, router]);

  // 編集モーダルを開く
  const handleOpenEditModal = () => {
    if (chatRoom) {
      setNewTitle(chatRoom.title);
      setNewTopic(chatRoom.topic);
      setIsEditModalVisible(true);
    }
  };

  // チャットルーム情報を更新
  const handleUpdateRoom = async () => {
    if (!chatRoom || !newTitle.trim() || !newTopic.trim()) {
      return;
    }

    try {
      setUpdating(true);
      
      // updatedAtはserverTimestamp()によって自動的に設定される
      await updateChatRoom(chatRoom.id, {
        title: newTitle.trim(),
        topic: newTopic.trim()
      });
      
      // 成功したらローカルの状態も更新
      // ローカルのタイムスタンプはクライアント側で作成
      const currentTimestamp = Timestamp.now();
      setChatRoom({
        ...chatRoom,
        title: newTitle.trim(),
        topic: newTopic.trim(),
        updatedAt: currentTimestamp
      });
      
      // モーダルを閉じる
      setIsEditModalVisible(false);
      
      // 成功メッセージ
      Alert.alert('成功', 'チャットルーム情報を更新しました');
    } catch (error) {
      console.error('チャットルーム更新エラー:', error);
      Alert.alert('エラー', 'チャットルームの更新に失敗しました。後でもう一度お試しください。');
    } finally {
      setUpdating(false);
    }
  };
  
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
      console.log('AIにメッセージを送信:', {
        message: message,
        conversationId: chatRoom.conversationId || '(新規)',
        modelType: chatRoom.modelType || 'default',
        roomId: chatRoom.id,
        isTestMode: false
      });
      
      const aiResponse = await sendMessageToLessonAI(
        message, 
        chatRoom.conversationId,
        chatRoom.modelType,
        chatRoom.id,
        false  // isTestMode - 明示的にfalseを指定
      );
      
      console.log('AI応答結果:', aiResponse);
      
      if (!aiResponse || !aiResponse.success) {
        console.error('AI応答エラー:', aiResponse);
        throw new Error(aiResponse?.message || 'AIからの応答の取得に失敗しました');
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
      
      <ChatsHeader 
        title={chatRoom?.title || 'チャット'} 
        onBackPress={() => router.back()} 
        onEditPress={handleOpenEditModal}
      />
      
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
          roomId={chatRoom?.id || ""}
          instrument={chatRoom?.modelType || ""}
        />
      </KeyboardAvoidingView>
      
      {/* 編集モーダル */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>チャットルーム情報の編集</Text>
            
            <Text style={styles.inputLabel}>タイトル</Text>
            <TextInput
              style={styles.input}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="チャットルームのタイトル"
              placeholderTextColor="#9AA0A6"
              maxLength={50}
            />
            
            <Text style={styles.inputLabel}>トピック</Text>
            <TextInput
              style={styles.input}
              value={newTopic}
              onChangeText={setNewTopic}
              placeholder="チャットのトピック"
              placeholderTextColor="#9AA0A6"
              maxLength={30}
            />
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setIsEditModalVisible(false)}
              >
                <Text style={styles.cancelModalButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleUpdateRoom}
                disabled={updating || !newTitle.trim() || !newTopic.trim()}
              >
                <Text style={styles.confirmModalButtonText}>更新</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#202124',
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelModalButton: {
    backgroundColor: '#F1F3F4',
  },
  confirmModalButton: {
    backgroundColor: '#4285F4',
  },
  cancelModalButtonText: {
    color: '#5F6368',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  confirmModalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
