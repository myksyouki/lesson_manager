import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from './store/tasks';
import { Task } from './types/task';
import { getChatRoom } from './services/chatRoomService';
import TaskDetailHeader from './features/tasks/components/TaskDetailHeader';
import TaskDetailContent from './features/tasks/components/TaskDetailContent';
import TaskCompletionSwipeButton from './features/tasks/components/TaskCompletionSwipeButton';
import TaskCompletionAnimation from './features/tasks/components/TaskCompletionAnimation';

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

  useEffect(() => {
    if (id) {
      const foundTask = tasks.find(t => t.id === id);
      if (foundTask) {
        setTask(foundTask);
        
        // タスクの完了回数とストリーク回数を取得
        const count = getTaskCompletionCount(foundTask.title);
        const streak = getTaskStreakCount();
        setCompletionCount(count);
        setStreakCount(streak);
        
        // チャットルーム情報を取得（AIレッスンの場合）
        if (foundTask.attachments && foundTask.attachments.length > 0) {
          const chatRoomAttachment = foundTask.attachments.find(
            att => att.type === 'text' && att.url.startsWith('/chatRooms/')
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
    router.back();
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
      router.push(`/chat-room?id=${chatRoom.id}`);
    }
  };

  const handleCloseAnimation = () => {
    setShowCompletionAnimation(false);
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
        onBack={handleBack}
        onToggleComplete={handleToggleComplete}
      />
      
      <TaskDetailContent
        task={task}
        loading={loading}
        chatRoomTitle={chatRoom?.title || null}
        onOpenChatRoom={handleOpenChatRoom}
      />
      
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
});
