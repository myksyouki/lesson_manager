import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTaskStore } from '../../../../store/tasks';

interface TaskDetailHeaderProps {
  title: string;
  isCompleted: boolean;
  taskId: string;
  isPinned: boolean;
  onBack: () => void;
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  title,
  isCompleted,
  taskId,
  isPinned,
  onBack,
}) => {
  const { togglePin, canPinMoreTasks } = useTaskStore();

  const handleTogglePin = async () => {
    if (isPinned) {
      const result = await togglePin(taskId);
      if (!result) {
        Alert.alert('エラー', 'ピン留めの解除に失敗しました。');
      }
    } else {
      if (!canPinMoreTasks() && !isPinned) {
        Alert.alert(
          'ピン留め上限',
          'ピン留めできるタスクは最大3つまでです。他のタスクのピン留めを解除してから再試行してください。'
        );
        return;
      }
      
      const result = await togglePin(taskId);
      if (!result) {
        Alert.alert('エラー', 'タスクのピン留めに失敗しました。');
      }
    }
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={onBack}
      >
        <Ionicons name="chevron-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.rightButtons}>
        <TouchableOpacity
          style={styles.pinButton}
          onPress={handleTogglePin}
        >
          <MaterialIcons 
            name="push-pin" 
            size={24} 
            color={isPinned ? "#FFD700" : "#8E8E93"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinButton: {
    padding: 8,
    marginRight: 8,
  },
});

export default TaskDetailHeader;
