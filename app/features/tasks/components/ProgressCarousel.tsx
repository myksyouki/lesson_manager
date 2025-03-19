import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, PanResponder, Animated, Platform } from 'react-native';
import { useTaskStore } from '../../../store/tasks';
import TaskCategorySummary from './TaskCategorySummary';
import MonthlyPracticeChart from './MonthlyPracticeChart';

interface ProgressCarouselProps {
  categories: any[];
  totalCompleted: number;
  totalTasks: number;
  themeColor?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ProgressCarousel: React.FC<ProgressCarouselProps> = ({
  categories,
  totalCompleted,
  totalTasks,
  themeColor = '#4CAF50'
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const { getMonthlyPracticeCount } = useTaskStore();
  const scrollX = useRef(new Animated.Value(0)).current;
  
  const monthlyPracticeCount = getMonthlyPracticeCount();
  
  // カルーセルに表示するアイテム
  const carouselItems = [
    {
      key: 'progress',
      component: (
        <TaskCategorySummary 
          categories={categories}
          totalCompleted={totalCompleted}
          totalTasks={totalTasks}
          monthlyPracticeCount={monthlyPracticeCount}
        />
      ),
      title: '練習進捗状況'
    },
    {
      key: 'chart',
      component: (
        <MonthlyPracticeChart themeColor={themeColor} />
      ),
      title: '月別練習日数'
    }
  ];
  
  // パンレスポンダーの設定
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > Math.abs(dy * 2);
      },
      onPanResponderGrant: () => {
        // タッチ開始時の処理
      },
      onPanResponderMove: (_, gestureState) => {
        // 現在のオフセットを計算
        const newPosition = -activeIndex * SCREEN_WIDTH + gestureState.dx;
        scrollX.setValue(newPosition);
      },
      onPanResponderRelease: (_, gestureState) => {
        // スワイプ方向と距離に基づいて次のインデックスを決定
        const { dx } = gestureState;
        const threshold = SCREEN_WIDTH / 3;
        let newIndex = activeIndex;
        
        if (dx < -threshold && activeIndex < carouselItems.length - 1) {
          newIndex = activeIndex + 1;
        } else if (dx > threshold && activeIndex > 0) {
          newIndex = activeIndex - 1;
        }
        
        handleSlideToIndex(newIndex);
      }
    })
  ).current;
  
  // 指定されたインデックスにスライド
  const handleSlideToIndex = (index: number) => {
    setActiveIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true
    });
  };
  
  const handleTabPress = (index: number) => {
    handleSlideToIndex(index);
  };
  
  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    if (index !== activeIndex && index >= 0 && index < carouselItems.length) {
      setActiveIndex(index);
    }
  };
  
  useEffect(() => {
    // コンポーネントマウント時の初期化処理
    scrollX.setValue(-activeIndex * SCREEN_WIDTH);
  }, []);
  
  return (
    <View style={styles.container}>
      <View style={styles.indicatorContainer}>
        {carouselItems.map((item, index) => (
          <TouchableOpacity 
            key={item.key}
            style={[
              styles.indicatorButton,
              activeIndex === index && { backgroundColor: themeColor }
            ]}
            onPress={() => handleTabPress(index)}
          >
            <Text style={[
              styles.indicatorText,
              activeIndex === index && styles.activeIndicatorText
            ]}>
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.scrollViewWrapper} {...panResponder.panHandlers}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          directionalLockEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          bounces={false}
          scrollEnabled={Platform.OS !== 'ios'} // iOSではパンレスポンダーでハンドリング
        >
          {carouselItems.map((item, index) => (
            <View 
              key={item.key} 
              style={styles.carouselItem}
            >
              {item.component}
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    height: 380, // 固定高さを設定
    zIndex: 10, // 他の要素より前面に表示
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  indicatorButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  indicatorText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#757575',
  },
  activeIndicatorText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  scrollViewWrapper: {
    width: SCREEN_WIDTH,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    flex: 1,
  },
  scrollView: {
    width: SCREEN_WIDTH,
  },
  scrollViewContent: {
    flexDirection: 'row',
  },
  carouselItem: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 0,
    backgroundColor: '#F5F5F5',
  }
});

export default ProgressCarousel; 