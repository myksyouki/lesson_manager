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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { getUserChatRooms, ChatRoom } from '../services/chatRoomService';
import { useTheme } from '../theme';
import Animated, { FadeIn, SlideInRight, SlideInUp } from 'react-native-reanimated';
import { RippleButton } from '../components/RippleButton';

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

export default function AILessonScreen() {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      router.push('/chat-room-form');
    } catch (error) {
      console.error('チャットルーム作成画面へのナビゲーションエラー:', error);
      Alert.alert('エラー', 'チャットルーム作成画面に移動できませんでした。');
    }
  }, [router, user]);

  const handleOpenRoom = useCallback((roomId: string) => {
    console.log('Opening room:', roomId);
    router.push({
      pathname: '/chat-room',
      params: { id: roomId }
    });
  }, [router]);

  const renderChatRoomItem = useCallback(({ item, index }: { item: ChatRoom, index: number }) => (
    <Animated.View 
      entering={SlideInRight.delay(index * 100).springify().damping(15)}
    >
      <RippleButton
        onPress={() => handleOpenRoom(item.id)}
        rippleColor={theme.colors.ripple} 
        style={styles.chatRoomItem}
      >
        <View style={styles.chatRoomContent}>
          <Text style={[styles.chatRoomTitle, { color: theme.colors.text }]}>{item.title}</Text>
          <View style={styles.topicContainer}>
            <Text style={[styles.chatRoomTopic, { backgroundColor: theme.colors.primaryLight, color: theme.colors.textInverse }]}>
              {item.topic}
            </Text>
          </View>
          <Text style={[styles.date, { color: theme.colors.textTertiary }]}>
            {!item.updatedAt ? '日付なし' 
              : new Date(item.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')}
          </Text>
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
            color={theme.colors.borderLight} 
            style={styles.emptyIcon}
          />
          <View style={[styles.chatBubble, { backgroundColor: theme.colors.primary }]}>
            <MaterialIcons name="music-note" size={24} color={theme.colors.textInverse} />
          </View>
        </View>
        
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
          AIレッスンルームがありません
        </Text>
        
        <Text style={[styles.emptySubtext, { color: theme.colors.textTertiary }]}>
          AIコーチとチャットして練習メニューを作成しましょう
        </Text>
        
        <TouchableOpacity
          style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleCreateRoom}
        >
          <Text style={[styles.createButtonText, { color: theme.colors.textInverse }]}>
            最初のチャットを始める
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color={theme.colors.textInverse} style={styles.buttonIcon} />
        </TouchableOpacity>
      </View>
    );
  }, [theme.colors, handleCreateRoom]);

  console.log('Render state:', { loading, refreshing, chatRoomsLength: chatRooms.length, error });

  // シンプルな表示に変更して問題を特定しやすくする
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AIレッスン</Text>
          <Text style={styles.subtitle}>
            AIコーチと会話して練習メニューを作成しましょう
          </Text>
        </View>

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
            <ActivityIndicator size="large" color="#4285F4" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          <>
            {chatRooms.length > 0 ? (
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
                    colors={["#4285F4"]}
                    tintColor="#4285F4"
                  />
                }
              />
            ) : (
              <EmptyState />
            )}
          </>
        )}

        {chatRooms.length > 0 && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleCreateRoom}
          >
            <MaterialIcons name="add" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    backgroundColor: '#4285F4',
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
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#8AB4F8',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    backgroundColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 16,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#4285F4',
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
    backgroundColor: '#4285F4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
});