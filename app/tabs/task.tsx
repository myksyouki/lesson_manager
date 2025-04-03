import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../../store/tasks';
import TaskHeader from '../features/tasks/components/list/TaskHeader';
import TaskList from '../features/tasks/components/TaskList';
import TaskCategorySummaryMini from '../features/tasks/components/TaskCategorySummaryMini';
import TaskCompletionAnimation from '../features/tasks/components/TaskCompletionAnimation';
import { useFocusEffect } from '@react-navigation/native';
import { auth } from '../../config/firebase';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

// タスクタブのテーマカラー
const TASK_THEME_COLOR = '#4CAF50';

// カテゴリサマリーの型定義
interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

export default function TaskScreen() {
  const { tasks, fetchTasks, toggleTaskCompletion, getTaskCompletionCount, getTaskStreakCount } = useTaskStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  
  // パラメータを取得（トップレベルに移動）
  const params = useLocalSearchParams();
  
  // タスク完了ポップアップの状態
  const [completionPopup, setCompletionPopup] = useState({
    visible: false,
    taskTitle: '',
    category: '',
    completionCount: 0,
    streakCount: 0
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
          // トップレベルで取得したパラメータを使用
          const isNewlyCreated = params.isNewlyCreated === 'true';
          
          if (isNewlyCreated) {
            console.log('タスクタブ: 新規作成されたタスクがあるため再取得します');
            const userId = auth.currentUser?.uid || 'guest-user';
            await fetchTasks(userId);
          } else {
            console.log('タスクタブ: フォーカス時の自動更新はスキップします');
          }
        } catch (error) {
          console.error('タスク更新エラー:', error);
        }
      };
      
      refreshTasksOnFocus();
      
      return () => {
        // クリーンアップ関数
      };
    }, [fetchTasks, params.isNewlyCreated])
  );

  // タスクデータが変更されたときにカテゴリ情報を更新
  useEffect(() => {
    // タスクの集計
    let completed = 0;
    tasks.forEach(task => {
      if (task.completed) {
        completed++;
      }
    });
    setTotalCompleted(completed);
    setTotalTasks(tasks.length);

    // カテゴリの集計
    const categoryMap: Record<string, CategorySummary> = {};
    tasks.forEach(task => {
      const categoryName = task.tags && task.tags.length > 0 ? task.tags[0] : 'その他';
      
      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          name: categoryName,
          completedCount: 0,
          totalCount: 0,
          icon: getCategoryIcon(categoryName),
          color: getCategoryColor(categoryName)
        };
      }
      
      categoryMap[categoryName].totalCount++;
      if (task.completed) {
        categoryMap[categoryName].completedCount++;
      }
    });
    
    const categoryList = Object.values(categoryMap);
    setCategories(categoryList);
  }, [tasks]);

  // カテゴリに基づいてアイコンを決定
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return <MaterialCommunityIcons name="lungs" size={24} color="#3F51B5" />;
      case '音階':
        return <MaterialCommunityIcons name="scale" size={24} color="#FF9800" />;
      case '曲練習':
        return <Ionicons name="musical-note" size={24} color="#E91E63" />;
      case 'アンサンブル':
        return <Ionicons name="people" size={24} color="#9C27B0" />;
      case 'リズム':
        return <FontAwesome5 name="drum" size={24} color="#FFC107" />;
      default:
        return <Ionicons name="musical-notes" size={24} color="#4CAF50" />;
    }
  };

  // カテゴリに基づいて色を決定
  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return '#3F51B5';
      case '音階':
        return '#FF9800';
      case '曲練習':
        return '#E91E63';
      case 'アンサンブル':
        return '#9C27B0';
      case 'リズム':
        return '#FFC107';
      default:
        return '#4CAF50';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.completed;
    if (filter === 'pending') return !task.completed;
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
      // タスクの完了状態を切り替え
      await toggleTaskCompletion(taskId);
      
      // 完了したタスクの情報を取得
      const task = tasks.find(t => t.id === taskId);
      if (task && task.completed) {
        const category = task.tags && task.tags.length > 0 ? task.tags[0] : '';
        const completionCount = getTaskCompletionCount(task.title);
        const streakCount = getTaskStreakCount();
        
        // 完了ポップアップを表示
        setCompletionPopup({
          visible: true,
          taskTitle: task.title,
          category,
          completionCount,
          streakCount
        });
      }
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
      <View style={styles.content}>
        {tasks.length > 0 && (
          <TaskCategorySummaryMini 
            categories={categories}
            totalCompleted={totalCompleted}
            totalTasks={totalTasks}
          />
        )}
        
        <TaskList 
          tasks={filteredTasks}
          isLoading={refreshing}
          error={null}
          themeColor={TASK_THEME_COLOR}
        />
      </View>
      
      {/* FABボタン */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/task-form?mode=practiceMenu' as any)}
        activeOpacity={0.8}
      >
        <AntDesign name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      
      <TaskCompletionAnimation
        visible={completionPopup.visible}
        onClose={closeCompletionPopup}
        taskTitle={completionPopup.taskTitle}
        category={completionPopup.category}
        completionCount={completionPopup.completionCount}
        streakCount={completionPopup.streakCount}
        themeColor={TASK_THEME_COLOR}
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
  content: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    right: 24,
    bottom: 24,
    backgroundColor: TASK_THEME_COLOR,
    borderRadius: 28,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
});
