import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../../types/_task';

interface CategorySummaryProps {
  tasks: Task[];
}

// カテゴリごとの達成回数を計算する関数
const calculateCategoryAchievements = (tasks: Task[]) => {
  const completedTasks = tasks.filter(task => task.completed);
  
  // カテゴリごとにグループ化
  const categories: Record<string, number> = {};
  
  completedTasks.forEach(task => {
    if (task.tags && task.tags.length > 0) {
      task.tags.forEach(tag => {
        if (!categories[tag]) {
          categories[tag] = 0;
        }
        categories[tag]++;
      });
    } else {
      // タグがない場合は「その他」に分類
      if (!categories['その他']) {
        categories['その他'] = 0;
      }
      categories['その他']++;
    }
  });
  
  return categories;
};

// カテゴリに応じたアイコンを返す関数
const getCategoryIcon = (category: string) => {
  switch (category.toLowerCase()) {
    case 'ロングトーン':
      return 'music-note' as const;
    case 'スケール':
      return 'piano' as const;
    case 'テクニック':
      return 'build' as const;
    case '曲練習':
      return 'library-music' as const;
    case 'リズム':
      return 'timer' as const;
    case '表現':
      return 'brush' as const;
    case 'ペダル':
      return 'settings' as const;
    case '音色':
      return 'graphic-eq' as const;
    case '強弱':
      return 'trending-up' as const;
    default:
      return 'assignment' as const;
  }
};

// 達成回数に応じた色を返す関数
const getAchievementColor = (count: number) => {
  if (count >= 20) return '#8E24AA'; // パープル（マスター）
  if (count >= 15) return '#D81B60'; // ピンク（エキスパート）
  if (count >= 10) return '#F57C00'; // オレンジ（上級）
  if (count >= 5) return '#43A047'; // グリーン（中級）
  return '#1E88E5'; // ブルー（初級）
};

// 達成レベルを返す関数
const getAchievementLevel = (count: number) => {
  if (count >= 20) return 'マスター';
  if (count >= 15) return 'エキスパート';
  if (count >= 10) return '上級';
  if (count >= 5) return '中級';
  return '初級';
};

const CategorySummary: React.FC<CategorySummaryProps> = ({ tasks }) => {
  const categories = calculateCategoryAchievements(tasks);
  
  // カテゴリを達成回数の多い順にソート
  const sortedCategories = Object.entries(categories)
    .sort(([, countA], [, countB]) => countB - countA);
  
  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>カテゴリ別達成状況</Text>
        <Text style={styles.headerSubtitle}>
          {Object.values(categories).reduce((sum, count) => sum + count, 0)}回達成
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedCategories.map(([category, count]) => (
          <View 
            key={category} 
            style={[
              styles.categoryBadge,
              { backgroundColor: getAchievementColor(count) }
            ]}
          >
            <MaterialIcons 
              name={getCategoryIcon(category)} 
              size={18} 
              color="#FFFFFF" 
            />
            <Text style={styles.categoryText}>{category}</Text>
            <View style={styles.countContainer}>
              <Text style={styles.countText}>{count}回</Text>
            </View>
            {count >= 5 && (
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{getAchievementLevel(count)}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  categoryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  countContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  levelBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default CategorySummary;    