import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Animated, Alert } from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { useAnimatedStyle, withTiming, Easing as ReEasing } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../../_ignore/types/_task';
import { useTheme } from '../../../../theme/index';
import { AnimatedButton } from '../../../../components/AnimatedComponents';
import { useTaskStore } from '../../../../store/tasks';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const CARD_WIDTH = SCREEN_WIDTH * 0.9;
// カードの高さを画面の50%に制限
const CARD_HEIGHT = SCREEN_HEIGHT * 0.5;

interface TaskCardProps {
  task: Task;
  gesture?: ReturnType<typeof Gesture.Pan> | undefined;
  animatedStyle?: any;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  gesture,
  animatedStyle,
}) => {
  const theme = useTheme();
  const { updateTask, togglePin, canPinMoreTasks } = useTaskStore();
  
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
  };

  // カードヘッダー部分の共通コンポーネント
  const renderCardHeader = () => (
    <View style={[styles.cardHeader, { borderBottomColor: theme.colors.borderLight }]}>
      <Text style={[styles.cardTitle, { color: theme.colors.text, fontFamily: theme.typography.fontFamily.bold }]} numberOfLines={1} ellipsizeMode="tail">
        {task?.title || ''}
      </Text>
      <TouchableOpacity
        style={[
          styles.pinButton,
          task.isPinned && { backgroundColor: `${theme.colors.primary}15` }
        ]}
        onPress={handleTogglePin}
        activeOpacity={0.7}
      >
        <MaterialIcons 
          name={task.isPinned ? "push-pin" : "bookmark-border"} 
          size={22} 
          color={task.isPinned ? theme.colors.primary : theme.colors.textTertiary} 
        />
      </TouchableOpacity>
    </View>
  );

  return gesture ? (
    <GestureDetector gesture={gesture}>
      <ReAnimated.View style={[animatedStyle]}>
        <Animated.View style={[
          styles.container, 
          cardShadow,
          { 
            backgroundColor: theme.colors.cardElevated,
            borderColor: theme.colors.borderLight,
          }
        ]}>
          {renderCardHeader()}
          
          {goal ? (
            <View style={[styles.goalContainer, { backgroundColor: theme.colors.primaryLight }]}>
              <Text style={[styles.goalLabel, { color: theme.colors.primary }]}>目標</Text>
              <Text style={[styles.goalText, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{goal}</Text>
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
        </Animated.View>
        {/* 右側のスライド示唆アイコン */}
        <View style={styles.slideIndicator}>
          <MaterialIcons name="chevron-right" size={24} color={theme.colors.textTertiary} />
        </View>
      </ReAnimated.View>
    </GestureDetector>
  ) : (
    <Animated.View style={[
      styles.container, 
      cardShadow,
      { 
        backgroundColor: theme.colors.cardElevated,
        borderColor: theme.colors.borderLight,
      }
    ]}>
      {renderCardHeader()}
      
      {goal ? (
        <View style={[styles.goalContainer, { backgroundColor: theme.colors.primaryLight }]}>
          <Text style={[styles.goalLabel, { color: theme.colors.primary }]}>目標</Text>
          <Text style={[styles.goalText, { color: theme.colors.text }]} numberOfLines={1} ellipsizeMode="tail">{goal}</Text>
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
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 4,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  goalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 8,
  },
  goalText: {
    fontSize: 13,
    flex: 1,
  },
  contentLabel: {
    fontSize: 13,
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
    fontSize: 13,
    marginBottom: 6,
    lineHeight: 18,
  },
  listItemContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 2,
  },
  bulletPoint: {
    fontSize: 13,
    width: 14,
  },
  numberPoint: {
    fontSize: 13,
    width: 22,
  },
  listItemText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
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
    paddingBottom: 4,
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
  slideIndicator: {
    position: 'absolute',
    right: -12,
    top: '50%',
    transform: [{ translateY: -12 }],
    backgroundColor: '#FFFFFF',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 10,
  },
  pinButton: {
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
});

export default TaskCard;
