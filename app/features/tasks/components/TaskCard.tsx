import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Task } from '../../../types/task';

interface TaskCardProps {
  task: Task;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const handlePress = () => {
    router.push({
      pathname: '/task-detail',
      params: { id: task.id },
    });
  };

  // AIから生成された練習メニューかどうかを判定
  const isAIPracticeMenu = task.attachments?.some(att => att.type === 'text' && att.url.startsWith('/chatRooms/'));

  return (
    <TouchableOpacity 
      style={[styles.taskCard, isAIPracticeMenu && styles.aiTaskCard]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {isAIPracticeMenu && (
        <View style={styles.aiIndicator}>
          <Ionicons name="musical-notes-outline" size={16} color="#007AFF" />
          <Text style={styles.aiIndicatorText}>AI練習メニュー</Text>
        </View>
      )}
      <View style={styles.cardHeader}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <MaterialIcons 
          name={task.isCompleted ? "check-circle" : "radio-button-unchecked"} 
          size={24} 
          color={task.isCompleted ? "#34C759" : "#8E8E93"} 
        />
      </View>
      <Text style={styles.taskDescription} numberOfLines={2} ellipsizeMode="tail">
        {task.description}
      </Text>
      {task.dueDate && (
        <Text style={styles.taskDueDate}>期日: {task.dueDate}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  aiTaskCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    backgroundColor: '#FAFCFF',
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiIndicatorText: {
    fontSize: 12,
    color: '#007AFF',
    marginLeft: 4,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskDescription: {
    fontSize: 15,
    color: '#636366',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskDueDate: {
    fontSize: 13,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskCard;
