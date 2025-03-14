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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { getUserChatRooms, ChatRoom } from '../services/chatRoomService';
import theme from '../theme';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
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
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      loadChatRooms();
    }
  }, [user]);

  const loadChatRooms = async () => {
    try {
      setLoading(true);
      if (!user) return;
      
      const rooms = await getUserChatRooms(user.uid);
      setChatRooms(rooms);
    } catch (error) {
      console.error('チャットルーム一覧の取得に失敗しました:', error);
      Alert.alert('エラー', 'チャットルーム一覧の取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async () => {
    try {
      if (!user) return;
      
      // 正しいナビゲーションパスを使用
      const result = await router.push('/chat-room-form');
      console.log('Create room result:', result);
    } catch (error) {
      console.error('Error navigating to create room:', error);
      Alert.alert('エラー', 'チャットルーム作成画面に移動できませんでした。');
    }
  };

  const handleOpenRoom = (roomId: string) => {
    router.push({
      pathname: '/chat-room',
      params: { id: roomId }
    });
  };

  const renderChatRoomItem = ({ item, index }: { item: ChatRoom, index: number }) => (
    <Animated.View 
      entering={SlideInRight.delay(index * 100).springify().damping(15)}
    >
      <RippleButton
        onPress={() => handleOpenRoom(item.id)}
        rippleColor={colors.ripple} 
        style={styles.chatRoomItem}
      >
        <View style={styles.chatRoomContent}>
          <Text style={styles.chatRoomTitle}>{item.title}</Text>
          <View style={styles.topicContainer}>
            <Text style={[styles.chatRoomTopic, { backgroundColor: colors.primaryLight, color: colors.textInverse }]}>
              {item.topic}
            </Text>
          </View>
          <Text style={styles.date}>
            {!item.updatedAt ? '日付なし' 
              : new Date(item.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
      </RippleButton>
    </Animated.View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Animated.View 
          style={styles.header}
          entering={FadeIn.delay(200).duration(500)}
        >
          <Text style={[styles.title, { color: colors.text }]}>AIレッスン</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            AIと対話して練習メニューを作成しましょう
          </Text>
        </Animated.View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
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
              />
            ) : (
              <Animated.View 
                style={styles.emptyState}
                entering={FadeIn.delay(300).duration(500)}
              >
                <Ionicons name="chatbubbles-outline" size={80} color={colors.borderLight} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  チャットルームがありません
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
                  「+」ボタンをタップして新しいチャットを始めましょう
                </Text>
              </Animated.View>
            )}
          </>
        )}

        <RippleButton
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={handleCreateRoom}
          rippleColor={colors.ripple}
        >
          <MaterialIcons name="add" size={28} color={colors.textInverse} />
        </RippleButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#1C1C1E',
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
});