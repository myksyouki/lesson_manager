import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  MaterialIcons,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task } from '../../../../types/_task';
import { useTaskStore } from '../../../../store/tasks';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
} from 'react-native-reanimated';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  showAnimation?: boolean;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onPress?: (id: string) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggleComplete, 
  showAnimation = false,
  isSelectable = false,
  isSelected = false,
  onSelect,
  onPress
}) => {
  const router = useRouter();
  const { getTaskCompletionCount } = useTaskStore();
  const [completionCount, setCompletionCount] = useState(0);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  
  // アニメーション値
  const scaleValue = useSharedValue(1);
  const opacityValue = useSharedValue(0);

  useEffect(() => {
    // タスクの完了回数を取得
    const count = getTaskCompletionCount(task.title);
    setCompletionCount(count);
  }, [task, getTaskCompletionCount]);

  useEffect(() => {
    // タスクが完了状態になった場合にアニメーションを表示
    if (showAnimation && task.completed) {
      setShowCompletionAnimation(true);
      
      // アニメーションをReanimatedで実行
      scaleValue.value = withTiming(1.05, { duration: 200 }, () => {
        scaleValue.value = withTiming(1, { duration: 200 });
      });
      
      opacityValue.value = withTiming(1, { duration: 300 }, () => {
        // 3秒後にアニメーションを非表示
        setTimeout(() => {
          opacityValue.value = withTiming(0, { duration: 300 }, () => {
            setShowCompletionAnimation(false);
          });
        }, 3000);
      });
    }
  }, [task.completed, showAnimation]);

  const handlePress = () => {
    if (isSelectable) {
      if (onSelect) {
        onSelect(task.id);
      }
    } else if (onPress) {
      onPress(task.id);
    } else {
      router.push({
        pathname: '/task-detail' as any,
        params: { id: task.id }
      });
    }
  };

  const handleLongPress = () => {
    if (onSelect) {
      onSelect(task.id);
    }
  };

  const handleToggleComplete = () => {
    if (onToggleComplete) {
      onToggleComplete(task.id);
    }
  };

  // カテゴリに基づいてアイコンを決定
  const getCategoryIcon = () => {
    if (!task.tags || task.tags.length === 0) {
      return <Ionicons name="musical-notes" size={24} color="#888" />;
    }
    
    const category = task.tags[0].toLowerCase();
    
    switch (category) {
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
  const getCategoryColor = () => {
    if (!task.tags || task.tags.length === 0) return '#4CAF50';
    
    const category = task.tags[0].toLowerCase();
    
    switch (category) {
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

  const categoryColor = getCategoryColor();

  // アニメーションスタイル
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: scaleValue.value }
      ]
    };
  });

  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value
    };
  });

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        task.completed && styles.completedContainer,
        isSelected && styles.selectedContainer
      ]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      delayLongPress={300}
      activeOpacity={0.7}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.contentSection}>
          {/* カード上部 - タイトルとピン留めアイコン */}
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Text 
                style={[
                  styles.title, 
                  task.completed && styles.completedTitle
                ]}
                numberOfLines={2}
              >
                {task.title}
              </Text>
            </View>
            
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
              </View>
            )}
            
            {/* Pinned indicator removed as 'isPinned' is not in Task type */}

          </View>
          
          {/* カテゴリラベル */}
          {task.tags && task.tags.length > 0 && (
            <View style={[styles.categoryLabel, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {task.tags[0]}
              </Text>
            </View>
          )}
          
          {/* 説明文 */}
          <Text 
            style={[
              styles.description, 
              task.completed && styles.completedDescription
            ]}
            numberOfLines={3}
          >
            {task.content}
          </Text>
          
          {/* カード下部 - 完了ボタンと完了回数 */}
          <View style={styles.cardFooter}>
            {!isSelectable && (
              <TouchableOpacity 
                style={[
                  styles.checkButton,
                  task.completed && { backgroundColor: categoryColor }
                ]}
                onPress={handleToggleComplete}
              >
                <Ionicons 
                  name={task.completed ? "checkmark" : "checkmark-outline"} 
                  size={20} 
                  color={task.completed ? "white" : "#888"}
                />
              </TouchableOpacity>
            )}
            
            {completionCount > 0 && (
              <View style={[styles.countBadge, { backgroundColor: `${categoryColor}20` }]}>
                <Text style={[styles.countText, { color: categoryColor }]}>
                  {completionCount}回完了
                </Text>
              </View>
            )}
            
            {/* カテゴリアイコン */}
            <View style={styles.categoryIcon}>
              {getCategoryIcon()}
            </View>
          </View>
        </View>
        
        {showCompletionAnimation && (
          <Animated.View 
            style={[
              styles.completionAnimation,
              opacityStyle
            ]}
          >
            <View style={[styles.completionBadge, { backgroundColor: categoryColor }]}>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.completionText}>完了！</Text>
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  completedContainer: {
    opacity: 0.8,
    backgroundColor: '#f9f9f9',
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  card: {
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  contentSection: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  pinnedIndicator: {
    backgroundColor: 'white',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryIcon: {
    marginLeft: 'auto',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  completedDescription: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  checkButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionAnimation: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
  },
  completionText: {
    marginLeft: 4,
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default TaskCard;
