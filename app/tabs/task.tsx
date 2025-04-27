import React, { useState, useCallback, useEffect, useMemo } from 'react';
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

// PracticeStepとMenuStep型を定義
interface PracticeStep {
  id: string;
  title: string;
  description: string;
  duration: number;
  orderIndex: number;
}

// 開発環境フラグ
const __DEV__ = process.env.NODE_ENV === 'development';

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
  // デモモードのデータキャッシュ
  const [demoPracticeMenusCache, setDemoPracticeMenusCache] = useState<any[]>([]);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  
  const params = useLocalSearchParams();
  
  const [completionPopup, setCompletionPopup] = useState({
    visible: false,
    taskTitle: '',
    category: '',
    completionCount: 0,
    streakCount: 0
  });

  // デモモードの場合は練習メニューデータをキャッシュ
  useEffect(() => {
    if (isDemo && demoPracticeMenusCache.length === 0) {
      const loadDemoData = async () => {
        try {
          const menus = await demoModeService.getPracticeMenus();
          setDemoPracticeMenusCache(menus);
        } catch (error) {
          if (__DEV__) console.error('デモデータのキャッシュに失敗:', error);
        }
      };
      loadDemoData();
    }
  }, [isDemo, demoPracticeMenusCache.length]);

  // 初回データ読み込み
  useEffect(() => {
    // 既に初期ロードが完了している場合はスキップ
    if (initialLoadDone) return;

    const loadInitialTasks = async () => {
      setRefreshing(true);
      try {
        if (isDemo) {
          if (__DEV__) console.log('デモモード：サンプルタスクデータを読み込みます');
          
          // キャッシュされたデータを使用
          const demoPracticeMenus = demoPracticeMenusCache.length > 0
            ? demoPracticeMenusCache
            : await demoModeService.getPracticeMenus();
          
          const demoTasks = demoPracticeMenus.flatMap(menu => 
            menu.steps.map((step: PracticeStep, index: number) => ({
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
          if (__DEV__) console.log(`デモモード：${demoTasks.length}件のサンプルタスクを読み込みました`);
        } else {
          if (__DEV__) console.log('初期タスク取得開始...');
          // 認証待機後にタスク取得
          await fetchTasksWhenAuthenticated();
          if (__DEV__) console.log('初期タスク取得: 完了 - タスク数 =', tasks.length);
        }
        setInitialLoadDone(true);
      } catch (error) {
        if (__DEV__) console.error('初期タスク取得エラー:', error);
      } finally {
        setRefreshing(false);
      }
    };
    loadInitialTasks();
  }, [isDemo, fetchTasksWhenAuthenticated, tasks.length, demoPracticeMenusCache, initialLoadDone, setTasks, user?.uid]);

  // タブフォーカス時のデータ更新（初期ロード後のみ必要な場合に実行）
  useFocusEffect(
    useCallback(() => {
      // まだ初期ロードが完了していない場合はスキップ
      if (!initialLoadDone) return;
      
      // 既にロード中の場合はスキップ
      if (refreshing) return;
      
      const refreshTasksOnFocus = async () => {
        try {
          // 新規作成パラメータがある場合のみ再読み込み
          const isNewlyCreated = params.isNewlyCreated === 'true';
          if (__DEV__) console.log('タスクタブフォーカス: isNewlyCreated =', isNewlyCreated);
          
          if (!isNewlyCreated) {
            if (__DEV__) console.log('タスクタブフォーカス: 新規作成でないためスキップ');
            return;
          }
          
          if (isDemo) {
            if (__DEV__) console.log('デモモード：フォーカス時の再読み込みをスキップします');
            return;
          }
          
          setRefreshing(true);
          await fetchTasksWhenAuthenticated();
        } catch (error) {
          if (__DEV__) console.error('タスク更新エラー:', error);
        } finally {
          setRefreshing(false);
        }
      };
      refreshTasksOnFocus();
    }, [params, fetchTasksWhenAuthenticated, isDemo, refreshing, initialLoadDone])
  );

  // タスク状態が変更された時のカテゴリ集計を最適化
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

  // カテゴリアイコンの生成を最適化（useMemoを使用）
  const getCategoryIcon = useCallback((category: string) => {
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
  }, []);

  const getCategoryColor = useCallback((category: string) => {
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
  }, []);

  // フィルタリングされたタスクをメモ化して不要な再計算を防止
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter === 'completed') return task.completed;
      if (filter === 'pending') return !task.completed;
      return true;
    });
  }, [tasks, filter]);

  const onRefresh = async () => {
    if (refreshing) return; // 既にリフレッシュ中ならスキップ
    
    setRefreshing(true);
    try {
      if (isDemo) {
        if (__DEV__) console.log('デモモード：サンプルタスクを再読み込みします');
        // キャッシュを活用
        const demoPracticeMenus = demoPracticeMenusCache.length > 0
          ? demoPracticeMenusCache
          : await demoModeService.getPracticeMenus();
        
        const demoTasks = demoPracticeMenus.flatMap(menu => 
          menu.steps.map((step: PracticeStep, index: number) => ({
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
        if (__DEV__) console.log(`デモモード：${demoTasks.length}件のサンプルタスクを再読み込みしました`);
      } else {
        // 新しい認証待機メソッドを使用
        await fetchTasksWhenAuthenticated();
      }
    } catch (error) {
      if (__DEV__) console.error('タスク更新エラー:', error);
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
      if (__DEV__) console.error('タスク完了エラー:', error);
    }
  };
  
  const closeCompletionPopup = () => {
    setCompletionPopup(prev => ({ ...prev, visible: false }));
  };

  // 開発環境のみデバッグログを出力
  if (__DEV__) {
    console.log('タスク画面レンダリング');
    console.log('タスクストアのタスク数:', tasks.length);
    console.log('フィルタータイプ:', filter);
    console.log('フィルター後のタスク数:', filteredTasks.length);
  }

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
