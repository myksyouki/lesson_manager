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
  completionCount?: number; // 累積達成回数
  category?: string; // タスクのカテゴリ
  onComplete?: () => void; // タスク完了時のコールバック
}

const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  index = 0,
  completionCount = 0,
  category = '',
  onComplete
}) => {
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
    completed: '#F1F3F4', // 完了タスクの背景色
    completedBorder: '#E0E0E0', // 完了タスクのボーダー色
  };
  
  // タスクが完了しているかどうか
  const isCompleted = task.completed || task.isCompleted;
  
  // タスクの詳細ページに移動
  const handlePress = () => {
    // タスクが完了していない場合は詳細ページに遷移
    if (!isCompleted) {
      try {
        router.push({
          pathname: '/task-detail',
          params: { id: task.id }
        });
      } catch (error) {
        console.error('ナビゲーションエラー:', error);
        // フォールバック: 単純なパスのみを使用
        router.push('/task-detail');
      }
    } else if (onComplete) {
      // タスクが完了している場合はコールバックを実行
      onComplete();
    }
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
  
  // カテゴリに応じた色を返す
  const getCategoryColor = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'ロングトーン':
        return '#8E24AA'; // パープル
      case 'スケール':
        return '#D81B60'; // ピンク
      case 'テクニック':
        return '#F57C00'; // オレンジ
      case '曲練習':
        return '#43A047'; // グリーン
      case 'リズム':
        return '#1E88E5'; // ブルー
      case '表現':
        return '#00ACC1'; // シアン
      case 'ペダル':
        return '#7CB342'; // ライトグリーン
      case '音色':
        return '#5E35B1'; // ディープパープル
      case '強弱':
        return '#039BE5'; // ライトブルー
      default:
        return colors.primary;
    }
  };
  
  // カテゴリに応じたアイコンを返す
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName.toLowerCase()) {
      case 'ロングトーン':
        return 'music-note' as const;
      case 'スケール':
        return 'piano' as const;
      case 'テクニック':
        return 'build' as const;
      case '曲練習':
        return 'library-music' as const;
      case 'リズム':
        return 'timer' as const;
      case '表現':
        return 'brush' as const;
      case 'ペダル':
        return 'settings' as const;
      case '音色':
        return 'graphic-eq' as const;
      case '強弱':
        return 'trending-up' as const;
      default:
        return 'assignment' as const;
    }
  };

  // タスクのカテゴリを取得
  const taskCategory = category || (task.tags && task.tags.length > 0 ? task.tags[0] : '');
  
  // カテゴリの色を取得
  const categoryColor = getCategoryColor(taskCategory);

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(400)}
      style={styles.container}
    >
      <RippleButton
        style={[
          styles.card,
          isCompleted && { backgroundColor: colors.completed, borderColor: colors.completedBorder }
        ]}
        onPress={handlePress}
        rippleColor={colors.ripple}
      >
        <View 
          style={[
            styles.leftSection, 
            { backgroundColor: isCompleted ? 'transparent' : 'transparent' }
          ]}
        >
          <View 
            style={[
              styles.statusIndicator, 
              { backgroundColor: isCompleted ? colors.success : categoryColor }
            ]} 
          />
        </View>
        
        <View style={styles.contentSection}>
          <View style={styles.titleRow}>
            <Text 
              style={[
                styles.title, 
                { color: isCompleted ? colors.textSecondary : colors.text },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {task.title}
            </Text>
            
            {isCompleted && (
              <View style={styles.completedBadge}>
                <MaterialIcons name={"check-circle" as const} size={14} color={colors.success} />
                <Text style={styles.completedText}>完了済</Text>
              </View>
            )}
          </View>
          
          <View style={styles.detailsRow}>
            <View style={styles.tagContainer}>
              {taskCategory ? (
                <View style={[
                  styles.categoryTag, 
                  { backgroundColor: categoryColor + '20' }
                ]}>
                  <MaterialIcons 
                    name={getCategoryIcon(taskCategory)} 
                    size={12} 
                    color={categoryColor} 
                  />
                  <Text 
                    style={[styles.categoryText, { color: categoryColor }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {taskCategory}
                  </Text>
                </View>
              ) : null}
              
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
            
            <Text 
              style={[styles.date, { color: colors.textTertiary }]}
              numberOfLines={1}
            >
              {isCompleted ? '完了日: ' : '期限: '}
              {task.dueDate ? (
                typeof task.dueDate === 'string' 
                  ? task.dueDate 
                  : formatDate(task.dueDate)
              ) : '期限なし'}
            </Text>
          </View>
          
          {isCompleted && completionCount > 0 && (
            <View style={styles.completionCountRow}>
              <Text 
                style={styles.completionCountText}
                numberOfLines={1}
              >
                累積達成: {completionCount}回
              </Text>
              {taskCategory && (
                <Text 
                  style={[styles.categoryCountText, { color: categoryColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  カテゴリ: {taskCategory}
                </Text>
              )}
            </View>
          )}
        </View>
        
        <View style={styles.rightSection}>
          <MaterialIcons 
            name={"chevron-right" as const} 
            size={20} 
            color={colors.textTertiary} 
          />
        </View>
      </RippleButton>
    </Animated.View>
  );
};

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
    height: 90, // 固定の高さを設定
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    flexDirection: 'row',
    borderRadius: 10,
    alignItems: 'center',
    height: 90, // 固定の高さを設定
    borderWidth: 1,
    borderColor: 'transparent',
  },
  leftSection: {
    width: 8,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  statusIndicator: {
    width: 3,
    height: '80%',
    borderRadius: 1.5,
  },
  contentSection: {
    flex: 1,
    padding: 12,
    paddingLeft: 10,
    justifyContent: 'center', // 中央揃えに変更
    height: '100%', // 高さを100%に設定
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  completedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#34A853',
    marginLeft: 2,
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
    maxWidth: '60%', // 最大幅を制限
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginRight: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
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
  completionCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
  },
  completionCountText: {
    fontSize: 11,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskCard;
