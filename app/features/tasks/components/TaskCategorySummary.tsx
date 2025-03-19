import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import TaskProgressBar from './TaskProgressBar';
import TaskAchievementBadge from './TaskAchievementBadge';
import { useTaskStore } from '../../../store/tasks';

interface CategorySummary {
  name: string;
  completedCount: number;
  totalCount: number;
  icon: JSX.Element;
  color: string;
}

interface TaskCategorySummaryProps {
  categories: CategorySummary[];
  totalCompleted: number;
  totalTasks: number;
  onCategoryPress?: (category: string) => void;
  onViewAllPress?: () => void;
  hideCategories?: boolean;
  monthlyPracticeCount?: number;
}

const TaskCategorySummary: React.FC<TaskCategorySummaryProps> = ({
  categories,
  totalCompleted,
  totalTasks,
  onCategoryPress,
  onViewAllPress,
  hideCategories = false,
  monthlyPracticeCount: externalMonthlyPracticeCount,
}) => {
  const { tasks, getCategoryCompletionCount, getMonthlyPracticeCount } = useTaskStore();
  const [streakCount, setStreakCount] = useState(0);
  const [monthlyPracticeCount, setMonthlyPracticeCount] = useState(0);

  useEffect(() => {
    // カテゴリごとのタスク数を集計
    const categoryMap: Record<string, { completed: number; total: number }> = {};
    let completedCount = 0;
    
    // タスクをカテゴリごとに分類
    tasks.forEach(task => {
      const category = task.tags && task.tags.length > 0 ? task.tags[0] : 'その他';
      
      if (!categoryMap[category]) {
        categoryMap[category] = { completed: 0, total: 0 };
      }
      
      categoryMap[category].total += 1;
      
      if (task.completed) {
        categoryMap[category].completed += 1;
        completedCount += 1;
      }
    });
    
    // カテゴリ情報を配列に変換
    const categoryData: CategorySummary[] = Object.keys(categoryMap).map(name => ({
      name,
      completedCount: categoryMap[name].completed,
      totalCount: categoryMap[name].total,
      icon: getCategoryIcon(name),
      color: getCategoryColor(name),
    }));
    
    // 完了率の高い順にソート
    categoryData.sort((a, b) => {
      const aRate = a.totalCount > 0 ? a.completedCount / a.totalCount : 0;
      const bRate = b.totalCount > 0 ? b.completedCount / b.totalCount : 0;
      return bRate - aRate;
    });
    
    // 今月の練習日数を取得（外部から渡された値があればそれを使う）
    if (externalMonthlyPracticeCount !== undefined) {
      setMonthlyPracticeCount(externalMonthlyPracticeCount);
    } else {
      const monthlyCount = getMonthlyPracticeCount();
      setMonthlyPracticeCount(monthlyCount);
    }
    
    setStreakCount(3);
  }, [tasks, getMonthlyPracticeCount, externalMonthlyPracticeCount]);

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

  // 全体の進捗率を計算
  const totalProgress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>練習進捗状況</Text>
        {onViewAllPress && (
          <TouchableOpacity onPress={onViewAllPress} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>すべて表示</Text>
            <MaterialIcons name="chevron-right" size={18} color="#4285F4" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.overallContainer}>
        <View style={styles.overallTextContainer}>
          <Text style={styles.overallTitle}>全体の進捗</Text>
          <Text style={styles.overallPercentage}>{Math.round(totalProgress)}%</Text>
        </View>
        
        <View style={styles.overallProgressContainer}>
          <View
            style={[
              styles.overallProgressBar,
              { width: `${totalProgress}%` },
            ]}
          />
        </View>
        
        <Text style={styles.overallCount}>
          {totalCompleted}/{totalTasks} 完了
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesScrollContainer}
        scrollEnabled={false}
        nestedScrollEnabled={true}
      >
        <TaskAchievementBadge 
          type="monthly" 
          count={monthlyPracticeCount} 
          label={`今月${monthlyPracticeCount}日練習`}
        />
        
        <TaskAchievementBadge 
          type="completion" 
          count={totalCompleted} 
          label={`${totalCompleted}個のタスク完了`}
        />
        
        {categories.length > 0 && (
          <TaskAchievementBadge 
            type="category" 
            count={categories[0].completedCount} 
            label={`${categories[0].name}を${categories[0].completedCount}回達成`}
            color={categories[0].color}
          />
        )}
      </ScrollView>
      
      {!hideCategories && categories.length > 0 && (
        <View style={styles.categoryList}>
          {categories.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${category.color}20` }]}>
                  {category.icon}
                </View>
                
                <View style={styles.categoryInfo}>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>
                    {category.completedCount}/{category.totalCount} 完了
                  </Text>
                </View>
              </View>
              
              <TaskProgressBar 
                progress={(category.completedCount / category.totalCount) * 100} 
                color={category.color}
                height={6}
              />
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalCompleted}</Text>
          <Text style={styles.statLabel}>完了タスク</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalTasks - totalCompleted}</Text>
          <Text style={styles.statLabel}>残りタスク</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{categories.length}</Text>
          <Text style={styles.statLabel}>カテゴリ</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    width: '90%',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallContainer: {
    marginBottom: 16,
  },
  overallTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overallTitle: {
    fontSize: 16,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallPercentage: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  overallProgressContainer: {
    height: 8,
    backgroundColor: '#E8EAED',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  overallProgressBar: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  overallCount: {
    fontSize: 12,
    color: '#5F6368',
    alignSelf: 'flex-end',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoriesContainer: {
    marginBottom: 16,
    maxHeight: 200,
  },
  categoriesScrollContainer: {
    paddingBottom: 8,
  },
  categoryList: {
    marginTop: 8,
  },
  categoryItem: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoryCount: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  statLabel: {
    fontSize: 12,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  statDivider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E8EAED',
    alignSelf: 'center',
  },
});

export default TaskCategorySummary; 