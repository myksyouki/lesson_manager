import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  StatusBar,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useLessonStore } from '../store/lessons';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { useTheme } from '../theme/index';
import HomeHeader from '../features/home/components/HomeHeader';
import TaskCard from '../features/home/components/TaskCard';
import TaskPagination from '../features/home/components/TaskPagination';
import EmptyOrLoading from '../features/home/components/EmptyOrLoading';
import ActionButton from '../features/home/components/ActionButton';
import { FadeIn, SlideIn, StaggeredList } from '../components/AnimatedComponents';

const SCREEN_WIDTH = Dimensions.get('window').width;
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
  
  // スクロールアニメーション用
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.9],
    extrapolate: 'clamp',
  });
  
  const headerTranslate = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  // タスクとレッスンデータの読み込み
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = event.translationX + context.value.x;
    })
    .onEnd((event) => {
      const threshold = CARD_WIDTH / 4;
      if (Math.abs(event.translationX) > threshold) {
        if (event.translationX > 0 && currentIndex > 0) {
          translateX.value = withSpring(CARD_WIDTH, {}, () => {
            runOnJS(setCurrentIndex)(currentIndex - 1);
          });
        } else if (event.translationX < 0 && currentIndex < tasks.length - 1) {
          translateX.value = withSpring(-CARD_WIDTH, {}, () => {
            runOnJS(setCurrentIndex)(currentIndex + 1);
          });
        }
      }
      translateX.value = withSpring(0);
    });

  const rStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.backgroundSecondary }]} edges={['top']}>
      <StatusBar barStyle={theme.colors.text === '#E8EAED' ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.backgroundSecondary} />
      
      <Animated.View 
        style={[
          styles.headerContainer, 
          { 
            backgroundColor: theme.colors.backgroundSecondary,
            opacity: headerOpacity,
            transform: [{ translateY: headerTranslate }]
          }
        ]}
      >
        <FadeIn duration={800}>
          <HomeHeader />
        </FadeIn>
      </Animated.View>

      <ScrollView 
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >
        <View style={styles.contentContainer}>
          {isLoading || tasks.length === 0 ? (
            <SlideIn from={{ x: 0, y: 50 }} duration={500}>
              <EmptyOrLoading 
                isLoading={isLoading} 
                onGenerateTasks={handleGenerateTasks} 
              />
            </SlideIn>
          ) : (
            <FadeIn duration={600}>
              <View style={styles.cardContainer}>
                <TaskCard 
                  task={tasks[currentIndex]} 
                  gesture={gesture} 
                  animatedStyle={rStyle} 
                />

                <TaskPagination 
                  totalCount={tasks.length} 
                  currentIndex={currentIndex} 
                />
              </View>
            </FadeIn>
          )}
        </View>
      </ScrollView>

      <SlideIn from={{ x: 0, y: 100 }} duration={800} delay={300}>
        <ActionButton />
      </SlideIn>
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
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
});
