import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  MaterialIcons,
  AntDesign,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task } from '../../../types/task';
import { useTaskStore } from '../../../store/tasks';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  runOnJS 
} from 'react-native-reanimated';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  showAnimation?: boolean;
  onDelete?: (id: string) => void;
  disableSwipe?: boolean;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_BUTTON_WIDTH = 80;
const SWIPE_THRESHOLD = ACTION_BUTTON_WIDTH * 0.5;

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  onToggleComplete, 
  showAnimation = false, 
  onDelete,
  disableSwipe = false
}) => {
  const router = useRouter();
  const { getTaskCompletionCount, togglePin, canPinMoreTasks, deleteTask } = useTaskStore();
  const [completionCount, setCompletionCount] = useState(0);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Reanimatedバージョンのアニメーション値
  const translateX = useSharedValue(0);
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
            runOnJS(setShowCompletionAnimation)(false);
          });
        }, 3000);
      });
    }
  }, [task.completed, showAnimation]);

  const handlePress = () => {
    if (isOpen) {
      closeSwipe();
    } else {
      router.push({
        pathname: '/task-detail' as any,
        params: { id: task.id }
      });
    }
  };

  const handleToggleComplete = () => {
    if (onToggleComplete) {
      onToggleComplete(task.id);
    }
  };

  // ピン留め状態を切り替える
  const handleTogglePin = async () => {
    // すでにピン留めされていて、解除する場合
    if (task.isPinned) {
      const result = await togglePin(task.id);
      if (!result) {
        Alert.alert('エラー', 'ピン留めの解除に失敗しました。');
      }
    } else {
      // ピン留めする場合
      if (!canPinMoreTasks() && !task.isPinned) {
        Alert.alert(
          'ピン留め上限',
          'ピン留めできるタスクは最大3つまでです。他のタスクのピン留めを解除してから再試行してください。'
        );
        return;
      }
      
      const result = await togglePin(task.id);
      if (!result) {
        Alert.alert('エラー', 'タスクのピン留めに失敗しました。');
      }
    }
    closeSwipe();
  };

  const handleDelete = async () => {
    Alert.alert(
      'タスクの削除',
      `「${task.title}」を削除しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
          onPress: closeSwipe
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id);
              if (onDelete) {
                onDelete(task.id);
              }
            } catch (error) {
              Alert.alert('エラー', 'タスクの削除に失敗しました。');
            }
          }
        }
      ]
    );
  };

  const openSwipe = () => {
    setIsOpen(true);
    translateX.value = withTiming(-ACTION_BUTTON_WIDTH * 2, { duration: 300 });
  };

  const closeSwipe = () => {
    setIsOpen(false);
    translateX.value = withTiming(0, { duration: 300 });
  };

  const gesture = Gesture.Pan()
    .enabled(!disableSwipe)
    .onUpdate((e) => {
      translateX.value = Math.min(0, Math.max(-ACTION_BUTTON_WIDTH * 2, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD) {
        runOnJS(openSwipe)();
      } else {
        runOnJS(closeSwipe)();
      }
    });

  // アニメーションスタイル
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scale: scaleValue.value }
      ]
    };
  });

  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityValue.value
    };
  });

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

  return (
    <View style={[
      styles.container, 
      task.completed && styles.completedContainer
    ]}>
      <View style={styles.swipeContainer}>
        {/* バックグラウンドのアクションボタン */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.pinAction]}
            onPress={handleTogglePin}
          >
            <MaterialIcons 
              name={task.isPinned ? "push-pin" : "push-pin"} 
              size={24} 
              color="#fff" 
            />
            <Text style={styles.actionText}>
              {task.isPinned ? "解除" : "ピン留め"}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteAction]}
            onPress={handleDelete}
          >
            <AntDesign name="delete" size={24} color="#fff" />
            <Text style={styles.actionText}>削除</Text>
          </TouchableOpacity>
        </View>
        
        {/* スワイプ可能なカード */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.card, animatedStyle]}>
            <TouchableOpacity 
              style={styles.contentSection}
              onPress={handlePress}
              activeOpacity={0.7}
            >
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
                
                {task.isPinned && (
                  <View style={styles.pinnedIndicator}>
                    <MaterialIcons name="push-pin" size={16} color="#FFD700" />
                  </View>
                )}
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
                {task.description}
              </Text>
              
              {/* カード下部 - 完了ボタンと完了回数 */}
              <View style={styles.cardFooter}>
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
            </TouchableOpacity>
            
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
        </GestureDetector>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 6,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  completedContainer: {
    opacity: 0.8,
    backgroundColor: '#f9f9f9',
  },
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 6,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    width: ACTION_BUTTON_WIDTH * 2,
  },
  actionButton: {
    width: ACTION_BUTTON_WIDTH,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinAction: {
    backgroundColor: '#4285F4',
  },
  deleteAction: {
    backgroundColor: '#EA4335',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 6,
    zIndex: 1,
  },
  contentSection: {
    padding: 12,
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
