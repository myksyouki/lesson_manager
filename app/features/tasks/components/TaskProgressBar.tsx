import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface TaskProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  animated?: boolean;
  duration?: number;
  showGradient?: boolean;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  progress,
  color = '#4CAF50',
  height = 8,
  animated = true,
  duration = 800,
  showGradient = true
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, duration]);

  const width = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // 今のprogress状態に応じて色合いを変える
  const getProgressColors = ():[string, string] => {
    // 0-20%: 赤系
    if (progress < 20) {
      return ['#FF5252', '#FF8A80'];
    }
    // 20-50%: 黄色系
    else if (progress < 50) {
      return ['#FFD740', '#FFAB00'];
    }
    // 50-80%: 青系
    else if (progress < 80) {
      return ['#40C4FF', '#00B0FF'];
    }
    // 80-100%: 緑系
    else {
      return ['#69F0AE', '#00E676'];
    }
  };

  const gradientColors = showGradient ? getProgressColors() : [color, color] as [string, string];

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View
        style={[
          styles.progressWrapper,
          {
            width,
            height,
          },
        ]}
      >
        {Platform.OS === 'web' ? (
          <View 
            style={[
              styles.progressBar,
              { 
                backgroundColor: gradientColors[0],
                height
              }
            ]} 
          />
        ) : (
          <LinearGradient
            colors={gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressBar, { height }]}
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E5E5E5',
    borderRadius: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  progressWrapper: {
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
});

export default TaskProgressBar; 