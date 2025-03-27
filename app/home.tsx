import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import TaskList from './features/tasks/components/TaskList';
import ProgressCarousel from './features/tasks/components/ProgressCarousel';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { getUserChatRooms, ChatRoom, createChatRoom } from './services/chatRoomService';
import { useRouter } from 'expo-router';

// カテゴリサマリーの型定義
interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

export default function Home() {
  const { user } = useAuthStore();
  const { tasks, isLoading, error, fetchTasks } = useTaskStore();
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [chatRoomsLoading, setChatRoomsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    console.log('ホーム画面: useEffect実行', !!user);
    if (user) {
      fetchTasks(user.uid);
      loadChatRooms();
    }
  }, [user]);

  useEffect(() => {
    // タスクの集計
    let completed = 0;
    tasks.forEach(task => {
      if (task.completed) {
        completed++;
      }
    });
    setTotalCompleted(completed);
    setTotalTasks(tasks.length);

    // カテゴリの集計
    const categoryMap: Record<string, CategorySummary> = {};
    tasks.forEach(task => {
      const categoryName = task.tags && task.tags.length > 0 ? task.tags[0] : 'その他';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          completedCount: 0,
          totalCount: 0,
          icon: getCategoryIcon(categoryName),
          color: getCategoryColor(categoryName)
        };
      }
      
      categoryMap[categoryName].totalCount++;
      if (task.completed) {
        categoryMap[categoryName].completedCount++;
      }
    });
    
    const categoryList = Object.values(categoryMap);
    setCategories(categoryList);
  }, [tasks]);

  // チャットルームを読み込む関数
  const loadChatRooms = async () => {
    if (!user) return;
    
    try {
      console.log('🔍 ホーム画面: チャットルーム取得開始', user.uid);
      setChatRoomsLoading(true);
      const rooms = await getUserChatRooms(user.uid);
      console.log('✅ ホーム画面: チャットルーム取得完了', rooms.length);
      
      // チャットルームデータの詳細を確認
      if (rooms.length > 0) {
        console.log('🔎 ホーム画面: 最初のチャットルーム詳細:', {
          id: rooms[0].id,
          title: rooms[0].title,
          topic: rooms[0].topic,
          hasMessages: Array.isArray(rooms[0].messages) && rooms[0].messages.length > 0
        });
      } else {
        console.log('⚠️ ホーム画面: チャットルームが0件です');
        
        // 新しいチャットルームを作成するテスト（オプション）
        if (false) { // 実行したい場合は true に変更
          try {
            console.log('🔧 テスト: チャットルーム作成開始');
            const newRoom = await createChatRoom(
              'テストチャットルーム',
              'テストトピック',
              'こんにちは、AIアシスタント',
              'standard'
            );
            console.log('✅ テスト: チャットルーム作成完了', newRoom.id);
            
            // 再度チャットルーム一覧を取得
            const currentUser = user;
            if (currentUser) {
              const updatedRooms = await getUserChatRooms(currentUser.uid);
              console.log('🔄 テスト: 更新後のチャットルーム数', updatedRooms.length);
              setChatRooms(updatedRooms);
            }
            return;
          } catch (testError) {
            console.error('❌ テスト: チャットルーム作成エラー', testError);
          }
        }
      }
      
      setChatRooms(rooms);
    } catch (error) {
      console.error('❌ ホーム画面でのチャットルーム取得エラー:', error);
    } finally {
      setChatRoomsLoading(false);
    }
  };

  // チャットルームを開く関数
  const handleOpenChatRoom = (roomId: string) => {
    router.push({
      pathname: '/chat-room' as any,
      params: { id: roomId }
    });
  };

  // カテゴリに基づいてアイコンを決定
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return <MaterialCommunityIcons name="lungs" size={24} color="#3F51B5" />;
      case '音階':
        return <MaterialCommunityIcons name="scale" size={24} color="#FF9800" />;
      case '曲練習':
        return <Ionicons name="musical-note" size={24} color="#E91E63" />;
      case 'アンサンブル':
        return <Ionicons name="people" size={24} color="#9C27B0" />;
      case 'リズム':
        return <FontAwesome5 name="drum" size={24} color="#FFC107" />;
      default:
        return <Ionicons name="musical-notes" size={24} color="#4CAF50" />;
    }
  };

  // カテゴリに基づいて色を決定
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return '#3F51B5';
      case '音階':
        return '#FF9800';
      case '曲練習':
        return '#E91E63';
      case 'アンサンブル':
        return '#9C27B0';
      case 'リズム':
        return '#FFC107';
      default:
        return '#4CAF50';
    }
  };

  const handleToggleComplete = (taskId: string) => {
    // タスクの完了状態を切り替えた後、アニメーション表示のためにIDを保存
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setRecentlyCompletedTaskId(taskId);
      
      // 3秒後にリセット
      setTimeout(() => {
        setRecentlyCompletedTaskId(null);
      }, 3000);
    }
  };

  // リフレッシュ機能の追加
  const onRefresh = async () => {
    console.log('ホーム画面: 手動リフレッシュ');
    setRefreshing(true);
    if (user) {
      fetchTasks(user.uid);
      await loadChatRooms();
    }
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>タスク一覧</Text>
      </View>
      
      <View style={styles.carouselContainer}>
        <ProgressCarousel 
          categories={categories}
          totalCompleted={totalCompleted}
          totalTasks={totalTasks}
          themeColor="#4CAF50"
        />
      </View>
      
      <View style={styles.taskListContainer}>
        <ScrollView 
          style={styles.content}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#4CAF50']}
              tintColor={'#4CAF50'}
            />
          }
        >
          {/* 最近のチャットルーム */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>最近のチャットルーム</Text>
            {chatRoomsLoading ? (
              <Text style={styles.loadingText}>読み込み中...</Text>
            ) : chatRooms.length === 0 ? (
              <Text style={styles.emptyText}>チャットルームがありません</Text>
            ) : (
              <View style={styles.chatRoomList}>
                {chatRooms.slice(0, 3).map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={styles.chatRoomItem}
                    onPress={() => handleOpenChatRoom(room.id)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={24} color="#5B7CF6" style={styles.chatIcon} />
                    <View style={styles.chatRoomInfo}>
                      <Text style={styles.chatRoomTitle} numberOfLines={1}>{room.title || 'タイトルなし'}</Text>
                      <Text style={styles.chatRoomTopic} numberOfLines={1}>{room.topic || 'トピックなし'}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#999" />
                  </TouchableOpacity>
                ))}
                {chatRooms.length > 3 && (
                  <TouchableOpacity
                    style={styles.viewMoreButton}
                    onPress={() => router.push('/tabs/ai-lesson')}
                  >
                    <Text style={styles.viewMoreText}>すべて表示</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <TaskList 
            tasks={tasks} 
            isLoading={isLoading} 
            error={error}
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  carouselContainer: {
    zIndex: 10,
  },
  taskListContainer: {
    flex: 1,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  section: {
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333333',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginVertical: 12,
    fontStyle: 'italic',
  },
  chatRoomList: {
    marginBottom: 8,
  },
  chatRoomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  chatIcon: {
    marginRight: 12,
  },
  chatRoomInfo: {
    flex: 1,
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
  },
  chatRoomTopic: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  viewMoreButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  viewMoreText: {
    color: '#5B7CF6',
    fontWeight: '500',
  },
}); 