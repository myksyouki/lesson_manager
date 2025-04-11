import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Platform, ScrollView, TouchableOpacity, Text } from 'react-native';
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

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { tasks, toggleTaskCompletion, getTaskCompletionCount, getTaskStreakCount } = useTaskStore();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatRoom, setChatRoom] = useState<any | null>(null);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [completionCount, setCompletionCount] = useState(0);
  const [streakCount, setStreakCount] = useState(0);
  const [sheetMusicUrl, setSheetMusicUrl] = useState<string | null>(null);
  const [isPracticeMode, setIsPracticeMode] = useState(false);

  useEffect(() => {
    if (id) {
      const foundTask = tasks.find(t => t.id === id);
      if (foundTask) {
        setTask(foundTask);
        
        // 楽譜データを取得
        const sheetMusic = foundTask.attachments?.find(
          (att: any) => att.type === 'image' && att.format === 'image/jpeg'
        );
        if (sheetMusic) {
          setSheetMusicUrl(sheetMusic.url);
          console.log('シートミュージックURL設定:', sheetMusic.url);
        } else {
          console.log('シートミュージックデータが見つかりません:', foundTask.attachments);
        }
        
        // タスクの完了回数とストリーク回数を取得
        const count = getTaskCompletionCount(foundTask.title);
        const streak = getTaskStreakCount();
        setCompletionCount(count);
        setStreakCount(streak);
        
        // チャットルーム情報を取得（AIレッスンの場合）
        if (foundTask.attachments && foundTask.attachments.length > 0) {
          const chatRoomAttachment = foundTask.attachments.find(
            (att: {type: string; url: string}) => att.type === 'text' && att.url.startsWith('/chatRooms/')
          );
          
          if (chatRoomAttachment) {
            const chatRoomId = chatRoomAttachment.url.split('/').pop();
            if (chatRoomId) {
              loadChatRoom(chatRoomId);
            } else {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      }
    }
  }, [id, tasks]);

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
});
