import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import Animated from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Task } from '../../../types/task';

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
          <Text key={index} style={styles.heading}>
            {line.substring(3)}
          </Text>
        );
      }
      // リスト項目 (- または数字.)
      else if (line.match(/^- /)) {
        return (
          <View key={index} style={styles.listItemContainer}>
            <Text style={styles.bulletPoint}>•</Text>
            <Text style={styles.listItemText}>{line.substring(2)}</Text>
          </View>
        );
      }
      else if (line.match(/^\d+\. /)) {
        const number = line.match(/^\d+/)?.[0] || '';
        return (
          <View key={index} style={styles.listItemContainer}>
            <Text style={styles.numberPoint}>{number}.</Text>
            <Text style={styles.listItemText}>{line.substring(number.length + 2)}</Text>
          </View>
        );
      }
      // 区切り線 (---)
      else if (line.match(/^---+$/)) {
        return <View key={index} style={styles.divider} />;
      }
      // 通常のテキスト
      else {
        return (
          <Text key={index} style={styles.paragraph}>
            {line}
          </Text>
        );
      }
    });
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
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
            <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
            <Text style={styles.cardDate}>{task?.dueDate || '期日未設定'}</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.viewDetailButton}
            onPress={() => navigateToTaskDetail(task?.id || '')}
          >
            <Text style={styles.viewDetailButtonText}>詳細を見る</Text>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT, // 高さを制限
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    marginHorizontal: SCREEN_WIDTH * 0.05,
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    color: '#1C1C1E',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  paragraph: {
    fontSize: 15,
    color: '#3C3C43',
    marginBottom: 8,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  listItemContainer: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 2,
  },
  bulletPoint: {
    fontSize: 15,
    color: '#3C3C43',
    width: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  numberPoint: {
    fontSize: 15,
    color: '#3C3C43',
    width: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: '#3C3C43',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  viewDetailButton: {
    backgroundColor: '#1a73e8',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default TaskCard;
