import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTaskStore } from './store/tasks';
import { getChatRoom } from './services/chatRoomService';
import { useAuth } from './services/auth';
import TaskDetailHeader from './features/tasks/components/TaskDetailHeader';
import TaskDetailContent from './features/tasks/components/TaskDetailContent';

export default function TaskDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { tasks, updateTask } = useTaskStore();
  const task = tasks.find((t) => t.id === id);
  const [loading, setLoading] = useState(false);
  const [chatRoomTitle, setChatRoomTitle] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (task?.attachments && task.attachments.length > 0) {
      const chatRoomAttachment = task.attachments.find(att => att.type === 'text' && att.url.startsWith('/chatRooms/'));
      
      if (chatRoomAttachment && user) {
        loadChatRoomInfo(chatRoomAttachment.url.split('/')[2]);
      }
    }
  }, [task, user]);

  const loadChatRoomInfo = async (chatRoomId: string) => {
    try {
      setLoading(true);
      const chatRoom = await getChatRoom(chatRoomId);
      if (chatRoom) {
        setChatRoomTitle(chatRoom.title);
      }
    } catch (error) {
      console.error('チャットルーム情報の取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = () => {
    if (task) {
      updateTask(task.id, { isCompleted: !task.isCompleted });
    }
  };

  const handleOpenChatRoom = () => {
    if (task?.attachments && task.attachments.length > 0) {
      const chatRoomAttachment = task.attachments.find(att => att.type === 'text' && att.url.startsWith('/chatRooms/'));
      
      if (chatRoomAttachment) {
        const chatRoomId = chatRoomAttachment.url.split('/')[2];
        router.push({
          pathname: '/chat-room',
          params: { id: chatRoomId }
        });
      }
    }
  };

  if (!task) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFoundText}>タスクが見つかりません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TaskDetailHeader
        title="タスク詳細"
        isCompleted={task.isCompleted}
        onBack={() => router.back()}
        onToggleComplete={handleToggleComplete}
      />

      <TaskDetailContent
        task={task}
        loading={loading}
        chatRoomTitle={chatRoomTitle}
        onOpenChatRoom={handleOpenChatRoom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  notFoundText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    color: '#8E8E93',
  },
});
