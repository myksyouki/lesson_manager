import React, { useEffect, useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView, Text } from 'react-native';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import TaskList from './features/tasks/components/TaskList';
import TaskCategorySummary from './features/tasks/components/TaskCategorySummary';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

// カテゴリサマリーの型定義
interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

export default function Home() {
  const { user } = useAuthStore();
  const { tasks, isLoading, error, fetchTasks } = useTaskStore();
  const [recentlyCompletedTaskId, setRecentlyCompletedTaskId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);

  useEffect(() => {
    if (user) {
      fetchTasks(user.uid);
    }
  }, [user]);

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

  const handleToggleComplete = (taskId: string) => {
    // タスクの完了状態を切り替えた後、アニメーション表示のためにIDを保存
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.completed) {
      setRecentlyCompletedTaskId(taskId);
      
      // 3秒後にリセット
      setTimeout(() => {
        setRecentlyCompletedTaskId(null);
      }, 3000);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>タスク一覧</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <TaskCategorySummary 
          categories={categories}
          totalCompleted={totalCompleted}
          totalTasks={totalTasks}
        />
        
        <TaskList 
          tasks={tasks} 
          isLoading={isLoading} 
          error={error}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
  },
}); 