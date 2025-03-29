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
import { getChatRoomById, updateChatRoomMessages, updateChatRoom, ChatRoom, ChatMessage, MAX_MESSAGES_PER_CHAT_ROOM, WARNING_MESSAGE_THRESHOLD } from './services/chatRoomService';
import { sendMessageToLessonAI, sendMessageToLessonAIHttp } from './services/lessonAIService';
import { useAuthStore } from './store/auth';
import { StatusBar } from 'expo-status-bar';
import { Timestamp } from 'firebase/firestore';
import ChatsHeader from './components/ui/ChatsHeader';
import { ChatInput } from './features/chat/components/ChatInput';
import { useFocusEffect } from 'expo-router';
import { createTaskFromChatUsingFunction } from './services/taskService';

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
  const [useHttpDirect, setUseHttpDirect] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 編集用の状態
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [updating, setUpdating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);

  // パラメータの取得（トップレベルで一度だけ実行）
  const params = useLocalSearchParams();
  const isNewlyCreated = params.isNewlyCreated === 'true';

  // 新規作成フラグをトラッキングするための状態
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // チャットルームデータの読み込み関数
  const loadChatRoom = async () => {
    if (!id) {
      setLoading(false);
      setError('チャットルームIDが見つかりません');
      return;
    }

    const roomId = Array.isArray(id) ? id[0] : id;
    console.log('チャットルーム読み込み開始 - ID:', roomId);

    if (!user) {
      console.log('認証情報が確認できません。5秒後に再試行します');
      setLoading(true);
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        loadChatRoom();
      }, 5000);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('チャットルームデータを読み込み中:', roomId, '試行回数:', retryCount + 1);
      
      const roomData = await getChatRoomById(roomId);
      
      if (!roomData) {
        console.error(`チャットルーム(ID: ${roomId})が見つかりません`);
        setError('チャットルームが見つかりませんでした');
        
        if (retryCount < 3) {
          console.log(`3秒後に再試行します (${retryCount + 1}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            loadChatRoom();
          }, 3000);
          return;
        } else {
          Alert.alert(
            'エラー', 
            'チャットルームが見つかりませんでした。再試行しますか？',
            [
              {
                text: 'キャンセル',
                onPress: () => router.back(),
                style: 'cancel'
              },
              {
                text: '再試行',
                onPress: () => {
                  setRetryCount(0);
                  loadChatRoom();
                }
              }
            ]
          );
          return;
        }
      }
      
      setChatRoom(roomData);
      // 編集用の初期値をセット
      setNewTitle(roomData.title);
      setNewTopic(roomData.topic);
      setRetryCount(0);
      console.log('チャットルームデータの読み込みが完了しました', roomData.title);
    } catch (error) {
      console.error('チャットルーム読み込みエラー:', error);
      setError('チャットルームの読み込みに失敗しました');
      
      if (retryCount < 3) {
        console.log(`3秒後に再試行します (${retryCount + 1}/3)`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadChatRoom();
        }, 3000);
      } else {
        Alert.alert(
          'エラー', 
          'チャットルームの読み込みに失敗しました。再試行しますか？',
          [
            {
              text: 'キャンセル',
              onPress: () => router.back(),
              style: 'cancel'
            },
            {
              text: '再試行',
              onPress: () => {
                setRetryCount(0);
                loadChatRoom();
              }
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 初回マウント時にデータを読み込む
  useEffect(() => {
    console.log('初期読み込み: useEffectトリガー', { id, userId: user?.uid, isNewlyCreated });
    
    if (!initialLoadDone) {
      loadChatRoom();
      setInitialLoadDone(true);
    }
  }, [id, user?.uid, retryCount]);

  // 画面がフォーカスされたときにデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      console.log('チャットルーム画面がフォーカスされました');
      
      if (!chatRoom && initialLoadDone) {
        console.log('チャットルームを再読み込みします', { hasChatRoom: !!chatRoom });
        loadChatRoom();
      }
      
      return () => {
        // クリーンアップ処理
        console.log('チャットルーム画面のフォーカスが外れました');
      };
    }, [id, user?.uid, chatRoom, loadChatRoom, initialLoadDone])
  );

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
    
    // メッセージ数が上限に達している場合は送信をブロック
    if (chatRoom.messages.length >= MAX_MESSAGES_PER_CHAT_ROOM) {
      Alert.alert(
        'メッセージ数上限',
        'このチャットルームのメッセージ数が上限に達しました。新しいチャットルームを作成してください。',
        [
          {
            text: 'キャンセル',
            style: 'cancel'
          },
          {
            text: '新規チャットルーム作成',
            onPress: () => {
              router.push('/chat-room-form');
            }
          }
        ]
      );
      return;
    }
    
    // メッセージ数が警告閾値を超えた場合は警告を表示
    if (chatRoom.messages.length >= WARNING_MESSAGE_THRESHOLD) {
      Alert.alert(
        'メッセージ数警告',
        `メッセージ数が${WARNING_MESSAGE_THRESHOLD}を超えました。間もなく上限の${MAX_MESSAGES_PER_CHAT_ROOM}に達します。新しいチャットルームの作成をお勧めします。`,
        [
          {
            text: 'このまま続ける',
            style: 'cancel'
          },
          {
            text: '新規チャットルーム作成',
            onPress: () => {
              router.push('/chat-room-form');
            }
          }
        ]
      );
    }
    
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
        message: message.trim(),
        conversationId: chatRoom.conversationId || '(新規)',
        modelType: chatRoom.modelType || 'default',
        roomId: chatRoom.id,
        isTestMode: false,
        useHttpDirect
      });
      
      // HTTP直接呼び出しかFirebase Functions経由かを選択
      let aiResponse;
      if (useHttpDirect) {
        aiResponse = await sendMessageToLessonAIHttp(
          message.trim(), 
          chatRoom.conversationId,
          chatRoom.modelType,
          chatRoom.id,
          false  // isTestMode
        );
      } else {
        aiResponse = await sendMessageToLessonAI(
          message.trim(), 
          chatRoom.conversationId,
          chatRoom.modelType,
          chatRoom.id,
          false  // isTestMode
        );
      }
      
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
      await updateChatRoomMessages(chatRoom.id, finalMessages, updatedChatRoom.conversationId);
      
      // AIの応答後にメッセージ数が警告閾値を超えたか確認
      if (finalMessages.length >= WARNING_MESSAGE_THRESHOLD && finalMessages.length < MAX_MESSAGES_PER_CHAT_ROOM) {
        setTimeout(() => {
          Alert.alert(
            'メッセージ数警告',
            `メッセージ数が${WARNING_MESSAGE_THRESHOLD}を超えました。間もなく上限の${MAX_MESSAGES_PER_CHAT_ROOM}に達します。新しいチャットルームの作成をお勧めします。`,
            [
              {
                text: 'このまま続ける',
                style: 'cancel'
              },
              {
                text: '新規チャットルーム作成',
                onPress: () => {
                  router.push('/chat-room-form');
                }
              }
            ]
          );
        }, 500);
      }
      
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
  
  // チャット内容からタスクを作成する関数
  const handleCreateTask = async () => {
    try {
      setCreatingTask(true);
      
      if (!chatRoom || !chatRoom.messages || chatRoom.messages.length === 0) {
        Alert.alert('エラー', '会話内容からタスクを作成できません。メッセージがありません。');
        return;
      }
      
      // チャットルームの全メッセージを使用
      const allMessages = chatRoom.messages;
      
      // タスク作成APIを呼び出し（クラウド関数を使用）
      const result = await createTaskFromChatUsingFunction(
        allMessages,
        chatRoom.title,
        chatRoom.topic
      );
      
      if (result.success) {
        Alert.alert(
          'タスク作成完了',
          'チャット内容からタスクを作成しました。タスクタブで確認できます。',
          [
            {
              text: 'OK',
              onPress: () => { /* 何もしない */ }
            },
            {
              text: 'タスクを確認',
              onPress: () => router.push('/tabs/task')
            }
          ]
        );
      } else {
        throw new Error(result.message || 'タスク作成に失敗しました');
      }
    } catch (error) {
      console.error('タスク作成エラー:', error);
      Alert.alert('エラー', 'タスクの作成に失敗しました。後でもう一度お試しください。');
    } finally {
      setCreatingTask(false);
    }
  };

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
        onExportPress={handleCreateTask}
      />
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => {
                setRetryCount(0);
                loadChatRoom();
              }}
            >
              <Text style={styles.retryButtonText}>再試行</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
        
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EA4335',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#4285F4',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  loadingMoreText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#4285F4',
  },
  inputContainer: {
    padding: 16,
  },
  messageWrapper: {
    marginVertical: 6,
    flexDirection: 'row',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  aiMessage: {
    justifyContent: 'flex-start',
  },
  userBubble: {
    backgroundColor: '#4285F4',
  },
  aiBubble: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#333333',
  },
});
