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
  Keyboard,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getChatRoomById, updateChatRoomMessages, updateChatRoom, ChatRoom, ChatMessage, MAX_MESSAGES_PER_CHAT_ROOM, WARNING_MESSAGE_THRESHOLD } from '../services/chatRoomService';
import { sendMessageToLessonAI, sendMessageToLessonAIHttp } from '../services/lessonAIService';
import { useAuthStore } from '../store/auth';
import { StatusBar } from 'expo-status-bar';
import { Timestamp } from 'firebase/firestore';
// ChatsHeaderコンポーネントが見つからないため、コメントアウト
// import ChatsHeader from './components/ui/ChatsHeader';
import { ChatInput } from './features/chat/components/ChatInput';
import { useFocusEffect } from 'expo-router';
import { getUserInstrumentInfo, InstrumentModel } from '../services/userProfileService';
import { isDemoMode, demoModeService, startDemoAIConversation } from '../services/demoModeService';
import StreamingChatMessages from './features/chat/components/StreamingChatMessages';

// 定数定義の追加
const MAX_MESSAGE_LENGTH = 2000; // メッセージの最大文字数

// チャットルーム画面のメインコンポーネント
export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, premiumStatus, isDemo } = useAuthStore();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const [useHttpDirect] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 編集用の状態
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [updating, setUpdating] = useState(false);

  // モデル選択用の状態
  const [availableModels, setAvailableModels] = useState<InstrumentModel[]>([]);
  const [selectedChatModel, setSelectedChatModel] = useState<string>('standard');
  const [isModelModalVisible, setIsModelModalVisible] = useState(false);
  const isPremium = premiumStatus?.isPremium || false;

  // パラメータの取得（トップレベルで一度だけ実行）
  const params = useLocalSearchParams();
  const isNewlyCreated = params.isNewlyCreated === 'true';

  // 新規作成フラグをトラッキングするための状態
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // 初回マウント時にデータを読み込み、ユーザーの楽器情報を取得
  useEffect(() => {
    console.log('初期読み込み: useEffectトリガー', { id, userId: user?.uid, isNewlyCreated, isDemo });
    
    if (!initialLoadDone) {
      loadChatRoom();
      if (!isDemo) {
        loadUserInstrument();
      }
      setInitialLoadDone(true);
    }
  }, [id, user?.uid, retryCount, isDemo]);

  // ユーザーの楽器情報を取得
  const loadUserInstrument = async () => {
    try {
      const instrumentInfo = await getUserInstrumentInfo();
      if (instrumentInfo) {
        console.log('ユーザー楽器情報を取得:', instrumentInfo.instrumentName);
        
        // サクソフォンの場合、利用可能なモデルを設定
        if (instrumentInfo.instrumentId === 'saxophone') {
          // 楽器情報から利用可能なモデル一覧を取得
          setAvailableModels(instrumentInfo.models || []);
          
          // 現在選択されているモデルをデフォルトに設定
          if (chatRoom?.modelType) {
            setSelectedChatModel(chatRoom.modelType);
          } else {
            setSelectedChatModel('standard');
          }
        }
      } else {
        console.log('楽器情報が見つかりません、デフォルト値を使用します');
      }
    } catch (error) {
      console.error('楽器情報取得エラー:', error);
    }
  };
  
  // チャットルームデータの読み込み関数
  const loadChatRoom = async () => {
    if (!id) {
      setLoading(false);
      setError('チャットルームIDが見つかりません');
      return;
    }

    const roomId = Array.isArray(id) ? id[0] : id;
    console.log('チャットルーム読み込み開始 - ID:', roomId, 'デモモード:', isDemo);

    // デモモードの場合、ユーザー認証をスキップ
    if (!user && !isDemo) {
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
      
      let roomData: any;
      
      // デモモードの場合は別の取得方法を使用
      if (isDemo) {
        roomData = await demoModeService.getChatRoomById(roomId);
        
        // デモモードのChatRoomをチャットルーム画面用のChatRoomに変換
        if (roomData) {
          // デモモードのメッセージを取得
          const messages = await demoModeService.getAllChatMessages();
          const roomMessages = messages.filter(msg => msg.roomId === roomId).map(msg => ({
            id: msg.id,
            content: msg.content,
            sender: msg.isUser ? 'user' : 'ai',
            timestamp: msg.timestamp instanceof Timestamp ? msg.timestamp : Timestamp.fromDate(new Date(msg.timestamp))
          }));

          roomData = {
            ...roomData,
            messages: roomMessages,
            topic: roomData.topic || '',
            modelType: roomData.modelType || 'standard',
          };
        }
      } else {
        roomData = await getChatRoomById(roomId);
      }
      
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
      setNewTopic(roomData.topic || '');
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

  // 画面がフォーカスされたときにデータを再読み込み
  useFocusEffect(
    React.useCallback(() => {
      // URLパラメータから直接アクセスした場合のみ読み込みを行う
      if (!chatRoom && initialLoadDone && !id) {
        console.log('チャットルームを再読み込みします', { hasChatRoom: !!chatRoom });
        loadChatRoom();
      }
      
      // フォーカス取得のログのみ記録し、実際の処理は行わない
      console.log('チャットルーム画面がフォーカスされました');
      
      return () => {
        // クリーンアップ処理のログのみ記録
        console.log('チャットルーム画面のフォーカスが外れました');
      };
    }, [id, chatRoom, initialLoadDone])
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
    if (!chatRoom || !newTitle.trim() || (!newTopic || !newTopic.trim())) {
      return;
    }

    try {
      setUpdating(true);
      
      if (isDemo) {
        // デモモードの場合は別の更新方法を使用
        const updatedRoom = {
          ...chatRoom,
          title: newTitle.trim(),
          topic: newTopic.trim(),
          updatedAt: new Date()
        };
        
        const rooms = await demoModeService.getChatRooms();
        const updatedRooms = rooms.map(room => 
          room.id === chatRoom.id ? { ...room, title: newTitle.trim() } : room
        );
        
        await demoModeService.saveChatRooms(updatedRooms);
        setChatRoom(updatedRoom);
      } else {
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
      }
      
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
    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  // モデル選択を適用
  const handleModelSelect = (modelId: string) => {
    // 選択したモデルを取得
    const model = availableModels.find(m => m.id === modelId);
    
    // テスト段階のため、プレミアム制限を一時的に無効化
    /*
    // プロフェッショナルモデルかつプレミアムでない場合は処理を中断
    if (model?.isArtist && !isPremium) {
      Alert.alert(
        'プレミアム会員限定',
        'プロフェッショナルモデルを使用するにはプレミアム会員への登録が必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'プレミアムに登録', 
            onPress: () => router.push('/settings')
          }
        ]
      );
      return;
    }
    */
    
    setSelectedChatModel(modelId);
    setIsModelModalVisible(false);
    
    // 選択したモデルがアーティストモデルかどうかを確認
    const isArtistModel = model?.isArtist || false;
    
    // アーティストモデルの場合はHTTP直接モード、スタンダードモデルの場合はSDK経由モードを設定
    // setUseHttpDirect(isArtistModel);
    
    // 次のメッセージ送信時にこのモデルが使用される
    if (chatRoom) {
      setChatRoom({
        ...chatRoom,
        modelType: modelId
      });
    }
  };

  // モデル選択モーダルを描画
  const renderModelSelectionModal = () => {
    return (
      <Modal
        visible={isModelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>チャットモデルを選択</Text>
            
            {availableModels.map((model) => {
              const isProModel = model.isArtist;
              // テスト段階のため、プレミアムロック表示を無効化
              const needsPremium = false; // 常にfalseに設定
              
              return (
                <TouchableOpacity
                  key={model.id}
                  style={[
                    styles.modelItem,
                    selectedChatModel === model.id && styles.selectedModelItem,
                    isProModel && styles.proModelItem,
                    needsPremium && styles.premiumLockedModelItem
                  ]}
                  onPress={() => handleModelSelect(model.id)}
                >
                  <View style={styles.modelHeaderRow}>
                    <Text style={styles.modelName}>{model.name}</Text>
                    {isProModel && (
                      <View style={styles.proBadge}>
                        <Text style={styles.proBadgeText}>プロフェッショナル</Text>
                      </View>
                    )}
                    {/* テスト段階のため、プレミアムバッジを非表示
                    {needsPremium && (
                      <View style={styles.premiumBadge}>
                        <MaterialIcons name="lock" size={14} color="#FFCC00" />
                        <Text style={styles.premiumBadgeText}>プレミアム</Text>
                      </View>
                    )}
                    */}
                  </View>
                  
                  {model.description && (
                    <Text style={styles.modelDescription}>{model.description}</Text>
                  )}
                  
                  {selectedChatModel === model.id && (
                    <MaterialIcons name="check" size={24} color="#007AFF" style={styles.checkIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
            
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsModelModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>キャンセル</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // メッセージ送信
  const handleSend = async () => {
    if (!message.trim() || sending) return;
    
    try {
      setSending(true);
      setError(null);
      
      // Firebase Functions接続テスト - 削除
      // 診断用にAPI直接接続テストを実行
      console.log('メッセージ送信処理を開始...');
      
      // 新しいメッセージを作成
      const newMessage = {
        id: `local-${Date.now()}`,
        createdAt: new Date(),
        text: message,
        user: {
          _id: user?.uid || 'unknown',
          name: user?.displayName || 'ユーザー',
        },
        pending: true
      };
      
      // メッセージが非常に長い場合は警告
      if (message.length > MAX_MESSAGE_LENGTH) {
        Alert.alert(
          'メッセージが長すぎます',
          `メッセージは${MAX_MESSAGE_LENGTH}文字以内に収めてください。現在: ${message.length}文字`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // チャットルームが存在しない場合はエラー
      if (!chatRoom) {
        Alert.alert('エラー', 'チャットルームが見つかりません');
        return;
      }
      
      // メッセージ数が上限に達していないかチェック
      if (chatRoom.messages && chatRoom.messages.length >= MAX_MESSAGES_PER_CHAT_ROOM) {
        Alert.alert(
          'メッセージ数の上限に達しました',
          `1つのチャットルームで送信できるメッセージは最大${MAX_MESSAGES_PER_CHAT_ROOM}件です。新しいチャットルームを作成してください。`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // 警告閾値を超えたメッセージ数の場合は警告
      if (chatRoom.messages && chatRoom.messages.length >= WARNING_MESSAGE_THRESHOLD) {
        Alert.alert(
          'メッセージ数が多くなっています',
          `このチャットルームのメッセージ数が${WARNING_MESSAGE_THRESHOLD}件を超えました。上限の${MAX_MESSAGES_PER_CHAT_ROOM}件に近づいています。`,
          [
            { text: 'キャンセル', style: 'cancel' },
            { text: 'このまま送信', onPress: () => performSend() }
          ]
        );
        return;
      }
      
      // 通常の送信処理
      await performSend();
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };
  
  // 実際のメッセージ送信処理
  const performSend = async () => {
    if (!chatRoom) return; // chatRoomがnullの場合は処理を中断
    
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
      
      // ChatInputコンポーネント側でメッセージ入力をクリアするようになったため、ここでのクリアは不要
      
      // 選択中のモデルIDを取得
      const currentModelId = selectedChatModel || 'standard';
      
      // メッセージを送信してAIの応答を取得
      console.log('AIにメッセージを送信:', {
        message: message.trim(),
        conversationId: chatRoom.conversationId || '(新規)',
        modelType: currentModelId,
        roomId: chatRoom.id,
        isTestMode: false,
        isDemo: isDemo
      });
      
      let aiResponse;
      
      if (isDemo) {
        // デモモードの場合
        aiResponse = await startDemoAIConversation(message.trim());
      } else {
        // 通常モードの場合
        aiResponse = await sendMessageToLessonAI(
          message.trim(), 
          chatRoom.conversationId || '',
          currentModelId,
          chatRoom.id,
          false // isTestMode
        );
      }
      
      console.log('AI応答結果:', aiResponse);
      
      if (!aiResponse || (isDemo ? !aiResponse.content : !aiResponse.success)) {
        console.error('AI応答エラー:', aiResponse);
        throw new Error(isDemo ? 'デモAIからの応答の取得に失敗しました' : (aiResponse?.message || 'AIからの応答の取得に失敗しました'));
      }
      
      // AIの応答メッセージを作成
      const aiMessage: ChatMessage = {
        id: isDemo ? `ai-demo-${Date.now()}` : (aiResponse.messageId || `ai-${Date.now()}`),
        content: isDemo ? aiResponse.content : aiResponse.answer,
        sender: 'ai',
        timestamp: Timestamp.now()
      };
      
      // 会話IDを保存
      const conversationId = isDemo ? '' : (aiResponse.conversationId || '');
      
      // 更新されたメッセージリストとconversationIdを含むチャットルームの新しい状態
      const updatedChatRoom: ChatRoom = {
        ...chatRoom,
        messages: [...updatedMessages, aiMessage],
        conversationId: conversationId,
        updatedAt: Timestamp.now()
      };
      
      // ローカル状態を更新
      setChatRoom(updatedChatRoom);
      
      if (isDemo) {
        // デモモードの場合はローカルストレージに保存
        // デモモード用のChatMessageに変換
        const demoChatMessage = {
          id: aiMessage.id,
          roomId: chatRoom.id,
          content: aiMessage.content,
          isUser: false,
          timestamp: new Date()
        };
        
        await demoModeService.addMessageToChatRoom(updatedChatRoom.id, demoChatMessage);
      } else {
        // Firestoreデータを更新
        await updateChatRoomMessages(updatedChatRoom.id, updatedChatRoom.messages, conversationId);
      }
      
      // 最新のメッセージにスクロール
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました');
    } finally {
      setSending(false);
    }
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

  // モデル選択モーダルを開く
  const handleOpenModelModal = () => {
    setIsModelModalVisible(true);
  };

  if (loading) {
    return (
      <>
        <StatusBar style="dark" />
        <SafeAreaView style={styles.safeArea}>
          <Stack.Screen
            options={{
              headerShown: true,
              headerTitle: chatRoom?.title || 'チャット',
              headerStyle: {
                backgroundColor: '#FFFFFF',
              },
              headerTitleStyle: {
                fontWeight: '600',
                color: '#343541',
                fontSize: 16,
              },
              headerShadowVisible: true,
              headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()} style={{padding: 10}}>
                  <Ionicons name="arrow-back" size={24} color="#6E56CF" />
                </TouchableOpacity>
              ),
            }}
          />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>チャット読み込み中...</Text>
          </View>
        </SafeAreaView>
      </>
    );
  }
  
  return (
    <>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen
          options={{
            headerShown: true,
            headerTitle: chatRoom?.title || 'チャット',
            headerStyle: {
              backgroundColor: '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: '600',
              color: '#343541',
              fontSize: 16,
            },
            headerShadowVisible: true,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{padding: 10}}>
                <Ionicons name="arrow-back" size={24} color="#6E56CF" />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <View style={{flexDirection: 'row'}}>
                {availableModels.length > 0 && (
                  <TouchableOpacity onPress={handleOpenModelModal} style={{padding: 10}}>
                    <MaterialIcons name="switch-access-shortcut" size={24} color="#6E56CF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleOpenEditModal} style={{padding: 10}}>
                  <MaterialIcons name="edit" size={24} color="#6E56CF" />
                </TouchableOpacity>
              </View>
            ),
          }}
        />
        
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: '#FFFFFF' }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={48} color="#FF3B30" />
              <Text style={styles.errorTitle}>エラーが発生しました</Text>
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
            <View
              style={styles.container}
            >
              {chatRoom && chatRoom.messages && chatRoom.messages.length > 0 ? (
                <StreamingChatMessages 
                  messages={chatRoom.messages}
                  loading={loading}
                  enableStreaming={true}
                  showAvatars={false}
                />
              ) : (
                renderEmptyMessages()
              )}
              
              {availableModels.length > 0 && (
                <TouchableOpacity 
                  style={styles.modelIndicator}
                  onPress={handleOpenModelModal}
                >
                  <View style={styles.modelIndicatorContent}>
                    <MaterialIcons name="model-training" size={14} color="#1C1C1E" />
                    <Text style={styles.modelIndicatorText}>
                      {availableModels.find(m => m.id === selectedChatModel)?.name || 'スタンダード'}
                    </Text>
                    <MaterialIcons name="keyboard-arrow-down" size={14} color="#1C1C1E" />
                  </View>
                </TouchableOpacity>
              )}
              
              <ChatInput
                message={message}
                onChangeMessage={setMessage}
                onSend={handleSend}
                sending={sending}
                roomId={chatRoom?.id || ""}
                instrument={selectedChatModel || "standard"}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
      
      {/* チャットルーム情報編集モーダル */}
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>チャットルーム情報の編集</Text>
            
            <Text style={styles.inputLabel}>タイトル</Text>
            <TextInput
              style={styles.textInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="チャットルームのタイトル"
              placeholderTextColor="#C7C7CC"
            />
            
            <Text style={styles.inputLabel}>トピック</Text>
            <TextInput
              style={styles.textInput}
              value={newTopic}
              onChangeText={setNewTopic}
              placeholder="チャットのトピック"
              placeholderTextColor="#C7C7CC"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setIsEditModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleUpdateRoom}
                disabled={updating || !newTitle.trim() || !newTopic.trim()}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.saveButtonText}>保存</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* モデル選択モーダル */}
      {renderModelSelectionModal()}
    </>
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
    paddingBottom: 20,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#1C1C1E',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  textInput: {
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#F1F3F4',
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    backgroundColor: '#4285F4',
  },
  cancelButtonText: {
    color: '#5F6368',
    fontWeight: '600',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  saveButtonText: {
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
  modelIndicator: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'center',
    marginVertical: 8,
  },
  modelIndicatorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelIndicatorText: {
    fontSize: 14,
    color: '#1C1C1E',
    marginHorizontal: 4,
  },
  modelItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedModelItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  proModelItem: {
    backgroundColor: '#F8F9FA',
    borderColor: '#FFCC00',
    borderWidth: 1,
  },
  premiumLockedModelItem: {
    opacity: 0.7,
  },
  modelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1C1C1E',
    marginRight: 8,
  },
  proBadge: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 6,
  },
  proBadgeText: {
    color: '#1C1C1E',
    fontSize: 10,
    fontWeight: '600',
  },
  premiumBadge: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadgeText: {
    color: '#1C1C1E',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 2,
  },
  modelDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  checkIcon: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  closeButton: {
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#EA4335',
  },
});
