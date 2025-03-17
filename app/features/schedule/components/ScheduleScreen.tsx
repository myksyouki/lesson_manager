import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useLessonStore, Lesson } from '../../../store/lessons';
import { useTaskStore } from '../../../store/tasks';
import { Task } from '../../../types/task';
import { auth } from '../../../config/firebase';
import { CalendarHeader, CalendarGrid } from './';
import { Ionicons } from '@expo/vector-icons';

const colors = {
  primary: '#4285F4',
  primaryLight: '#8AB4F8',
  secondary: '#34A853',
  error: '#EA4335',
  warning: '#FBBC05',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  textPrimary: '#202124',
  textSecondary: '#5F6368',
  textTertiary: '#9AA0A6',
  divider: '#DADCE0',
};

// アイテムの型定義
interface ScheduleItem {
  id: string;
  type: 'calendar' | 'dateTitle' | 'lessonHeader' | 'lesson' | 'taskHeader' | 'task' | 'empty';
  data?: any;
}

export const ScheduleScreen = observer(() => {
  const navigation = useNavigation<any>();
  const lessonStore = useLessonStore();
  const taskStore = useTaskStore();
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (userId) {
      lessonStore.fetchLessons(userId);
      taskStore.fetchTasks(userId);
    }
  }, []);
  
  const handleMonthChange = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  // 選択された日付のレッスンを取得
  const getSelectedDateLessons = () => {
    const formatDate = (d: Date) => {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };
    
    const formattedSelectedDate = formatDate(selectedDate);
    
    return lessonStore.lessons.filter(lesson => {
      // レッスンの日付が文字列形式の場合の処理
      if (typeof lesson.date === 'string') {
        // 直接比較
        if (lesson.date === formattedSelectedDate) {
          return true;
        }
        
        // 日付形式が異なる可能性があるため、日付オブジェクトに変換して比較
        try {
          // "YYYY年MM月DD日" 形式の文字列をパース
          const dateParts = lesson.date.match(/(\d+)年(\d+)月(\d+)日/);
          if (dateParts) {
            const lessonDate = new Date(
              parseInt(dateParts[1]), // 年
              parseInt(dateParts[2]) - 1, // 月（0-11）
              parseInt(dateParts[3]) // 日
            );
            
            return (
              lessonDate.getFullYear() === selectedDate.getFullYear() &&
              lessonDate.getMonth() === selectedDate.getMonth() &&
              lessonDate.getDate() === selectedDate.getDate()
            );
          }
        } catch (e) {
          console.error('日付のパースエラー:', e);
        }
      }
      
      return false;
    });
  };
  
  // 選択された日付のタスク（練習日）を取得
  const getSelectedDateTasks = () => {
    const formatDate = (d: Date) => {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };
    
    const formattedSelectedDate = formatDate(selectedDate);
    
    return taskStore.tasks.filter(task => {
      if (!task.practiceDate) return false;
      
      // 練習日の形式に応じて比較
      if (typeof task.practiceDate === 'string') {
        // 文字列形式の場合
        if (task.practiceDate === formattedSelectedDate) {
          return true;
        }
        
        // 日付形式が異なる可能性があるため、日付オブジェクトに変換して比較
        try {
          // "YYYY年MM月DD日" 形式の文字列をパース
          const dateParts = task.practiceDate.match(/(\d+)年(\d+)月(\d+)日/);
          if (dateParts) {
            const practiceDate = new Date(
              parseInt(dateParts[1]), // 年
              parseInt(dateParts[2]) - 1, // 月（0-11）
              parseInt(dateParts[3]) // 日
            );
            
            return (
              practiceDate.getFullYear() === selectedDate.getFullYear() &&
              practiceDate.getMonth() === selectedDate.getMonth() &&
              practiceDate.getDate() === selectedDate.getDate()
            );
          }
        } catch (e) {
          console.error('日付のパースエラー:', e);
        }
      } else if ('seconds' in (task.practiceDate as any)) {
        // Firestore Timestamp形式の場合
        const timestamp = (task.practiceDate as any).seconds * 1000;
        const practiceDate = new Date(timestamp);
        
        return (
          practiceDate.getFullYear() === selectedDate.getFullYear() &&
          practiceDate.getMonth() === selectedDate.getMonth() &&
          practiceDate.getDate() === selectedDate.getDate()
        );
      } else if (task.practiceDate instanceof Date) {
        // Date型の場合
        const practiceDate = task.practiceDate as Date;
        
        return (
          practiceDate.getFullYear() === selectedDate.getFullYear() &&
          practiceDate.getMonth() === selectedDate.getMonth() &&
          practiceDate.getDate() === selectedDate.getDate()
        );
      }
      
      return false;
    });
  };
  
  const selectedDateLessons = getSelectedDateLessons();
  const selectedDateTasks = getSelectedDateTasks();

  // タスクアイテムをレンダリングする関数
  const renderTaskItem = (task: Task) => (
    <TouchableOpacity 
      key={task.id}
      style={styles.taskItem}
      onPress={() => {
        navigation.navigate('TaskDetail', { taskId: task.id });
      }}
    >
      <Text style={styles.taskTitle}>{task.title}</Text>
      <Text style={styles.taskDescription} numberOfLines={2}>
        {task.description}
      </Text>
    </TouchableOpacity>
  );

  // レッスンアイテムをレンダリングする関数
  const renderLessonItem = (lesson: Lesson) => (
    <TouchableOpacity
      key={lesson.id}
      style={styles.lessonItem}
      onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
    >
      <View style={styles.contentContainer}>
        <Text style={styles.titleText}>{lesson.summary}</Text>
        {lesson.teacher && (
          <Text style={styles.teacherText}>講師: {lesson.teacher}</Text>
        )}
        {lesson.pieces && lesson.pieces.length > 0 && (
          <Text style={styles.piecesText}>
            曲目: {lesson.pieces.join(', ')}
          </Text>
        )}
        {lesson.tags && lesson.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {lesson.tags.map((tag, index) => (
              <View key={index} style={styles.tagItem}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  // FlatListのデータを生成
  const getScheduleItems = useCallback((): ScheduleItem[] => {
    const items: ScheduleItem[] = [];
    
    // カレンダーセクション
    items.push({
      id: 'calendar',
      type: 'calendar'
    });
    
    // 日付タイトルセクション
    items.push({
      id: 'dateTitle',
      type: 'dateTitle'
    });
    
    // レッスンセクション
    if (selectedDateLessons.length > 0) {
      items.push({
        id: 'lessonHeader',
        type: 'lessonHeader'
      });
      
      // 各レッスンを個別のアイテムとして追加
      selectedDateLessons.forEach(lesson => {
        items.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          data: lesson
        });
      });
    }
    
    // タスクセクション
    if (selectedDateTasks.length > 0) {
      items.push({
        id: 'taskHeader',
        type: 'taskHeader'
      });
      
      // 各タスクを個別のアイテムとして追加
      selectedDateTasks.forEach(task => {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          data: task
        });
      });
    }
    
    // 予定なしセクション
    if (selectedDateLessons.length === 0 && selectedDateTasks.length === 0) {
      items.push({
        id: 'empty',
        type: 'empty'
      });
    }
    
    return items;
  }, [selectedDateLessons, selectedDateTasks]);

  // FlatListのレンダリング関数
  const renderItem = ({ item }: { item: ScheduleItem }) => {
    switch (item.type) {
      case 'calendar':
        return (
          <View style={styles.calendarContainer}>
            <CalendarHeader 
              currentMonth={currentMonth} 
              onMonthChange={handleMonthChange} 
            />
            
            <CalendarGrid 
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onMonthChange={handleMonthChange}
              lessons={lessonStore.lessons}
              tasks={taskStore.tasks}
            />
          </View>
        );
        
      case 'dateTitle':
        return (
          <Text style={styles.dateTitle}>
            {`${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`}
          </Text>
        );
        
      case 'lessonHeader':
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>レッスン</Text>
          </View>
        );
        
      case 'lesson':
        // レッスンアイテムを直接レンダリング
        return renderLessonItem(item.data);
        
      case 'taskHeader':
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="musical-notes" size={18} color={colors.secondary} />
            <Text style={styles.sectionTitle}>練習予定</Text>
          </View>
        );
        
      case 'task':
        return renderTaskItem(item.data);
        
      case 'empty':
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>予定はありません</Text>
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>スケジュール</Text>
      </View>
      
      <FlatList
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        data={getScheduleItems()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  calendarContainer: {
    backgroundColor: colors.background,
    marginBottom: 16,
  },
  scheduleContainer: {
    backgroundColor: colors.background,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.textTertiary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskList: {
    marginTop: 8,
  },
  taskItem: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.secondary,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  lessonItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  contentContainer: {
    flex: 1,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  teacherText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  piecesText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tagItem: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.primary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});

export default ScheduleScreen; 