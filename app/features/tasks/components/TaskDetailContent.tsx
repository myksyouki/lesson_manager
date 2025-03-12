import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Task } from '../../../types/task';
import AIPracticeInfo from './AIPracticeInfo';

interface TaskDetailContentProps {
  task: Task;
  loading: boolean;
  chatRoomTitle: string | null;
  onOpenChatRoom: () => void;
}

export const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  loading,
  chatRoomTitle,
  onOpenChatRoom,
}) => {
  const isAIPracticeMenu = task.attachments?.some(att => att.type === 'text' && att.url.startsWith('/chatRooms/'));

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.content}>
        <Text style={styles.title}>{task.title}</Text>
        
        {task.dueDate ? (
          <Text style={styles.dueDate}>期日: {task.dueDate}</Text>
        ) : null}
        
        {isAIPracticeMenu && (
          <AIPracticeInfo
            loading={loading}
            chatRoomTitle={chatRoomTitle}
            onOpenChatRoom={onOpenChatRoom}
          />
        )}
        
        <Text style={styles.descriptionTitle}>練習内容:</Text>
        <Text style={styles.description}>{task.description}</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dueDate: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  descriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#3A3A3C',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskDetailContent;
