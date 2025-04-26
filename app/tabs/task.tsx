import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, View, Text, Platform, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '../../store/tasks';
import { useAuthStore } from '../../store/auth';
import { demoModeService } from '../../services/demoModeService';
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
  const { 
    tasks, 
    fetchTasks, 
    fetchTasksWhenAuthenticated, 
    toggleTaskCompletion, 
    getTaskCompletionCount, 
    getTaskStreakCount,
    setTasks
  } = useTaskStore();
  
  const { isDemo, user } = useAuthStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  
  const params = useLocalSearchParams();
  
  const [completionPopup, setCompletionPopup] = useState({
    visible: false,
    taskTitle: '',
    category: '',
    completionCount: 0,
    streakCount: 0
  });

  useEffect(() => {
    const loadInitialTasks = async () => {
      setRefreshing(true);
      try {
        if (isDemo) {
          console.log('デモモード：サンプルタスクデータを読み込みます');
          
          const demoPracticeMenus = await demoModeService.getPracticeMenus();
          
          const demoTasks = demoPracticeMenus.flatMap(menu => 
            menu.steps.map((step, index) => ({
              id: `demo-task-${menu.id}-${index}`,
              title: step.title,
              description: step.description,
              completed: Math.random() > 0.5,
              dueDate: new Date(Date.now() + 86400000 * (index + 1)).toISOString(),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              priority: String(Math.floor(Math.random() * 3) + 1),
              isPinned: index === 0,
              attachments: [],
              tags: [menu.category || menu.instrument || 'その他'],
              userId: user?.uid || 'demo-user',
              lessonId: `demo-lesson-${index % 3 + 1}`,
              displayOrder: index + 1
            }))
          );
          
          setTasks(demoTasks);
          console.log(`デモモード：${demoTasks.length}件のサンプルタスクを読み込みました`);
        } else {
          const currentUser = auth.currentUser;
          console.log('初期タスク取得 - 認証情報:', 
            currentUser ? 
            {
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              isAnonymous: currentUser.isAnonymous,
              providerId: currentUser.providerId
            } : 'ログインしていません');
          
          console.log('初期タスク取得開始...');
          // 認証待機後にタスク取得
          await fetchTasksWhenAuthenticated();
          console.log('初期タスク取得: 完了 - タスク数 =', tasks.length);
        }
      } catch (error) {
        console.error('初期タスク取得エラー:', error);
      } finally {
        setRefreshing(false);
      }
    };
    loadInitialTasks();
  }, [isDemo]);

  useFocusEffect(
    useCallback(() => {
      const refreshTasksOnFocus = async () => {
        try {
          console.log('タスクタブフォーカス: パラメータ =', JSON.stringify(params));
          console.log('タスクタブフォーカス: 現在のタスク数 =', tasks.length);
          
          if (isDemo) {
            console.log('デモモード：フォーカス時の再読み込みをスキップします');
            return;
          }
          
          const isNewlyCreated = params.isNewlyCreated === 'true';
          console.log('タスクタブフォーカス: isNewlyCreated =', isNewlyCreated);
          
          const currentUser = auth.currentUser;
          console.log('タスクタブフォーカス: 認証状態 =', !!currentUser);
          console.log('タスクタブフォーカス: ユーザー情報 =', 
            currentUser ? 
            {
              uid: currentUser.uid,
              email: currentUser.email,
              emailVerified: currentUser.emailVerified,
              isAnonymous: currentUser.isAnonymous
            } : 'ログインしていません');
          
          console.log('タスクタブフォーカス: タスク再取得開始...');
          await fetchTasksWhenAuthenticated();
        } catch (error) {
          console.error('タスク更新エラー:', error);
        }
      };
      refreshTasksOnFocus();

      return () => {
        // クリーンアップ関数
      };
    }, [fetchTasksWhenAuthenticated, isDemo])
  );

  useEffect(() => {
    let completed = 0;
    tasks.forEach(task => {
      if (task.completed) {
        completed++;
      }
    });
    setTotalCompleted(completed);
    setTotalTasks(tasks.length);

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
      if (isDemo) {
        console.log('デモモード：サンプルタスクを再読み込みします');
        const demoPracticeMenus = await demoModeService.getPracticeMenus();
        
        const demoTasks = demoPracticeMenus.flatMap(menu => 
          menu.steps.map((step, index) => ({
            id: `demo-task-${menu.id}-${index}`,
            title: step.title,
            description: step.description,
            completed: Math.random() > 0.5,
            dueDate: new Date(Date.now() + 86400000 * (index + 1)).toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            priority: String(Math.floor(Math.random() * 3) + 1),
            isPinned: index === 0,
            attachments: [],
            tags: [menu.category || menu.instrument || 'その他'],
            userId: user?.uid || 'demo-user',
            lessonId: `demo-lesson-${index % 3 + 1}`,
            displayOrder: index + 1
          }))
        );
        
        setTasks(demoTasks);
        console.log(`デモモード：${demoTasks.length}件のサンプルタスクを再読み込みしました`);
      } else {
        // 新しい認証待機メソッドを使用
        await fetchTasksWhenAuthenticated();
      }
    } catch (error) {
      console.error('タスク更新エラー:', error);
    } finally {
      setRefreshing(false);
    }
  };
  
  const handleTaskComplete = async (taskId: string) => {
    try {
      if (isDemo) {
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? { ...task, completed: !task.completed } : task
        );
        setTasks(updatedTasks);
        
        const task = updatedTasks.find(t => t.id === taskId);
        if (task && task.completed) {
          const category = task.tags && task.tags.length > 0 ? task.tags[0] : '';
          
          const completionCount = Math.floor(Math.random() * 5) + 1;
          const streakCount = Math.floor(Math.random() * 10) + 1;
          
          setCompletionPopup({
            visible: true,
            taskTitle: task.title,
            category,
            completionCount,
            streakCount
          });
        }
      } else {
        await toggleTaskCompletion(taskId);
        
        const task = tasks.find(t => t.id === taskId);
        if (task && task.completed) {
          const category = task.tags && task.tags.length > 0 ? task.tags[0] : '';
          const completionCount = getTaskCompletionCount(task.title);
          const streakCount = getTaskStreakCount();
          
          setCompletionPopup({
            visible: true,
            taskTitle: task.title,
            category,
            completionCount,
            streakCount
          });
        }
      }
    } catch (error) {
      console.error('タスク完了エラー:', error);
    }
  };
  
  const closeCompletionPopup = () => {
    setCompletionPopup(prev => ({ ...prev, visible: false }));
  };

  console.log('タスク画面レンダリング');
  console.log('タスクストアのタスク数:', tasks.length);
  console.log('フィルタータイプ:', filter);
  console.log('フィルター後のタスク数:', filteredTasks.length);
  if (tasks.length > 0) {
    console.log('最初のタスクサンプル:', {
      id: tasks[0].id,
      title: tasks[0].title,
      completed: tasks[0].completed,
      tags: tasks[0].tags
    });
  } else {
    console.log('タスクが存在しません');
  }
  
  console.log('TaskListコンポーネントに渡すタスク数:', filteredTasks.length);

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
        
        <View style={styles.taskListContainer}>
          <TaskList 
            tasks={filteredTasks}
            isLoading={refreshing}
            error={null}
            themeColor={TASK_THEME_COLOR}
          />
        </View>
      </View>
      
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
    backgroundColor: '#f8f8f8',
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
  },
  taskListContainer: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginTop: 4,
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
