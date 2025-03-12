import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { getUserChatRooms, ChatRoom } from '../services/chatRoomService';
import { FAB } from 'react-native-paper';

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

  const handleCreateRoom = () => {
    router.push('/chat-room-form');
  };

  const handleOpenRoom = (roomId: string) => {
    router.push({
      pathname: '/chat-room',
      params: { id: roomId }
    });
  };

  const renderChatRoomItem = ({ item }: { item: ChatRoom }) => (
    <TouchableOpacity
      style={styles.chatRoomItem}
      onPress={() => handleOpenRoom(item.id)}
    >
      <View style={styles.chatRoomContent}>
        <Text style={styles.chatRoomTitle}>{item.title}</Text>
        <Text style={styles.chatRoomTopic}>{item.topic}</Text>
        <Text style={styles.chatRoomDate}>
          {item.updatedAt instanceof Date 
            ? item.updatedAt.toLocaleDateString('ja-JP') 
            : new Date(item.updatedAt.seconds * 1000).toLocaleDateString('ja-JP')}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AIレッスン</Text>
          <Text style={styles.subtitle}>
            AIと対話して練習メニューを作成しましょう
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        ) : (
          <>
            {chatRooms.length > 0 ? (
              <FlatList
                data={chatRooms}
                renderItem={renderChatRoomItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.chatRoomsList}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={64} color="#d1d1d6" />
                <Text style={styles.emptyText}>
                  チャットルームがありません
                </Text>
                <Text style={styles.emptySubtext}>
                  「+」ボタンをタップして新しいチャットを始めましょう
                </Text>
              </View>
            )}
          </>
        )}

        <FAB
          style={styles.fab}
          icon="plus"
          onPress={handleCreateRoom}
          color="#ffffff"
        />
      </View>
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
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 8,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chatRoomContent: {
    flex: 1,
  },
  chatRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  chatRoomTopic: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  chatRoomDate: {
    fontSize: 12,
    color: '#C7C7CC',
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
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
  },
});