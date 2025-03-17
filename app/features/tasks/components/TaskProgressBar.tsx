import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface TaskProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
  animated?: boolean;
  duration?: number;
}

const TaskProgressBar: React.FC<TaskProgressBarProps> = ({
  progress,
  color = '#4CAF50',
  height = 8,
  animated = true,
  duration = 800
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

  return (
    <View style={[styles.container, { height }]}>
      <Animated.View
        style={[
          styles.progress,
          {
            width,
            height,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: 4,
  },
});

export default TaskProgressBar; 