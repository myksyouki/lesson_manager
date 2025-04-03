import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { observer } from 'mobx-react-lite';
import { useLessonStore, Lesson } from '../../../../store/lessons';
import { useTaskStore } from '../../../../store/tasks';
import { Task } from '../../../../_ignore/types/_task';
import { auth } from '../../../../config/firebase';
import CalendarHeader from './CalendarHeader';
import CalendarGrid from './CalendarGrid';
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
      // デバッグログ - 問題の検出のため
      console.log(`レッスン日付比較: カレンダー日付=${formattedSelectedDate}, レッスン日付=${lesson.date}`);
      
      // レッスンの日付が文字列形式の場合の処理
      if (typeof lesson.date === 'string') {
        // 直接比較
        if (lesson.date === formattedSelectedDate) {
          return true;
        }
        
        // 日付形式が異なる可能性があるため、日付オブジェクトに変換して比較
        try {
          // 様々な形式の日付文字列をパース
          let lessonDateObj: Date | null = null;
          
          // "YYYY年MM月DD日" 形式
          const jpDatePattern = /(\d+)年(\d+)月(\d+)日/;
          const jpMatches = lesson.date.match(jpDatePattern);
          if (jpMatches) {
            lessonDateObj = new Date(
              parseInt(jpMatches[1]), // 年
              parseInt(jpMatches[2]) - 1, // 月（0-11）
              parseInt(jpMatches[3]) // 日
            );
          } 
          // "YYYY-MM-DD" 形式
          else if (lesson.date.includes('-')) {
            const parts = lesson.date.split('-');
            if (parts.length === 3) {
              lessonDateObj = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2])
              );
            }
          }
          
          if (lessonDateObj) {
            // 年月日が一致するか確認
            const match = (
              lessonDateObj.getFullYear() === selectedDate.getFullYear() &&
              lessonDateObj.getMonth() === selectedDate.getMonth() &&
              lessonDateObj.getDate() === selectedDate.getDate()
            );
            if (match) {
              console.log('日付が一致しました:', {
                lessonDate: lesson.date,
                selectedDate: formattedSelectedDate
              });
            }
            return match;
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
      
      // デバッグログ - 問題の検出のため
      console.log(`タスク日付比較: カレンダー日付=${formattedSelectedDate}, タスク練習日=`, task.practiceDate);
      
      // 練習日の形式に応じて比較
      if (typeof task.practiceDate === 'string') {
        // 文字列形式の場合
        if (task.practiceDate === formattedSelectedDate) {
          return true;
        }
        
        // 日付形式が異なる可能性があるため、日付オブジェクトに変換して比較
        try {
          // 様々な形式の日付文字列をパース
          let practiceDateObj: Date | null = null;
          
          // "YYYY年MM月DD日" 形式
          const jpDatePattern = /(\d+)年(\d+)月(\d+)日/;
          const jpMatches = task.practiceDate.match(jpDatePattern);
          if (jpMatches) {
            practiceDateObj = new Date(
              parseInt(jpMatches[1]), // 年
              parseInt(jpMatches[2]) - 1, // 月（0-11）
              parseInt(jpMatches[3]) // 日
            );
          } 
          // "YYYY-MM-DD" 形式
          else if (task.practiceDate.includes('-')) {
            const parts = task.practiceDate.split('-');
            if (parts.length === 3) {
              practiceDateObj = new Date(
                parseInt(parts[0]),
                parseInt(parts[1]) - 1,
                parseInt(parts[2])
              );
            }
          }
          
          if (practiceDateObj) {
            // 年月日が一致するか確認
            const match = (
              practiceDateObj.getFullYear() === selectedDate.getFullYear() &&
              practiceDateObj.getMonth() === selectedDate.getMonth() &&
              practiceDateObj.getDate() === selectedDate.getDate()
            );
            if (match) {
              console.log('タスク日付が一致しました:', {
                practiceDate: task.practiceDate,
                selectedDate: formattedSelectedDate
              });
            }
            return match;
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
      console.log(`レッスンセクション追加: ${selectedDateLessons.length}件のレッスンがあります`);
      items.push({
        id: 'lessonHeader',
        type: 'lessonHeader'
      });
      
      // 各レッスンを個別のアイテムとして追加
      selectedDateLessons.forEach(lesson => {
        console.log(`レッスン追加: ID=${lesson.id}, 概要=${lesson.summary}`);
        items.push({
          id: `lesson-${lesson.id}`,
          type: 'lesson',
          data: lesson
        });
      });
    } else {
      console.log('表示すべきレッスンはありません');
    }
    
    // タスクセクション
    if (selectedDateTasks.length > 0) {
      console.log(`タスクセクション追加: ${selectedDateTasks.length}件のタスクがあります`);
      items.push({
        id: 'taskHeader',
        type: 'taskHeader'
      });
      
      // 各タスクを個別のアイテムとして追加
      selectedDateTasks.forEach(task => {
        console.log(`タスク追加: ID=${task.id}, タイトル=${task.title}`);
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          data: task
        });
      });
    } else {
      console.log('表示すべきタスクはありません');
    }
    
    // 予定なしセクション
    if (selectedDateLessons.length === 0 && selectedDateTasks.length === 0) {
      console.log('予定なしセクションを追加します');
      items.push({
        id: 'empty',
        type: 'empty'
      });
    }
    
    console.log(`スケジュールアイテム生成完了: 合計${items.length}件のアイテム`);
    return items;
  }, [selectedDateLessons, selectedDateTasks]);

  // FlatListのキー抽出関数を修正
  const keyExtractor = (item: ScheduleItem) => {
    console.log(`キー抽出: ID=${item.id}, Type=${item.type}`);
    return item.id;
  };

  // FlatListのレンダリング関数
  const renderItem = ({ item }: { item: ScheduleItem }) => {
    console.log(`レンダリング: Type=${item.type}, ID=${item.id}`);
    
    switch (item.type) {
      case 'calendar':
        console.log('カレンダーをレンダリングします');
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
        console.log('日付タイトルをレンダリングします');
        return (
          <Text style={styles.dateTitle}>
            {`${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`}
          </Text>
        );
        
      case 'lessonHeader':
        console.log('レッスンヘッダーをレンダリングします');
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="school" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>レッスン</Text>
          </View>
        );
        
      case 'lesson':
        // レッスンアイテムを直接レンダリング
        console.log(`レッスンアイテムをレンダリングします: ID=${item.data?.id}, 概要=${item.data?.summary}`);
        return renderLessonItem(item.data);
        
      case 'taskHeader':
        console.log('タスクヘッダーをレンダリングします');
        return (
          <View style={styles.sectionHeader}>
            <Ionicons name="musical-notes" size={18} color={colors.secondary} />
            <Text style={styles.sectionTitle}>練習予定</Text>
          </View>
        );
        
      case 'task':
        console.log(`タスクアイテムをレンダリングします: ID=${item.data?.id}, タイトル=${item.data?.title}`);
        return renderTaskItem(item.data);
        
      case 'empty':
        console.log('予定なしメッセージをレンダリングします');
        return (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>予定はありません</Text>
          </View>
        );
        
      default:
        console.log(`不明なタイプ: ${item.type}`);
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
        keyExtractor={keyExtractor}
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
    marginTop: 16,
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
    marginTop: 16,
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