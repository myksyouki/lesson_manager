/**
 * タスクカードコンポーネント
 * 
 * ホーム画面やタスクリストで表示される個々のタスクカードを提供します。
 * AIから生成された練習メニューの特別表示も対応します。
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Task } from '../../_ignore/types/_task';

// 型定義
interface TaskCardProps {
  task: Task;
}

// 定数
const COLORS = {
  AI_INDICATOR: '#007AFF',
  COMPLETED: '#34C759',
  UNCOMPLETED: '#8E8E93',
  TEXT_PRIMARY: '#1C1C1E',
  TEXT_SECONDARY: '#636366',
  TEXT_TERTIARY: '#8E8E93',
  CARD_BACKGROUND: '#ffffff',
  AI_CARD_BACKGROUND: '#FAFCFF',
};

/**
 * タスクカードコンポーネント
 */
export default function TaskCard({ task }: TaskCardProps) {
  /**
   * タスクの詳細画面へ移動
   */
  const handlePress = () => {
    router.push({
      pathname: '/task-detail',
      params: { id: task.id },
    });
  };

  // AIから生成された練習メニューかどうかを判定
  const isAIPracticeMenu = isAIGeneratedTask(task);

  return (
    <TouchableOpacity 
      style={[styles.taskCard, isAIPracticeMenu && styles.aiTaskCard]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {renderAIIndicator(isAIPracticeMenu)}
      {renderCardHeader(task)}
      {renderTaskDescription(task)}
      {renderDueDate(task)}
    </TouchableOpacity>
  );
}

/**
 * AI生成タスクの判定
 */
function isAIGeneratedTask(task: Task): boolean {
  return task.attachments?.some(att => 
    att.type === 'text' && att.url.startsWith('/chatRooms/')
  ) || false;
}

/**
 * AI生成タスクの表示
 */
function renderAIIndicator(isAIPracticeMenu: boolean) {
  if (!isAIPracticeMenu) return null;
  
  return (
    <View style={styles.aiIndicator}>
      <Ionicons name="musical-notes-outline" size={16} color={COLORS.AI_INDICATOR} />
      <Text style={styles.aiIndicatorText}>AI練習メニュー</Text>
    </View>
  );
}

/**
 * カードヘッダーの表示（タイトルとチェックボックス）
 */
function renderCardHeader(task: Task) {
  return (
    <View style={styles.cardHeader}>
      <Text style={styles.taskTitle}>{task.title}</Text>
      <MaterialIcons 
        name={task.isCompleted ? "check-circle" : "radio-button-unchecked"} 
        size={24} 
        color={task.isCompleted ? COLORS.COMPLETED : COLORS.UNCOMPLETED} 
      />
    </View>
  );
}

/**
 * タスク説明の表示
 */
function renderTaskDescription(task: Task) {
  return (
    <Text style={styles.taskDescription} numberOfLines={2} ellipsizeMode="tail">
      {task.description}
    </Text>
  );
}

/**
 * 期日の表示
 */
function renderDueDate(task: Task) {
  return (
    <Text style={styles.taskDueDate}>
      期日: {typeof task.dueDate === 'string' ? task.dueDate : ''}
    </Text>
  );
}

/**
 * スタイル
 */
const styles = StyleSheet.create({
  taskCard: {
    backgroundColor: COLORS.CARD_BACKGROUND,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  aiTaskCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.AI_INDICATOR,
    backgroundColor: COLORS.AI_CARD_BACKGROUND,
  },
  aiIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiIndicatorText: {
    fontSize: 12,
    color: COLORS.AI_INDICATOR,
    marginLeft: 4,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.TEXT_PRIMARY,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskDescription: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskDueDate: {
    fontSize: 13,
    color: COLORS.TEXT_TERTIARY,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});
