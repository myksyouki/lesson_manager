import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task } from '../../../types/task';
import { useTaskStore } from '../../../store/tasks';

interface TaskCardProps {
  task: Task;
  onToggleComplete?: (id: string) => void;
  showAnimation?: boolean;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onToggleComplete, showAnimation = false }) => {
  const router = useRouter();
  const { getTaskCompletionCount } = useTaskStore();
  const [completionCount, setCompletionCount] = useState(0);
  const [showCompletionAnimation, setShowCompletionAnimation] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // タスクの完了回数を取得
    const count = getTaskCompletionCount(task.title);
    setCompletionCount(count);
  }, [task, getTaskCompletionCount]);

  useEffect(() => {
    // タスクが完了状態になった場合にアニメーションを表示
    if (showAnimation && task.completed) {
      setShowCompletionAnimation(true);
      
      // アニメーションを実行
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // 3秒後にアニメーションを非表示
        setTimeout(() => {
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowCompletionAnimation(false);
          });
        }, 3000);
      });
    }
  }, [task.completed, showAnimation]);

  const handlePress = () => {
    router.push(`/task-detail?id=${task.id}`);
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

  return (
    <Animated.View 
      style={[
        styles.container, 
        task.completed && styles.completedContainer,
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity 
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          {getCategoryIcon()}
        </View>
        
        <View style={styles.middleSection}>
          <Text 
            style={[
              styles.title, 
              task.completed && styles.completedTitle
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          
          <Text 
            style={[
              styles.description, 
              task.completed && styles.completedDescription
            ]}
            numberOfLines={2}
          >
            {task.description}
          </Text>
          
          {task.dueDate && (
            <View style={styles.dueDateContainer}>
              <Ionicons name="calendar-outline" size={14} color={task.completed ? '#aaa' : '#666'} />
              <Text style={[styles.dueDate, task.completed && styles.completedDueDate]}>
                {typeof task.dueDate === 'string' 
                  ? task.dueDate 
                  : typeof task.dueDate === 'object' && 'seconds' in task.dueDate
                    ? new Date(task.dueDate.seconds * 1000).toLocaleDateString('ja-JP')
                    : task.dueDate instanceof Date
                      ? task.dueDate.toLocaleDateString('ja-JP')
                      : '期限なし'
                }
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.rightSection}>
          {completionCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: `${categoryColor}20` }]}>
              <Text style={[styles.countText, { color: categoryColor }]}>
                {completionCount}回
              </Text>
            </View>
          )}
          
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
        </View>
        
        {showCompletionAnimation && (
          <Animated.View 
            style={[
              styles.completionAnimation,
              { opacity: opacityAnim }
            ]}
          >
            <View style={[styles.completionBadge, { backgroundColor: categoryColor }]}>
              <Ionicons name="checkmark" size={16} color="white" />
              <Text style={styles.completionText}>完了！</Text>
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  completedContainer: {
    opacity: 0.8,
    backgroundColor: '#f9f9f9',
  },
  card: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
  },
  leftSection: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
  },
  rightSection: {
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingLeft: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  completedTitle: {
    color: '#888',
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  completedDescription: {
    color: '#aaa',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dueDate: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  completedDueDate: {
    color: '#aaa',
  },
  checkButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  completionAnimation: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
  },
  completionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  completionText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default TaskCard;
