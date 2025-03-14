import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView, Animated } from 'react-native';
import { router } from 'expo-router';
import ReAnimated, { useAnimatedStyle, withTiming, Easing as ReEasing } from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../types/task';
import { useTheme } from '../../../theme/index';
import { AnimatedButton } from '../../../components/AnimatedComponents';

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
              {task?.title || ''}
            </Text>
          </View>
          
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.cardContent}
            showsVerticalScrollIndicator={false}
          >
            {renderFormattedText(task?.description || '')}
          </ScrollView>
          
          <View style={styles.cardFooter}>
            <View style={styles.dateContainer}>
              <MaterialIcons name="event" size={18} color={theme.colors.primary} />
              <Text style={[styles.cardDate, { color: theme.colors.textSecondary }]}>
                {task?.dueDate || '期日未設定'}
              </Text>
            </View>
            
            <AnimatedButton 
              title="詳細を見る"
              onPress={() => navigateToTaskDetail(task?.id || '')}
              style={{ backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 }}
              textStyle={styles.viewDetailButtonText}
              activeScale={0.95}
            />
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
    justifyContent: 'space-between',
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
  viewDetailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewDetailButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  swipeIndicatorContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 4,
  },
  swipeIndicatorWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  swipeIndicatorText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default TaskCard;
