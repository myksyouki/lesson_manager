import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Text, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from '../store/tasks';
import { Task } from '../_ignore/types/_task';
import { getChatRoom } from '../services/chatRoomService';
import TaskDetailHeader from './features/tasks/components/TaskDetailHeader';
import TaskDetailContent from './features/tasks/components/TaskDetailContent';
import TaskCompletionSwipeButton from './features/tasks/components/TaskCompletionSwipeButton';
import TaskCompletionAnimation from './features/tasks/components/TaskCompletionAnimation';
import PracticeTools from './features/practice/components/PracticeTools';
import { MaterialIcons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { db } from '../config/firebase';
import SheetMusicViewer from './components/SheetMusicViewer';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, updateTask } = useTaskStore();
  const [isLoading, setIsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [streakCount, setStreakCount] = useState(0);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [chatRoom, setChatRoom] = useState<any>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [sheetMusicUrl, setSheetMusicUrl] = useState<string | null>(null);
  const router = useRouter();

  const task = tasks.find(t => t.id === id);

  useEffect(() => {
    if (task) {
      setIsLoading(false);

      // 楽譜データの取得 (メニューIDがあれば)
      if (task.practiceInfo?.menuId) {
        console.log('タスクのメニューID:', task.practiceInfo.menuId);
        fetchSheetMusicFromMenuId(task.practiceInfo.menuId);
      } else {
        console.log('このタスクにはメニューIDがありません');
      }

      // ストリークカウントの計算
      // Firestoreから取得するか、ローカルで計算するか決める
      // 仮のストリークカウント
      setStreakCount(3);
    }
  }, [task]);

  // 楽譜データの取得（メニューIDから）
  const fetchSheetMusicFromMenuId = async (menuId: string) => {
    try {
      console.log('メニューIDから楽譜を取得中:', menuId);
      
      // 1. メニューデータを取得
      const menuRef = doc(db, 'menus', menuId);
      const menuSnap = await getDoc(menuRef);
      
      if (!menuSnap.exists()) {
        console.log('メニューが存在しません:', menuId);
        return;
      }
      
      const menuData = menuSnap.data();
      console.log('メニューデータ:', menuData);
      
      // 2. 直接imageUrlがある場合はそれを使用
      if (menuData.imageUrl) {
        console.log('直接imageUrlから楽譜URL取得:', menuData.imageUrl);
        setSheetMusicUrl(menuData.imageUrl);
        return;
      }
      
      // 3. sheetMusicサブコレクションのドキュメントを確認
      try {
        const sheetMusicRef = doc(db, 'menus', menuId, 'sheetMusic', 'default');
        const sheetMusicSnap = await getDoc(sheetMusicRef);
        
        if (sheetMusicSnap.exists()) {
          const sheetMusicData = sheetMusicSnap.data();
          if (sheetMusicData.imageUrl) {
            console.log('sheetMusicサブコレクションから楽譜URL取得:', sheetMusicData.imageUrl);
            setSheetMusicUrl(sheetMusicData.imageUrl);
            return;
          }
        }
      } catch (subCollectionError) {
        console.log('sheetMusicサブコレクション取得エラー:', subCollectionError);
      }
      
      // 4. 従来の方法：sheetMusicPathからStorageのURLを取得
      const sheetMusicPath = menuData?.sheetMusicPath;
      
      if (!sheetMusicPath) {
        console.log('楽譜パスがありません');
        return;
      }
      
      console.log('楽譜パス:', sheetMusicPath);
      
      // 5. Storageから画像URLを取得
      const storage = getStorage();
      const sheetMusicRef = ref(storage, sheetMusicPath);
      
      console.log('Storageパス:', sheetMusicRef.fullPath);
      
      const url = await getDownloadURL(sheetMusicRef);
      console.log('取得した楽譜URL:', url);
      
      setSheetMusicUrl(url);
    } catch (error) {
      console.error('楽譜の取得エラー:', error);
      
      // エラーの詳細をログ出力
      if (error instanceof Error) {
        console.error('エラーメッセージ:', error.message);
        console.error('エラースタック:', error.stack);
      }
      
      setSheetMusicUrl(null);
    }
  };

  const loadChatRoom = async (chatRoomId: string) => {
    try {
      const chatRoomData = await getChatRoom(chatRoomId);
      setChatRoom(chatRoomData);
    } catch (error) {
      console.error('Failed to load chat room:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/tabs/task');
  };

  const handleToggleComplete = () => {
    if (task) {
      // タスクの完了状態を切り替え
      toggleTaskCompletion(task.id);
      
      // タスクが完了状態になった場合のみアニメーションを表示
      if (!task.completed) {
        // 完了回数とストリーク回数を更新
        const count = getTaskCompletionCount(task.title) + 1;
        const streak = getTaskStreakCount() + (task.completed ? 0 : 1);
        setCompletionCount(count);
        setStreakCount(streak);
        
        // 完了アニメーションを表示
        setShowCompletionAnimation(true);
      }
    }
  };

  const handleOpenChatRoom = () => {
    if (chatRoom) {
      router.push({
        pathname: '/chat-room' as any,
        params: { id: chatRoom.id }
      });
    }
  };

  const handleCloseAnimation = () => {
    setShowCompletionAnimation(false);
  };

  // 練習モードを開く処理
  const handleOpenPracticeMode = () => {
    if (sheetMusicUrl) {
      setIsPracticeMode(true);
      console.log('練習モードを開きます:', sheetMusicUrl);
    } else {
      console.log('楽譜データがないため練習モードを開けません');
    }
  };

  // 練習モードを閉じる処理
  const handleClosePracticeMode = () => {
    setIsPracticeMode(false);
    console.log('練習モードを閉じました');
  };

  // タスク完了状態を切り替える関数（仮実装）
  const toggleTaskCompletion = (taskId: string) => {
    if (task) {
      const updatedTask = { ...task, completed: !task.completed };
      updateTask(updatedTask);
    }
  };

  // タスク完了回数を取得する関数（仮実装）
  const getTaskCompletionCount = (taskTitle: string) => {
    // 実際はFirestoreから過去の履歴を取得するべき
    return completionCount;
  };

  // タスクストリーク回数を取得する関数（仮実装）
  const getTaskStreakCount = () => {
    // 実際はFirestoreから過去の履歴を取得するべき
    return streakCount;
  };

  if (!task) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // タスクからカテゴリを取得（タグの最初の要素をカテゴリとして使用）
  const category = task.tags && task.tags.length > 0 ? task.tags[0] : undefined;

  return (
    <View style={styles.container}>
      <TaskDetailHeader
        title={task.title}
        isCompleted={task.completed || false}
        taskId={task.id}
        isPinned={task.isPinned || false}
        onBack={handleBack}
      />
      
      <ScrollView style={styles.contentContainer}>
        <TaskDetailContent
          task={task}
          loading={loading}
          chatRoomTitle={chatRoom?.title || null}
          onOpenChatRoom={handleOpenChatRoom}
        />
        
        {/* 楽譜の表示 */}
        <SheetMusicViewer url={sheetMusicUrl} />
        
        {/* 練習モードボタン */}
        {sheetMusicUrl && (
          <TouchableOpacity
            style={styles.practiceButton}
            onPress={handleOpenPracticeMode}
          >
            <MaterialIcons name="music-note" size={24} color="#FFFFFF" />
            <Text style={styles.practiceButtonText}>練習モード</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* 練習モードの表示 */}
      {isPracticeMode && sheetMusicUrl && (
        <View style={styles.practiceModeFull}>
          <PracticeTools 
            isVisible={true} 
            sheetMusicUrl={sheetMusicUrl} 
            onClose={handleClosePracticeMode}
          />
        </View>
      )}
      
      <View style={styles.swipeButtonContainer}>
        <TaskCompletionSwipeButton
          onComplete={handleToggleComplete}
          isCompleted={task.completed || false}
          category={category}
        />
      </View>
      
      <TaskCompletionAnimation
        visible={showCompletionAnimation}
        onClose={handleCloseAnimation}
        taskTitle={task.title}
        category={category}
        completionCount={completionCount}
        streakCount={streakCount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  swipeButtonContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  practiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 80, // スワイプボタンのスペースを確保
    backgroundColor: '#2196F3',
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  practiceButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  practiceModeFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    zIndex: 9999,
  },
  sheetMusicContainer: {
    marginVertical: 10,
  },
  sheetMusic: {
    width: '100%',
    height: 300,
    marginVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
