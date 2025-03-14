import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Task } from '../../../types/task';
import Animated, { FadeIn } from 'react-native-reanimated';
import { RippleButton } from '../../../components/RippleButton';

interface TaskCardProps {
  task: Task;
  index?: number;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, index = 0 }) => {
  // テーマの色を直接定義
  const colors = {
    primary: '#4285F4',
    primaryLight: '#8AB4F8',
    success: '#34A853',
    warning: '#FBBC05',
    error: '#EA4335',
    text: '#202124',
    textSecondary: '#5F6368',
    textTertiary: '#9AA0A6',
    textInverse: '#FFFFFF',
    ripple: 'rgba(66, 133, 244, 0.12)',
  };
  
  // 完了状態に応じたスタイルを返す
  const getCompletedStyle = () => {
    return (task.completed || task.isCompleted) ? { 
      opacity: 0.7,
      textDecorationLine: 'line-through' as const
    } : {};
  };

  // タスクの詳細ページに移動
  const handlePress = () => {
    router.push({
      pathname: '/task-detail',
      params: { id: task.id }
    });
  };

  // 日付のフォーマット
  const formatDate = (date: Date | { seconds: number; nanoseconds: number }) => {
    if (date instanceof Date) {
      return date.toLocaleDateString('ja-JP');
    }
    return new Date(date.seconds * 1000).toLocaleDateString('ja-JP');
  };

  // 優先度に応じた色を返す
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case '高':
        return colors.error;
      case '中':
        return colors.warning;
      case '低':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  // スタイル定義の前に色を定義
  const cardElevatedColor = '#FFFFFF';

  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 12,
      marginVertical: 6,
      borderRadius: 10,
      shadowColor: 'rgba(0, 0, 0, 0.08)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.6,
      shadowRadius: 3,
      elevation: 2,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: cardElevatedColor,
      width: '100%',
      flexDirection: 'row',
      borderRadius: 10,
      alignItems: 'center',
      height: 70, // カードの高さを指定
    },
    leftSection: {
      width: 8,
      height: '100%', // 高さを100%に変更
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    statusIndicator: {
      width: 3,
      height: '100%', // 高さを100%に変更
      borderRadius: 1.5,
    },
    contentSection: {
      flex: 1,
      padding: 12,
      paddingLeft: 10,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      marginBottom: 6,
      fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    tagContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    tag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
      marginRight: 6,
    },
    tagText: {
      fontSize: 11,
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    },
    priorityTag: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 8,
    },
    priorityText: {
      fontSize: 11,
      fontWeight: '500',
      fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    },
    date: {
      fontSize: 11,
      fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    },
    rightSection: {
      justifyContent: 'center',
      paddingRight: 12,
    },
  });

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <RippleButton
        style={styles.card}
        onPress={handlePress}
        rippleColor={colors.ripple}
      >
        <View style={styles.leftSection}>
          <View style={[styles.statusIndicator, { 
            backgroundColor: (task.completed || task.isCompleted) ? colors.success : colors.primary 
          }]} />
        </View>
        
        <View style={styles.contentSection}>
          <Text 
            style={[
              styles.title, 
              { color: colors.text },
              getCompletedStyle()
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          
          <View style={styles.detailsRow}>
            <View style={styles.tagContainer}>
              {task.tags && task.tags.length > 0 && (
                <View style={[
                  styles.tag, 
                  { backgroundColor: colors.primaryLight }
                ]}>
                  <Text style={[styles.tagText, { color: colors.textInverse }]}>
                    {task.tags[0]}
                  </Text>
                </View>
              )}
              
              {task.priority && (
                <View style={[
                  styles.priorityTag, 
                  { backgroundColor: getPriorityColor(task.priority) + '20' }
                ]}>
                  <Text style={[
                    styles.priorityText, 
                    { color: getPriorityColor(task.priority) }
                  ]}>
                    {task.priority}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.date, { color: colors.textTertiary }]}>
              {task.dueDate ? (
                typeof task.dueDate === 'string' 
                  ? task.dueDate 
                  : formatDate(task.dueDate)
              ) : '期限なし'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rightSection}>
          <MaterialIcons 
            name="chevron-right" 
            size={20} 
            color={colors.textTertiary} 
          />
        </View>
      </RippleButton>
    </Animated.View>
  );
};

export default TaskCard;
