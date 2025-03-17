import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Task } from '../../../types/task';
import TaskCard from './TaskCard';
import { useTaskStore } from '../../../store/tasks';
import { Ionicons } from '@expo/vector-icons';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  error?: string | null;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading = false, error = null }) => {
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  const { toggleTaskCompletion } = useTaskStore();

  useEffect(() => {
    // タスクを完了済みと未完了に分類
    const completed: Task[] = [];
    const incomplete: Task[] = [];
    
    tasks.forEach(task => {
      if (task.completed) {
        completed.push(task);
      } else {
        incomplete.push(task);
      }
    });
    
    setCompletedTasks(completed);
    setIncompleteTasks(incomplete);
  }, [tasks]);

  const handleToggleComplete = (taskId: string) => {
    toggleTaskCompletion(taskId);
    
    // 完了したタスクのIDを保存して、アニメーションを表示
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setRecentlyCompletedTaskId(taskId);
      
      // 3秒後にリセット
      setTimeout(() => {
        setRecentlyCompletedTaskId(null);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>エラーが発生しました: {error}</Text>
      </View>
    );
  }

  if (tasks.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="checkmark-done-circle-outline" size={64} color="#CCCCCC" />
        <Text style={styles.emptyText}>タスクがありません</Text>
        <Text style={styles.emptySubText}>新しいタスクを追加してみましょう</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'incomplete' && styles.activeTab
          ]}
          onPress={() => setActiveTab('incomplete')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'incomplete' && styles.activeTabText
          ]}>
            未完了 ({incompleteTasks.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'completed' && styles.activeTab
          ]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'completed' && styles.activeTabText
          ]}>
            完了済み ({completedTasks.length})
          </Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={activeTab === 'incomplete' ? incompleteTasks : completedTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard 
            task={item} 
            onToggleComplete={handleToggleComplete}
            showAnimation={item.id === recentlyCompletedTaskId}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#E8F5E9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#757575',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginTop: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#757575',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default TaskList; 