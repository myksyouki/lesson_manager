import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  Text,
  FlatList,
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
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { FontAwesome5 } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = SCREEN_WIDTH * 0.9;

export default function HomeScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });
  const { getFavorites } = useLessonStore();
  const { tasks, fetchTasks, generateTasksFromLessons } = useTaskStore();
  const { user } = useAuthStore();
  const favoriteLesson = getFavorites();
  const theme = useTheme();
  
  // カテゴリ情報の状態
  const [categories, setCategories] = useState<any[]>([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  
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

  // FlatListでのカードスライド
  const handleCardScroll = (index: number) => {
    setCurrentIndex(index);
  };

  const renderTaskCard = ({ item, index }: { item: any, index: number }) => {
    return (
      <View style={styles.taskCardContainer}>
        <TaskCard 
          task={item} 
          gesture={undefined} 
          animatedStyle={undefined} 
        />
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
            />
          </FadeIn>

          <FadeIn duration={600}>
            <View style={styles.sectionTitleContainer}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                今日の課題
              </Text>
              <View style={[styles.sectionTitleLine, { backgroundColor: theme.colors.primary }]} />
            </View>
          </FadeIn>

          {isLoading || tasks.length === 0 ? (
            <SlideIn from={{ x: 0, y: 50 }} duration={500}>
              <EmptyOrLoading 
                isLoading={isLoading} 
                onGenerateTasks={handleGenerateTasks} 
              />
            </SlideIn>
          ) : (
            <FadeIn duration={600}>
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={tasks}
                  renderItem={renderTaskCard}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  snapToInterval={CARD_WIDTH + 16}
                  snapToAlignment="center"
                  decelerationRate="fast"
                  contentContainerStyle={styles.flatListContent}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / (CARD_WIDTH + 16)
                    );
                    handleCardScroll(index);
                  }}
                />
                
                <TaskPagination 
                  totalCount={tasks.length} 
                  currentIndex={currentIndex} 
                />
              </View>
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
  carouselContainer: {
    height: 320,
    width: '100%',
    marginTop: 0,
  },
  flatListContent: {
    paddingHorizontal: 8,
  },
  taskCardContainer: {
    width: CARD_WIDTH,
    marginHorizontal: 8,
  },
  sectionTitleContainer: {
    width: '90%',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionTitleLine: {
    height: 3,
    width: 60,
    borderRadius: 2,
  },
});
