import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Text,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLessonStore } from '../store/lessons';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { useTheme } from '../theme/index';
import HomeHeader from '../features/home/components/HomeHeader';
import TaskCard from '../features/home/components/TaskCard';
import TaskPagination from '../features/home/components/TaskPagination';
import EmptyOrLoading from '../features/home/components/EmptyOrLoading';
import TaskCategorySummary from '../features/tasks/components/TaskCategorySummary';
import { FadeIn, SlideIn } from '../components/AnimatedComponents';
import { MaterialCommunityIcons, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';
import { router } from 'expo-router';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

export default function HomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const { getFavorites } = useLessonStore();
  const { tasks, fetchTasks, generateTasksFromLessons, getMonthlyPracticeCount, getPinnedTasks } = useTaskStore();
  const { user } = useAuthStore();
  const favoriteLesson = getFavorites();
  const theme = useTheme();
  
  // カテゴリ情報の状態
  const [categories, setCategories] = useState<any[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const [monthlyPracticeCount, setMonthlyPracticeCount] = useState(0);
  
  // ピン留めされたタスク
  const pinnedTasks = getPinnedTasks();
  
  // フラットリスト参照
  const flatListRef = useRef<FlatList>(null);

  // タスクとレッスンデータの読み込み
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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
    const categoryMap: Record<string, any> = {};
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
    
    // 今月の練習日数を取得
    const monthlyCount = getMonthlyPracticeCount();
    setMonthlyPracticeCount(monthlyCount);
  }, [tasks, getMonthlyPracticeCount]);

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

  const loadData = async () => {
    try {
      setIsLoading(true);
      await fetchTasks(user?.uid || '');
      setIsLoading(false);
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      setIsLoading(false);
    }
  };

  // 課題を自動生成する関数
  const handleGenerateTasks = async () => {
    if (!user) {
      Alert.alert('エラー', 'ログインが必要です');
      return;
    }

    try {
      setIsLoading(true);
      await generateTasksFromLessons(user.uid, 3); // 直近3か月のレッスンから課題を生成
      setIsLoading(false);
      Alert.alert('成功', 'レッスンから新しい課題を生成しました');
    } catch (error) {
      console.error('課題生成エラー:', error);
      setIsLoading(false);
      Alert.alert('エラー', '課題の生成に失敗しました');
    }
  };

  const navigateToAllTasks = () => {
    router.push('/task');
  };

  // ピン留めされたタスクカードをレンダリング
  const renderPinnedTaskCard = ({ item }: { item: any }) => {
    return (
      <View style={styles.pinnedTaskCardContainer}>
        <TaskCard task={item} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.backgroundSecondary }]} edges={['top']}>
      <StatusBar barStyle={theme.colors.text === '#E8EAED' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.backgroundSecondary} />
      
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.headerContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
          <FadeIn duration={800}>
            <HomeHeader />
          </FadeIn>
        </View>

        <View style={styles.contentContainer}>
          <FadeIn duration={600}>
            <TaskCategorySummary 
              categories={[]}
              totalCompleted={totalCompleted}
              totalTasks={totalTasks}
              hideCategories={true}
              monthlyPracticeCount={monthlyPracticeCount}
            />
          </FadeIn>

          <FadeIn duration={600}>
            <View style={styles.sectionTitleContainer}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                  ピックアップタスク
                </Text>
                <TouchableOpacity onPress={navigateToAllTasks} style={styles.viewAllButton}>
                  <Text style={[styles.viewAllText, { color: theme.colors.primary }]}>すべて表示</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.sectionTitleLine, { backgroundColor: theme.colors.primary }]} />
            </View>
          </FadeIn>

          {isLoading ? (
            <SlideIn from={{ x: 0, y: 50 }} duration={500}>
              <EmptyOrLoading 
                isLoading={isLoading} 
                onGenerateTasks={handleGenerateTasks} 
              />
            </SlideIn>
          ) : pinnedTasks.length === 0 ? (
            <SlideIn from={{ x: 0, y: 50 }} duration={500}>
              <View style={styles.emptyPinnedContainer}>
                <MaterialIcons name="bookmark-border" size={32} color={theme.colors.borderLight} />
                <Text style={[styles.emptyPinnedText, { color: theme.colors.textSecondary }]}>
                  タスクを最大3つまでピックアップできます
                </Text>
                <TouchableOpacity 
                  style={[styles.goToTaskButton, { backgroundColor: theme.colors.primary }]}
                  onPress={navigateToAllTasks}
                >
                  <Text style={[styles.goToTaskButtonText, { color: theme.colors.textInverse }]}>
                    タスク一覧へ
                  </Text>
                </TouchableOpacity>
              </View>
            </SlideIn>
          ) : (
            <FadeIn duration={600}>
              <FlatList
                data={pinnedTasks}
                renderItem={renderPinnedTaskCard}
                keyExtractor={(item) => item.id}
                horizontal={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pinnedTasksContainer}
              />
            </FadeIn>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    zIndex: 10,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 16,
    flex: 1,
  },
  sectionTitleContainer: {
    width: '100%',
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
  },
  sectionTitleLine: {
    height: 2,
    width: 40,
    borderRadius: 1,
    alignSelf: 'flex-start',
    marginTop: 0,
    marginBottom: 10,
  },
  pinnedTasksContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 16,
    paddingBottom: 24,
    alignItems: 'center',
  },
  pinnedTaskCardContainer: {
    marginBottom: 16,
    width: '100%',
  },
  emptyPinnedContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20,
  },
  emptyPinnedText: {
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  goToTaskButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  goToTaskButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
