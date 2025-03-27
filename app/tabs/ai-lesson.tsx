import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  RefreshControl,
  Platform,
  Alert,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { getUserChatRooms, ChatRoom, deleteChatRoom } from '../services/chatRoomService';
import { useTheme } from '../theme';
import Animated, { FadeIn, SlideInRight, SlideInUp } from 'react-native-reanimated';
import { RippleButton } from '../components/RippleButton';
import { instrumentCategories } from '../services/userProfileService';

// テーマの色を直接定義
const colors = {
  primary: '#4285F4',
  primaryLight: '#8AB4F8',
  primaryDark: '#1A73E8',
  secondary: '#34A853',
  background: '#FFFFFF',
  text: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  textInverse: '#FFFFFF',
  border: '#DADCE0',
  borderLight: '#E8EAED',
  ripple: 'rgba(66, 133, 244, 0.12)',
  success: '#34A853',
  warning: '#FBBC05',
  error: '#EA4335',
};

// AIレッスンタブのテーマカラー
const AI_THEME_COLOR = '#7C4DFF';

// タブの定義
const TABS = {
  PRACTICE: 'practice',
  CONSULTATION: 'consultation',
};

// サンプルの練習チャットルーム
const PRACTICE_CHAT_ROOMS: ChatRoom[] = [
  {
    id: 'practice-1',
    title: 'トーン練習',
    topic: '音色改善',
    modelType: 'practice',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    userId: 'sample',
    messages: [],
  },
  {
    id: 'practice-2',
    title: '高音域練習',
    topic: '音域拡大',
    modelType: 'practice',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    userId: 'sample',
    messages: [],
  },
  {
    id: 'practice-3',
    title: '低音域練習',
    topic: '音域安定',
    modelType: 'practice',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    userId: 'sample',
    messages: [],
  },
  {
    id: 'practice-4',
    title: 'タンギング練習',
    topic: '技術向上',
    modelType: 'practice',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    userId: 'sample',
    messages: [],
  },
  {
    id: 'practice-5',
    title: 'ビブラート練習',
    topic: '表現力',
    modelType: 'practice',
    createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    updatedAt: { seconds: Date.now() / 1000, nanoseconds: 0 },
    userId: 'sample',
    messages: [],
  },
];

// モデルタイプからわかりやすい名前を取得する関数
const getModelDisplayName = (modelType: string): string => {
  if (!modelType) return 'スタンダード';
  
  if (modelType === 'practice') return '練習用';
  
  try {
    // 形式: categoryId-instrumentId-modelId (例: 'woodwind-saxophone-ueno')
    const parts = modelType.split('-');
    if (parts.length < 3) return 'スタンダード';
    
    const categoryId = parts[0];
    const instrumentId = parts[1];
    const modelId = parts[2];
    
    // カテゴリ、楽器、モデルを検索
    for (const category of instrumentCategories) {
      if (category.id === categoryId) {
        for (const instrument of category.instruments || []) {
          if (instrument.id === instrumentId) {
            if (instrument.models) {
              for (const model of instrument.models) {
                if (model.id === modelId) {
                  return model.isArtist ? `アーティストモデル: ${model.name}` : model.name;
                }
              }
            }
          }
        }
      }
    }
    
    return 'スタンダード';
  } catch (error) {
    console.error('モデル名取得エラー:', error);
    return 'スタンダード';
  }
};

export default function AILessonScreen() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>(TABS.CONSULTATION);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const router = useRouter();
  const { user } = useAuthStore();
  const theme = useTheme();

  console.log('AILessonScreen rendering, user:', user?.uid);

  const loadChatRooms = useCallback(async () => {
    try {
      console.log('loadChatRooms called');
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.log('No user found');
        setLoading(false);
        return;
      }
      
      console.log('Fetching chat rooms for user:', user.uid);
      const rooms = await getUserChatRooms(user.uid);
      console.log('Fetched chat rooms:', rooms.length);
      setChatRooms(rooms);
    } catch (error) {
      console.error('チャットルーム一覧の取得に失敗しました:', error);
      setError('チャットルーム一覧の取得に失敗しました');
      Alert.alert('エラー', 'チャットルーム一覧の取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    console.log('useEffect triggered for loadChatRooms');
    loadChatRooms();
  }, [loadChatRooms]);

  const handleRefresh = useCallback(() => {
    console.log('handleRefresh called');
    setRefreshing(true);
    loadChatRooms();
  }, [loadChatRooms]);

  const handleCreateRoom = useCallback(async () => {
    try {
      console.log('handleCreateRoom called');
      if (!user) {
        console.log('No user found for room creation');
        return;
      }
      
      console.log('Navigating to chat-room-form');
      router.push({
        pathname: '/chat-room-form' as any
      });
    } catch (error) {
      console.error('チャットルーム作成画面へのナビゲーションエラー:', error);
      Alert.alert('エラー', 'チャットルーム作成画面に移動できませんでした。');
    }
  }, [router, user]);

  const handleOpenRoom = useCallback((roomId: string) => {
    if (isSelectionMode) {
      // 選択モード中はルーム選択の処理
      // 選択/選択解除のロジック
      setSelectedRoomIds(prev => {
        if (prev.includes(roomId)) {
          return prev.filter(id => id !== roomId);
        } else {
          return [...prev, roomId];
        }
      });
      return;
    }
    
    // 練習タブのアイテムをクリックした場合
    if (activeTab === TABS.PRACTICE) {
      Alert.alert(
        '開発中',
        'この機能は現在開発中です。もうしばらくお待ちください。',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // 通常のチャットルーム表示処理
    router.push({
      pathname: '/chat-room',
      params: { id: roomId }
    });
  }, [router, isSelectionMode, activeTab, setSelectedRoomIds]);

  const handleLongPress = useCallback((roomId: string) => {
    // 選択モードを開始
    setIsSelectionMode(true);
    setSelectedRoomIds([roomId]);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedRoomIds.length === 0) return;

    Alert.alert(
      '削除の確認',
      `選択した${selectedRoomIds.length}個のチャットルームを削除しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // 選択されたすべてのチャットルームを削除
              for (const roomId of selectedRoomIds) {
                await deleteChatRoom(roomId);
              }
              
              // リストを更新
              await loadChatRooms();
              
              // 選択モードを解除
              setIsSelectionMode(false);
              setSelectedRoomIds([]);
              
              // 成功メッセージ
              Alert.alert('完了', 'チャットルームが削除されました');
            } catch (error) {
              console.error('チャットルーム削除エラー:', error);
              Alert.alert('エラー', 'チャットルームの削除に失敗しました。後でもう一度お試しください。');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  }, [selectedRoomIds, loadChatRooms]);

  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedRoomIds([]);
  }, []);

  const renderTabBar = () => (
    <View style={styles.tabContainer}>
      <Pressable
        style={[
          styles.tabButton,
          activeTab === TABS.PRACTICE && styles.activeTabButton
        ]}
        onPress={() => setActiveTab(TABS.PRACTICE)}
      >
        <View style={styles.tabContent}>
          <MaterialIcons 
            name="fitness-center" 
            size={20} 
            color={activeTab === TABS.PRACTICE ? AI_THEME_COLOR : '#5F6368'} 
          />
          <Text
            style={[
              styles.tabText,
              activeTab === TABS.PRACTICE && styles.activeTabText
            ]}
          >
            トレーニング
          </Text>
        </View>
        {activeTab === TABS.PRACTICE && <View style={styles.tabIndicator} />}
      </Pressable>
      
      <Pressable
        style={[
          styles.tabButton,
          activeTab === TABS.CONSULTATION && styles.activeTabButton
        ]}
        onPress={() => setActiveTab(TABS.CONSULTATION)}
      >
        <View style={styles.tabContent}>
          <MaterialIcons 
            name="chat" 
            size={20} 
            color={activeTab === TABS.CONSULTATION ? AI_THEME_COLOR : '#5F6368'} 
          />
          <Text
            style={[
              styles.tabText,
              activeTab === TABS.CONSULTATION && styles.activeTabText
            ]}
          >
            チャット
          </Text>
        </View>
        {activeTab === TABS.CONSULTATION && <View style={styles.tabIndicator} />}
      </Pressable>
    </View>
  );

  const renderChatRoomItem = useCallback(({ item, index }: { item: ChatRoom, index: number }) => {
    const isSelected = selectedRoomIds.includes(item.id);
    
    return (
      <Animated.View 
        entering={SlideInRight.delay(index * 100).springify().damping(15)}
      >
        <RippleButton
          onPress={() => handleOpenRoom(item.id)}
          onLongPress={() => handleLongPress(item.id)}
          rippleColor={theme.colors.ripple} 
          style={[
            styles.chatRoomItem,
            isSelected && styles.selectedChatRoomItem
          ]}
        >
          {isSelectionMode && (
            <View style={styles.checkboxContainer}>
              <View style={[
                styles.checkbox,
                isSelected && styles.checkboxSelected
              ]}>
                {isSelected && (
                  <MaterialIcons name="check" size={16} color="#FFFFFF" />
                )}
              </View>
            </View>
          )}
          
          <View style={styles.chatRoomContent}>
            <Text style={[styles.chatRoomTitle, { color: theme.colors.text }]}>{item.title}</Text>
            <View style={styles.topicContainer}>
              <Text style={[styles.chatRoomTopic, { backgroundColor: theme.colors.primaryLight, color: theme.colors.textInverse }]}>
                {item.topic}
              </Text>
              {item.modelType && (
                <Text style={[styles.modelType, { backgroundColor: theme.colors.secondaryLight, color: theme.colors.textInverse }]}>
                  {getModelDisplayName(item.modelType)}
                </Text>
              )}
            </View>
            <Text style={[styles.date, { color: theme.colors.textTertiary }]}>
              {!item.updatedAt ? '日付なし' 
                : new Date(item.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')}
            </Text>
          </View>
          
          {!isSelectionMode && (
            <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
          )}
        </RippleButton>
      </Animated.View>
    );
  }, [theme.colors, handleOpenRoom, handleLongPress, isSelectionMode, selectedRoomIds]);

  const renderPracticeChatRoomItem = useCallback(({ item, index }: { item: ChatRoom, index: number }) => (
    <Animated.View 
      entering={SlideInRight.delay(index * 100).springify().damping(15)}
    >
      <RippleButton
        onPress={() => handleOpenRoom(item.id)}
        rippleColor={theme.colors.ripple} 
        style={styles.chatRoomItem}
      >
        <View style={styles.practiceIconContainer}>
          <FontAwesome5 name="music" size={20} color={'#FFFFFF'} />
        </View>
        <View style={styles.chatRoomContent}>
          <Text style={[styles.chatRoomTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <View style={styles.topicContainer}>
            <Text style={[styles.chatRoomTopic, { backgroundColor: theme.colors.primaryLight, color: theme.colors.textInverse }]}>
              {item.topic}
            </Text>
          </View>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={theme.colors.primary} />
      </RippleButton>
    </Animated.View>
  ), [theme.colors, handleOpenRoom]);

  const EmptyState = useCallback(() => {
    console.log('Rendering EmptyState');
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconContainer}>
          <Ionicons 
            name="chatbubbles-outline" 
            size={100} 
            color="#CCCCCC" 
            style={styles.emptyIcon}
          />
          <View style={styles.chatBubble}>
            <MaterialIcons name="music-note" size={24} color="#FFFFFF" />
          </View>
        </View>
        
        <Text style={styles.emptyText}>
          AIレッスンルームがありません
        </Text>
        
        <Text style={styles.emptySubtext}>
          AIコーチとチャットして{'\n'}練習メニューを作成しましょう
        </Text>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateRoom}
        >
          <Text style={styles.createButtonText}>
            最初のチャットを始める
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    );
  }, [handleCreateRoom]);

  const renderConsultationTab = () => (
    <>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadChatRooms}>
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AI_THEME_COLOR} />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      ) : (
        <>
          {chatRooms.length > 0 ? (
            <>
              {isSelectionMode && (
                <View style={styles.selectionHeader}>
                  <Text style={styles.selectionText}>
                    {selectedRoomIds.length}個選択中
                  </Text>
                  <View style={styles.selectionActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={handleCancelSelection}
                    >
                      <Text style={styles.actionButtonText}>キャンセル</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={handleDeleteSelected}
                      disabled={selectedRoomIds.length === 0}
                    >
                      <Text style={styles.actionButtonText}>削除</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <FlatList
                data={chatRooms}
                renderItem={renderChatRoomItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatRoomsList}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={[AI_THEME_COLOR]}
                    tintColor={AI_THEME_COLOR}
                  />
                }
              />
            </>
          ) : (
            <EmptyState />
          )}
        </>
      )}

      {chatRooms.length > 0 && !isSelectionMode && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateRoom}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </>
  );

  const renderPracticeTab = () => (
    <>
      <View style={styles.developmentBanner}>
        <MaterialIcons name="construction" size={20} color="#FFFFFF" />
        <Text style={styles.developmentText}>この機能は現在開発中です</Text>
      </View>
      
      <View style={styles.practiceContentContainer}>
        <FlatList
          data={PRACTICE_CHAT_ROOMS}
          renderItem={renderPracticeChatRoomItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.chatRoomsList}
          showsVerticalScrollIndicator={false}
        />
        
        <View style={styles.developmentOverlay}>
          <Text style={styles.developmentOverlayText}>
            トレーニング機能 近日公開予定
          </Text>
        </View>
      </View>
    </>
  );

  console.log('Render state:', { loading, refreshing, chatRoomsLength: chatRooms.length, error });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {renderTabBar()}
        
        {activeTab === TABS.PRACTICE 
          ? renderPracticeTab()
          : renderConsultationTab()
        }
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'android' ? 24 : 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTabButton: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#5F6368',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  activeTabText: {
    color: AI_THEME_COLOR,
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: '70%',
    backgroundColor: AI_THEME_COLOR,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#5F6368',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#EA4335',
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  retryButton: {
    backgroundColor: AI_THEME_COLOR,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  chatRoomsList: {
    padding: 16,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  practiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AI_THEME_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatRoomContent: {
    flex: 1,
  },
  chatRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  topicContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  chatRoomTopic: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
    overflow: 'hidden',
    marginRight: 8,
  },
  modelType: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '500',
    overflow: 'hidden',
  },
  date: {
    fontSize: 12,
    color: '#9AA0A6',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    opacity: 0.7,
  },
  chatBubble: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7C4DFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#7C4DFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#7C4DFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  selectedChatRoomItem: {
    backgroundColor: 'rgba(124, 77, 255, 0.05)',
    borderWidth: 1,
    borderColor: AI_THEME_COLOR,
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: AI_THEME_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: AI_THEME_COLOR,
  },
  selectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
    color: AI_THEME_COLOR,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectionActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cancelButton: {
    backgroundColor: '#9AA0A6',
  },
  deleteButton: {
    backgroundColor: '#EA4335',
  },
  developmentBanner: {
    backgroundColor: '#FF9800',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  developmentText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  practiceContentContainer: {
    flex: 1,
    position: 'relative',
  },
  developmentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  developmentOverlayText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});