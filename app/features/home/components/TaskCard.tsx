import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { useAnimatedStyle, withTiming, Easing as ReEasing } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../types/task';
import { useTheme } from '../../../theme/index';
import { AnimatedButton } from '../../../components/AnimatedComponents';
import { useTaskStore } from '../../../store/tasks';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
// カードの高さを画面の50%に制限
const CARD_HEIGHT = SCREEN_HEIGHT * 0.5;

interface TaskCardProps {
  task: Task;
  gesture: ReturnType<typeof Gesture.Pan>;
  animatedStyle: any;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  gesture,
  animatedStyle,
}) => {
  const theme = useTheme();
  const { updateTask } = useTaskStore();
  
  // カードのシャドウアニメーション
  const shadowAnim = new Animated.Value(0);
  
  useEffect(() => {
    // カードが表示されるときのアニメーション
    Animated.sequence([
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      })
    ]).start();
  }, []);
  
  const cardShadow = {
    shadowOpacity: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 0.15],
    }),
    shadowRadius: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 12],
    }),
    elevation: shadowAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 8],
    }),
  };

  const navigateToTaskDetail = (taskId: string) => {
    router.push({
      pathname: '/task-detail',
      params: { id: taskId }
    });
  };

  // 期日設定ボタンのハンドラー
  const handleSetDueDate = () => {
    router.push({
      pathname: '/task-form',
      params: { id: task?.id, mode: 'edit' }
    });
  };

  // マークダウン形式のテキストを解析して表示する関数
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    // 行ごとに分割
    const lines = text.split('\n');
    
    return lines.map((line, index) => {
      // 見出し (##)
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={[styles.heading, { color: theme.colors.text }]}>
            {line.substring(3)}
          </Text>
        );
      }
      // リスト項目 (- または数字.)
      else if (line.match(/^- /)) {
        return (
          <View key={index} style={styles.listItemContainer}>
            <Text style={[styles.bulletPoint, { color: theme.colors.primary }]}>•</Text>
            <Text style={[styles.listItemText, { color: theme.colors.textSecondary }]}>{line.substring(2)}</Text>
          </View>
        );
      }
      else if (line.match(/^\d+\. /)) {
        const number = line.match(/^\d+/)?.[0] || '';
        return (
          <View key={index} style={styles.listItemContainer}>
            <Text style={[styles.numberPoint, { color: theme.colors.primary }]}>{number}.</Text>
            <Text style={[styles.listItemText, { color: theme.colors.textSecondary }]}>{line.substring(number.length + 2)}</Text>
          </View>
        );
      }
      // 区切り線 (---)
      else if (line.match(/^---+$/)) {
        return <View key={index} style={[styles.divider, { backgroundColor: theme.colors.border }]} />;
      }
      // 通常のテキスト
      else {
        return (
          <Text key={index} style={[styles.paragraph, { color: theme.colors.textSecondary }]}>
            {line}
          </Text>
        );
      }
    });
  };

  // 目標と練習内容を分離する
  const extractGoalAndContent = (description: string) => {
    if (!description) return { goal: '', content: '' };
    
    const lines = description.split('\n');
    let goal = '';
    let content = '';
    
    // 目標を探す（「目標」や「ゴール」という単語を含む行）
    const goalIndex = lines.findIndex(line => 
      line.includes('目標') || line.includes('ゴール') || line.toLowerCase().includes('goal')
    );
    
    if (goalIndex !== -1) {
      goal = lines[goalIndex].replace(/目標[:：]|ゴール[:：]|goal[:：]/i, '').trim();
      // 目標行を除いた残りを練習内容とする
      content = lines.filter((_, i) => i !== goalIndex).join('\n');
    } else {
      // 目標が明示されていない場合は、最初の行を目標として扱う
      if (lines.length > 0) {
        goal = lines[0];
        content = lines.slice(1).join('\n');
      } else {
        content = description;
      }
    }
    
    return { goal, content };
  };
  
  const { goal, content } = extractGoalAndContent(task?.description || '');

  return (
    <GestureDetector gesture={gesture}>
      <ReAnimated.View style={[animatedStyle]}>
        <Animated.View style={[
          styles.card, 
          cardShadow,
          { 
            backgroundColor: theme.colors.cardElevated,
            borderColor: theme.colors.borderLight,
          }
        ]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
            <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold }]} numberOfLines={1} ellipsizeMode="tail">
              今日の課題: {task?.title || ''}
            </Text>
          </View>
          
          {goal ? (
            <View style={[styles.goalContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.goalLabel, { color: theme.colors.primary }]}>目標</Text>
              <Text style={[styles.goalText, { color: theme.colors.text }]}>{goal}</Text>
            </View>
          ) : null}
          
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.contentLabel, { color: theme.colors.primary }]}>練習内容</Text>
            {renderFormattedText(content)}
            
            {/* AIワンポイントアドバイス（予定） */}
            <View style={[styles.aiAdviceContainer, { backgroundColor: theme.colors.secondaryLight }]}>
              <View style={styles.aiAdviceHeader}>
                <Ionicons name="bulb-outline" size={18} color={theme.colors.secondary} />
                <Text style={[styles.aiAdviceLabel, { color: theme.colors.secondary }]}>AIワンポイントアドバイス</Text>
              </View>
              <Text style={[styles.aiAdviceText, { color: theme.colors.textSecondary }]}>
                今後実装予定の機能です。AIがあなたの練習をサポートします。
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.cardFooter}>
            <View style={styles.buttonContainer}>
              <AnimatedButton 
                title="詳細を見る"
                onPress={() => navigateToTaskDetail(task?.id || '')}
                style={{ backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}
                textStyle={styles.buttonText}
                activeScale={0.95}
              />
              
              <AnimatedButton 
                title="期日設定"
                onPress={handleSetDueDate}
                style={{ backgroundColor: theme.colors.secondary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginLeft: 8 }}
                textStyle={styles.buttonText}
                activeScale={0.95}
              />
            </View>
          </View>
          
          {/* スワイプヒントのインジケーター */}
          <View style={styles.swipeIndicatorContainer}>
            <View style={styles.swipeIndicatorWrapper}>
              <MaterialIcons name="swipe" size={20} color={theme.colors.textTertiary} />
              <Text style={[styles.swipeIndicatorText, { color: theme.colors.textTertiary }]}>
                スワイプして次のタスクを表示
              </Text>
            </View>
          </View>
        </Animated.View>
      </ReAnimated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    borderWidth: 1,
    marginHorizontal: SCREEN_WIDTH * 0.05,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  goalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  goalText: {
    fontSize: 15,
    lineHeight: 22,
  },
  contentLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  scrollContainer: {
    flex: 1,
  },
  cardContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  heading: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    marginBottom: 8,
    lineHeight: 22,
  },
  listItemContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 2,
  },
  bulletPoint: {
    fontSize: 15,
    width: 14,
  },
  numberPoint: {
    fontSize: 15,
    width: 22,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 14,
    marginLeft: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  swipeIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 4,
    alignItems: 'center',
  },
  swipeIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  swipeIndicatorText: {
    fontSize: 12,
    marginLeft: 4,
  },
  aiAdviceContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  aiAdviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiAdviceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  aiAdviceText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default TaskCard;
