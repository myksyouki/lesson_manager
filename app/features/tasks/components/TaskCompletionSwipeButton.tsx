import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TaskCompletionSwipeButtonProps {
  onComplete: () => void;
  isCompleted: boolean;
  category?: string;
}

const TaskCompletionSwipeButton: React.FC<TaskCompletionSwipeButtonProps> = ({
  onComplete,
  isCompleted,
  category
}) => {
  const [animation] = useState(new Animated.Value(0));
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // カテゴリに基づいて色を決定
  const getCategoryColor = () => {
    if (!category) return '#4CAF50'; // デフォルト色
    
    switch (category.toLowerCase()) {
      case 'ロングトーン':
        return '#3F51B5'; // 青
      case '音階':
        return '#FF9800'; // オレンジ
      case '曲練習':
        return '#E91E63'; // ピンク
      case 'アンサンブル':
        return '#9C27B0'; // 紫
      case 'リズム':
        return '#FFC107'; // 黄色
      default:
        return '#4CAF50'; // デフォルト緑
    }
  };

  const buttonColor = getCategoryColor();
  const buttonWidth = 280;

  // 長押し開始時の処理
  const handleLongPressStart = () => {
    if (isCompleted) return;
    
    setIsLongPressing(true);
    
    // アニメーションを開始
    Animated.timing(animation, {
      toValue: buttonWidth,
      duration: 1500, // 1.5秒で完了
      useNativeDriver: false,
    }).start();
    
    // 1.5秒後にタスク完了処理を実行
    const timer = setTimeout(() => {
      onComplete();
      setIsLongPressing(false);
      
      // 完了後、ボタンを元の位置に戻す
      setTimeout(() => {
        Animated.timing(animation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }, 500);
    }, 1500);
    
    setLongPressTimer(timer);
  };
  
  // 長押し終了時の処理
  const handleLongPressEnd = () => {
    if (isCompleted) return;
    
    setIsLongPressing(false);
    
    // タイマーをクリア
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // アニメーションを元に戻す
    Animated.spring(animation, {
      toValue: 0,
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  // コンポーネントのアンマウント時にタイマーをクリア
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // 完了済みの場合は異なるUIを表示
  if (isCompleted) {
    return (
      <TouchableOpacity 
        style={[styles.completedButton, { backgroundColor: buttonColor }]}
        onPress={onComplete}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={24} color="white" />
        <Text style={styles.completedText}>完了済み（タップで取り消し）</Text>
      </TouchableOpacity>
    );
  }

  const width = animation.interpolate({
    inputRange: [0, buttonWidth],
    outputRange: [0, buttonWidth],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.track, { backgroundColor: `${buttonColor}40` }]}
        onPressIn={handleLongPressStart}
        onPressOut={handleLongPressEnd}
        activeOpacity={1}
      >
        <Text style={styles.trackText}>長押しして完了</Text>
        <Animated.View 
          style={[
            styles.fill, 
            { 
              width, 
              backgroundColor: buttonColor,
              opacity: isLongPressing ? 0.8 : 0.6
            }
          ]} 
        />
        <View 
          style={[
            styles.thumb, 
            { 
              backgroundColor: buttonColor
            }
          ]}
        >
          <Ionicons name="checkmark" size={24} color="white" />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  track: {
    width: 280,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  trackText: {
    color: '#555',
    fontWeight: '600',
    fontSize: 16,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  completedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 280,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
  },
  completedText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default TaskCompletionSwipeButton; 