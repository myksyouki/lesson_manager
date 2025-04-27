import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Text, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from '../store/tasks';
import { Task } from '../types/_task';
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

      // 楽譜URL取得プロセスをシンプル化
      fetchSheetMusicUrl(task);

      // チャットルームIDがあれば、チャットルーム情報を取得
      if (task.chatRoomId) {
        loadChatRoom(task.chatRoomId);
      }

      // ストリークカウントの計算
      setStreakCount(3);
    }
  }, [task]);

  // 楽譜URL取得を一元化した関数
  const fetchSheetMusicUrl = async (task: Task) => {
    try {
      // 1. まず添付ファイルから楽譜URLを探す（最も直接的な方法）
      const sheetMusicAttachment = task.attachments?.find(
        attachment => attachment.type === 'image' && attachment.format === 'image/jpeg'
      );
      
      if (sheetMusicAttachment?.url) {
        console.log('添付ファイルから楽譜URLを取得:', sheetMusicAttachment.url);
        setSheetMusicUrl(sheetMusicAttachment.url);
        return;
      }
      
      // 2. 添付ファイルになければ、メニューIDから取得を試みる
      if (task.practiceInfo?.menuId) {
        console.log('メニューIDから楽譜を取得:', task.practiceInfo.menuId);
        await fetchSheetMusicFromMenuId(task.practiceInfo.menuId);
      } else {
        console.log('このタスクには楽譜データがありません');
        setSheetMusicUrl(null);
      }
    } catch (error) {
      console.error('楽譜URL取得エラー:', error);
      setSheetMusicUrl(null);
    }
  };

  // メニューIDから楽譜を取得する関数（シンプル化）
  const fetchSheetMusicFromMenuId = async (menuId: string) => {
    try {
      console.log('メニューIDから楽譜を取得:', menuId);
      
      // メニューIDを正規化 (menu_A_major_... 形式を確認)
      const normalizedMenuId = menuId.startsWith('menu_') ? menuId : `menu_${menuId}`;
      
      // 1. まず直接のパスでsheetMusicサブコレクションを取得
      // practiceMenus/saxophone/categories/音階/menus/{menuId}/sheetMusic/default
      const sheetMusicRef = doc(db, 'practiceMenus/saxophone/categories/音階/menus', normalizedMenuId, 'sheetMusic', 'default');
      
      try {
        const sheetMusicSnap = await getDoc(sheetMusicRef);
        
        if (sheetMusicSnap.exists()) {
          const sheetMusicData = sheetMusicSnap.data();
          if (sheetMusicData.imageUrl) {
            console.log('楽譜データを取得成功:', sheetMusicData.imageUrl);
            setSheetMusicUrl(sheetMusicData.imageUrl);
            return;
          }
        } else {
          console.log('sheetMusic/defaultドキュメントが見つかりません');
        }
      } catch (error) {
        console.log('sheetMusic/defaultの取得に失敗:', error);
      }
      
      // 2. メニュードキュメント自体を取得して、imageUrlフィールドがあるか確認
      const menuRef = doc(db, 'practiceMenus/saxophone/categories/音階/menus', normalizedMenuId);
      try {
        const menuSnap = await getDoc(menuRef);
        
        if (menuSnap.exists()) {
          const menuData = menuSnap.data();
          console.log('メニューデータ:', menuData);
          
          if (menuData.imageUrl) {
            console.log('メニューから直接imageUrlを取得:', menuData.imageUrl);
            setSheetMusicUrl(menuData.imageUrl);
            return;
          }
        } else {
          console.log('メニュードキュメントが見つかりません');
        }
      } catch (error) {
        console.log('メニュードキュメントの取得に失敗:', error);
      }
      
      // 3. 他のカテゴリも試す
      const categories = ['練習曲', 'エチュード', 'スタッカート', 'スラー']; 
      
      for (const category of categories) {
        try {
          const categorySheetMusicRef = doc(
            db, 
            `practiceMenus/saxophone/categories/${category}/menus`, 
            normalizedMenuId, 
            'sheetMusic', 
            'default'
          );
          
          const sheetMusicSnap = await getDoc(categorySheetMusicRef);
          
          if (sheetMusicSnap.exists()) {
            const sheetMusicData = sheetMusicSnap.data();
            if (sheetMusicData.imageUrl) {
              console.log(`${category}カテゴリから楽譜URL取得:`, sheetMusicData.imageUrl);
              setSheetMusicUrl(sheetMusicData.imageUrl);
              return;
            }
          }
        } catch (error) {
          console.log(`${category}カテゴリからの取得に失敗:`, error);
        }
      }
      
      // 4. Firebaseストレージから直接取得を試みる
      try {
        const storage = getStorage();
        const directStoragePath = `sheetMusic/${menuId}`;
        const directRef = ref(storage, directStoragePath);
        const directUrl = await getDownloadURL(directRef);
        
        console.log('ストレージから楽譜URL取得:', directUrl);
        setSheetMusicUrl(directUrl);
        return;
      } catch (storageError) {
        console.log('ストレージからの取得に失敗:', storageError);
      }
      
      // すべての方法で失敗した場合
      console.log('楽譜データが見つかりません:', menuId);
      setSheetMusicUrl(null);
    } catch (error) {
      console.error('楽譜の取得エラー:', error);
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
      updateTask(task.id, { completed: !task.completed });
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
          sheetMusicUrl={sheetMusicUrl} // 楽譜URLを明示的に渡す
        />
        
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
            isPracticeMode={true}
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
