import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../../theme/index';

interface TaskPaginationProps {
  totalCount: number;
  currentIndex: number;
  maxDots?: number;
}

export const TaskPagination: React.FC<TaskPaginationProps> = ({
  totalCount,
  currentIndex,
  maxDots = 5,
}) => {
  const theme = useTheme();
  const animatedValues = useRef<Animated.Value[]>([]);
  
  // アニメーション値の初期化
  useEffect(() => {
    // 必要な数のアニメーション値を作成
    if (animatedValues.current.length === 0) {
      animatedValues.current = Array.from({ length: Math.min(totalCount, maxDots) }, 
        () => new Animated.Value(0)
      );
    }
    
    // 現在のインデックスのドットをアニメーション
    Animated.parallel(
      [
        // 現在のドットを拡大
        Animated.spring(animatedValues.current[currentIndex], {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: true,
        }),
        // 他のドットを縮小
        ...animatedValues.current.map((anim, idx) => {
          if (idx !== currentIndex) {
            return Animated.spring(anim, {
              toValue: 0,
              friction: 5,
              tension: 40,
              useNativeDriver: true,
            });
          }
          return Animated.delay(0); // nullの代わりにAnimated.delayを使用
        })
      ]
    ).start();
  }, [currentIndex, totalCount]);

  return (
    <View style={styles.pagination}>
      {Array.from({ length: Math.min(totalCount, maxDots) }).map((_, index) => {
        // 各ドットのアニメーションスタイル
        const dotScale = animatedValues.current[index]?.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.3],
        }) || 1;
        
        const dotOpacity = animatedValues.current[index]?.interpolate({
          inputRange: [0, 1],
          outputRange: [0.6, 1],
        }) || 0.6;
        
        return (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              { 
                backgroundColor: currentIndex === index 
                  ? theme.colors.primary 
                  : theme.colors.borderLight,
                transform: [{ scale: dotScale }],
                opacity: dotOpacity
              },
              currentIndex === index && styles.paginationDotActive,
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    height: 20, // 固定の高さを設定して、アニメーション中にレイアウトが変わらないようにする
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 5,
  },
  paginationDotActive: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default TaskPagination;
