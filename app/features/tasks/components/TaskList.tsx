import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Task } from '../../../types/task';
import TaskCard from './TaskCard';
import { useTaskStore } from '../../../store/tasks';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { auth } from '../../../config/firebase';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';

interface TaskListProps {
  tasks: Task[];
  isLoading?: boolean;
  error?: string | null;
  themeColor?: string;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, isLoading = false, error = null, themeColor = '#4CAF50' }) => {
  const [activeTab, setActiveTab] = useState<'incomplete' | 'completed'>('incomplete');
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [incompleteTasks, setIncompleteTasks] = useState<Task[]>([]);
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toggleTaskCompletion, fetchTasks } = useTaskStore();

  useEffect(() => {
    // タスクを完了済みと未完了に分類し、ピン留め状態でソート
    const completed: Task[] = [];
    const incomplete: Task[] = [];
    
    tasks.forEach(task => {
      if (task.completed) {
        completed.push(task);
      } else {
        incomplete.push(task);
      }
    });
    
    // ピン留めされたタスクを上位に表示するためにソート
    const sortByPin = (a: Task, b: Task) => {
      // まずピン留め状態で比較
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // ピン留め状態が同じ場合は更新日時の新しい順
      const getTimestamp = (task: Task) => {
        if (!task.updatedAt) return 0;
        
        // Firestore Timestamp型の場合
        if (typeof task.updatedAt === 'object' && 'seconds' in task.updatedAt) {
          return task.updatedAt.seconds * 1000;
        }
        
        // Date型の場合
        if (task.updatedAt instanceof Date) {
          return task.updatedAt.getTime();
        }
        
        // 文字列の場合
        return new Date(String(task.updatedAt)).getTime();
      };
      
      return getTimestamp(b) - getTimestamp(a);
    };
    
    setCompletedTasks(completed.sort(sortByPin));
    setIncompleteTasks(incomplete.sort(sortByPin));
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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userId = auth.currentUser?.uid || 'guest-user';
      await fetchTasks(userId);
      console.log('タスク一覧を更新しました');
    } catch (error) {
      console.error('タスク更新エラー:', error);
    } finally {
      setRefreshing(false);
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
        <View style={styles.emptyIconContainer}>
          <Ionicons name="checkmark-done-circle-outline" size={100} color="#CCCCCC" style={styles.emptyIcon} />
          <View style={styles.iconBubble}>
            <MaterialIcons name="check" size={24} color="#FFFFFF" />
          </View>
        </View>
        
        <Text style={styles.emptyText}>タスクがありません</Text>
        
        <Text style={styles.emptySubText}>
          新しいタスクを追加して{'\n'}練習を記録しましょう
        </Text>
        
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push({ pathname: '/task-form?mode=practiceMenu' as any })}
        >
          <Text style={styles.createButtonText}>
            練習メニューを作成
          </Text>
          <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" style={styles.buttonIcon} />
        </TouchableOpacity>
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
      
      <DraggableFlatList
        data={activeTab === 'incomplete' ? incompleteTasks : completedTasks}
        keyExtractor={(item) => item.id}
        onDragEnd={({ data }) => {
          if (activeTab === 'incomplete') {
            setIncompleteTasks(data);
          } else {
            setCompletedTasks(data);
          }
        }}
        renderItem={({ item, drag, isActive }: RenderItemParams<Task>) => (
          <ScaleDecorator>
            <TouchableOpacity 
              activeOpacity={1}
              onLongPress={drag}
              disabled={isActive}
              style={styles.taskCardContainer}
            >
              <TaskCard 
                task={item} 
                onToggleComplete={handleToggleComplete}
                showAnimation={item.id === recentlyCompletedTaskId}
                disableSwipe={isActive}
                onDelete={(deletedTaskId) => {
                  // 削除後のリストを更新
                  if (activeTab === 'incomplete') {
                    setIncompleteTasks(incompleteTasks.filter(task => task.id !== deletedTaskId));
                  } else {
                    setCompletedTasks(completedTasks.filter(task => task.id !== deletedTaskId));
                  }
                }}
              />
            </TouchableOpacity>
          </ScaleDecorator>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[themeColor]}
            tintColor={themeColor}
            title="更新中..."
            titleColor={themeColor}
          />
        }
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
    paddingHorizontal: 12,
    paddingBottom: 20,
    paddingTop: 8,
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
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    position: 'relative',
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: {
    opacity: 0.7,
  },
  iconBubble: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#5F6368',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9AA0A6',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonIcon: {
    marginLeft: 8,
  },
  taskCardContainer: {
    marginBottom: 8,
  },
});

export default TaskList; 