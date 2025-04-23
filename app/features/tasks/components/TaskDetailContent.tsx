import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Dimensions, Image } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Task } from '../../../../types/_task';
import { useTaskStore } from '../../../../store/tasks';
import { CalendarModal } from '../../../features/lessons/components/form/CalendarModal';
import { useCalendar, DAYS } from '../../../../hooks/useCalendar';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

interface TaskDetailContentProps {
  task: Task;
  loading: boolean;
  chatRoomTitle: string | null;
  onOpenChatRoom: () => void;
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  loading,
  chatRoomTitle,
  onOpenChatRoom,
}) => {
  const { updateTask } = useTaskStore();
  
  // 初期日付の設定
  const initialDate = task.practiceDate 
    ? typeof task.practiceDate === 'string' 
      ? new Date(task.practiceDate) 
      : 'seconds' in (task.practiceDate as any) 
        ? new Date((task.practiceDate as any).seconds * 1000) 
        : task.practiceDate as Date
    : new Date();

  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(initialDate, (date) => {
    // タスクを更新
    updateTask(task.id, {
      practiceDate: date
    });
  });

  // 日付をフォーマットする関数
  const formatTaskDate = (date: Date | string | { seconds: number; nanoseconds: number } | null | undefined) => {
    if (!date) return '設定なし';
    
    if (typeof date === 'string') {
      return date;
    }
    
    if ('seconds' in (date as any)) {
      const timestamp = (date as any).seconds * 1000;
      const dateObj = new Date(timestamp);
      return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
    }
    
    const dateObj = date as Date;
    return `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;
  };

  // 楽譜データの取得
  const sheetMusicUrl = task.attachments?.find(
    (att: any) => att.type === 'image' && att.format === 'image/jpeg'
  )?.url || null;

  // 練習ステップを解析
  const practiceSteps = task.steps || [];

  return (
    <>
      <View style={styles.container}>
        {/* 練習内容・目標セクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>練習内容・目標</Text>
          <Text style={styles.description}>{task.description || '詳細はありません'}</Text>
        </View>
        
        {/* 練習ステップセクション */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>練習ステップ</Text>
          <View style={styles.stepsContainer}>
            {practiceSteps.map((step: any, index: number) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepNumberContainer}>
                  <Text style={styles.stepNumber}>{index + 1}</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                  {step.duration && (
                    <View style={styles.stepDuration}>
                      <MaterialIcons name="timer" size={14} color="#4285F4" />
                      <Text style={styles.stepDurationText}>{step.duration}分</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
        
        {/* 楽譜セクション */}
        {sheetMusicUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>楽譜</Text>
            <View style={styles.sheetMusicContainer}>
              <Image 
                source={{ uri: sheetMusicUrl }}
                style={styles.sheetMusicPreview}
                resizeMode="contain"
              />
              <Text style={styles.sheetMusicNote}>
                練習ツールセクションで楽譜を拡大表示できます
              </Text>
            </View>
          </View>
        )}
        
        {/* 練習予定日セクション */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>練習予定日</Text>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => setShowCalendar(true)}
            >
              <MaterialIcons name="edit" size={18} color="#4285F4" />
              <Text style={styles.editButtonText}>変更</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>
            {task.practiceDate ? formatTaskDate(task.practiceDate) : '設定なし'}
          </Text>
        </View>
        
        {/* カテゴリセクション */}
        {task.tags && task.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>カテゴリ</Text>
            <View style={styles.tagsContainer}>
              {task.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        
        {/* 優先度セクション */}
        {task.priority && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>優先度</Text>
            <Text style={styles.infoText}>{task.priority}</Text>
          </View>
        )}
        
        {/* AIレッスンセクション */}
        {chatRoomTitle && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AIレッスン</Text>
            <TouchableOpacity style={styles.chatRoomButton} onPress={onOpenChatRoom}>
              <Text style={styles.chatRoomTitle}>{chatRoomTitle}</Text>
              <Ionicons name="chevron-forward" size={20} color="#4285F4" />
            </TouchableOpacity>
          </View>
        )}
        
        {/* ローディング表示 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#4285F4" />
            <Text style={styles.loadingText}>関連データを読み込み中...</Text>
          </View>
        )}
      </View>
      
      {/* カレンダーモーダル */}
      <CalendarModal
        isVisible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={selectedDate}
        onDateSelect={(date, formattedDate) => handleDateSelect(date)}
        practiceDate={initialDate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // スワイプボタンのスペースを確保
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#5F6368',
    lineHeight: 24,
  },
  infoText: {
    fontSize: 16,
    color: '#5F6368',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
  },
  chatRoomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F1F3F4',
    padding: 12,
    borderRadius: 8,
  },
  chatRoomTitle: {
    fontSize: 16,
    color: '#202124',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingText: {
    marginLeft: 8,
    color: '#5F6368',
    fontSize: 14,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  editButtonText: {
    color: '#4285F4',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  // 練習ステップ関連スタイル
  stepsContainer: {
    marginTop: 8,
  },
  stepItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#202124',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#5F6368',
    lineHeight: 20,
    marginBottom: 8,
  },
  stepDuration: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDurationText: {
    fontSize: 14,
    color: '#4285F4',
    marginLeft: 4,
  },
  // 楽譜関連スタイル
  sheetMusicContainer: {
    alignItems: 'center',
  },
  sheetMusicPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  sheetMusicNote: {
    fontSize: 14,
    color: '#5F6368',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default TaskDetailContent;
