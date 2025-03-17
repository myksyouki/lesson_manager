import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../store/tasks';
import TaskHeader from '../features/tasks/components/list/TaskHeader';
import TaskList from '../features/tasks/components/list/TaskList';
import TaskActionButton from '../features/tasks/components/list/TaskActionButton';
import CategorySummary from '../features/tasks/components/CategorySummary';
import TaskCompletionPopup from '../features/tasks/components/TaskCompletionPopup';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../config/firebase';

export default function TaskScreen() {
  const { tasks, fetchTasks, completeTask } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  
  // タスク完了ポップアップの状態
  const [completionPopup, setCompletionPopup] = useState({
    visible: false,
    taskTitle: '',
    category: '',
    completionCount: 0
  });

  // 初回レンダリング時にタスクを取得
  useEffect(() => {
    const loadInitialTasks = async () => {
      if (tasks.length === 0) {
        setRefreshing(true);
        try {
          const userId = auth.currentUser?.uid || 'guest-user';
          await fetchTasks(userId);
        } catch (error) {
          console.error('初期タスク取得エラー:', error);
        } finally {
          setRefreshing(false);
        }
      }
    };
    
    loadInitialTasks();
  }, []);

  // 画面がフォーカスされたときにタスクを再取得
  useFocusEffect(
    useCallback(() => {
      const refreshTasksOnFocus = async () => {
        try {
          const userId = auth.currentUser?.uid || 'guest-user';
          await fetchTasks(userId);
        } catch (error) {
          console.error('タスク更新エラー:', error);
        }
      };
      
      refreshTasksOnFocus();
      
      return () => {
        // クリーンアップ関数（必要に応じて）
      };
    }, [fetchTasks])
  );

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.isCompleted;
    if (filter === 'pending') return !task.isCompleted;
    return true;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userId = auth.currentUser?.uid || 'guest-user';
      await fetchTasks(userId);
    } catch (error) {
      console.error('タスク更新エラー:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  // タスク完了時の処理
  const handleTaskComplete = async (taskId: string) => {
    try {
      const result = await completeTask(taskId);
      
      // 完了ポップアップを表示
      setCompletionPopup({
        visible: true,
        taskTitle: result.taskTitle,
        category: result.category,
        completionCount: result.completionCount
      });
    } catch (error) {
      console.error('タスク完了エラー:', error);
    }
  };
  
  // ポップアップを閉じる処理
  const closeCompletionPopup = () => {
    setCompletionPopup(prev => ({ ...prev, visible: false }));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <TaskHeader 
        currentFilter={filter} 
        onFilterChange={setFilter} 
      />
      
      <CategorySummary tasks={tasks} />
      
      <TaskList 
        tasks={filteredTasks}
        refreshing={refreshing}
        onRefresh={onRefresh}
        onTaskComplete={handleTaskComplete}
      />

      <TaskActionButton />
      
      <TaskCompletionPopup
        visible={completionPopup.visible}
        taskTitle={completionPopup.taskTitle}
        category={completionPopup.category}
        completionCount={completionPopup.completionCount}
        onClose={closeCompletionPopup}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    position: 'relative',
    overflow: 'hidden',
  },
});
