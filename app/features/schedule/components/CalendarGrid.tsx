import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Lesson } from '../../../store/lessons';
import { Task } from '../../../types/task';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = SCREEN_WIDTH - 32;

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

interface CalendarGridProps {
  currentMonth: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (increment: number) => void;
  lessons: Lesson[];
  tasks?: Task[];
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  onDateSelect,
  onMonthChange,
  lessons,
  tasks = [],
}) => {
  const translateX = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      translateX.value = 0;
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (Math.abs(event.velocityX) > 500) {
        if (event.velocityX > 0) {
          translateX.value = withTiming(CALENDAR_WIDTH, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }, () => {
            runOnJS(onMonthChange)(-1);
            translateX.value = 0;
          });
        } else {
          translateX.value = withTiming(-CALENDAR_WIDTH, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }, () => {
            runOnJS(onMonthChange)(1);
            translateX.value = 0;
          });
        }
      } else {
        translateX.value = withTiming(0, {
          duration: 300,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // カレンダーの日付を生成する関数
  const generateCalendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    // 月の最初の日と最後の日を取得
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // 日曜日を0とした場合の、月の最初の日の曜日
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // 前月の最後の日を取得
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // 前月の日付を追加
    for (let i = 0; i < firstDayOfWeek; i++) {
      const day = prevMonthLastDay - firstDayOfWeek + i + 1;
      days.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false
      });
    }
    
    // 現在の月の日付を追加
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // 次の月の日付を追加（6週間分になるように）
    const daysNeeded = 42 - days.length;
    for (let i = 1; i <= daysNeeded; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonth]);

  const calendarDays = useMemo(() => generateCalendarDays(), [generateCalendarDays]);

  // 日付をYYYY年MM月DD日形式に変換
  const formatDate = (d: Date) => {
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // レッスンがあるかどうかを確認する関数
  const hasLesson = useCallback((date: Date) => {
    const formattedDate = formatDate(date);
    
    // 日付が一致するレッスンを検索
    return lessons.some(lesson => {
      // レッスンの日付が文字列形式の場合の処理
      if (typeof lesson.date === 'string') {
        // 直接比較
        if (lesson.date === formattedDate) {
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
              lessonDate.getFullYear() === date.getFullYear() &&
              lessonDate.getMonth() === date.getMonth() &&
              lessonDate.getDate() === date.getDate()
            );
          }
        } catch (e) {
          console.error('日付のパースエラー:', e);
        }
      }
      
      return false;
    });
  }, [lessons]);

  // タスクの練習日があるかどうかを確認する関数
  const hasPracticeTask = useCallback((date: Date) => {
    // 日付が一致するタスクを検索
    return tasks.some(task => {
      if (!task.practiceDate) return false;
      
      // 練習日の形式に応じて比較
      if (typeof task.practiceDate === 'string') {
        // 文字列形式の場合
        if (task.practiceDate === formatDate(date)) {
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
              practiceDate.getFullYear() === date.getFullYear() &&
              practiceDate.getMonth() === date.getMonth() &&
              practiceDate.getDate() === date.getDate()
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
          practiceDate.getFullYear() === date.getFullYear() &&
          practiceDate.getMonth() === date.getMonth() &&
          practiceDate.getDate() === date.getDate()
        );
      } else if (task.practiceDate instanceof Date) {
        // Date型の場合
        const practiceDate = task.practiceDate as Date;
        
        return (
          practiceDate.getFullYear() === date.getFullYear() &&
          practiceDate.getMonth() === date.getMonth() &&
          practiceDate.getDate() === date.getDate()
        );
      }
      
      return false;
    });
  }, [tasks]);

  // 選択された日付かどうかを確認する関数
  const isSelectedDate = useCallback((date: Date) => {
    return date.getFullYear() === selectedDate.getFullYear() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getDate() === selectedDate.getDate();
  }, [selectedDate]);

  // 今日の日付かどうかを確認する関数
  const isTodayDate = useCallback((date: Date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate();
  }, []);

  // 曜日ヘッダーをレンダリング
  const renderWeekdayHeader = () => (
    <View style={styles.weekdayHeader}>
      {['日', '月', '火', '水', '木', '金', '土'].map((day, index) => (
        <View key={index} style={styles.weekdayCell}>
          <Text
            style={[
              styles.weekdayText,
              index === 0 && styles.sundayText,
              index === 6 && styles.saturdayText,
            ]}
          >
            {day}
          </Text>
        </View>
      ))}
    </View>
  );

  // 日付セルをレンダリング
  const renderDayCell = (dayInfo: { date: Date; isCurrentMonth: boolean }, dayIndex: number) => {
    const { date, isCurrentMonth } = dayInfo;
    const isSelected = isSelectedDate(date);
    const isToday = isTodayDate(date);
    const hasLessonForDay = hasLesson(date);
    const hasPracticeTaskForDay = hasPracticeTask(date);
    
    return (
      <View
        key={dayIndex}
        style={[
          styles.dayCell,
          !isCurrentMonth && styles.otherMonthDay,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.dayButton,
            isSelected && styles.selectedDay,
            isToday && styles.todayDay,
          ]}
          onPress={() => onDateSelect(date)}
        >
          <View style={styles.dayCellContent}>
            <Text
              style={[
                styles.dayText,
                !isCurrentMonth && styles.otherMonthDayText,
                dayIndex === 0 && styles.sundayText,
                dayIndex === 6 && styles.saturdayText,
                isSelected && styles.selectedDayText,
                isToday && styles.todayDayText,
              ]}
            >
              {date.getDate()}
            </Text>
            
            <View style={styles.indicatorContainer}>
              {hasLessonForDay && 
                <View style={styles.lessonIndicator}>
                  <Ionicons 
                    name="school" 
                    size={12} 
                    color={(isSelected || isToday) ? "#FFFFFF" : "#4285F4"} 
                  />
                </View>
              }
              
              {hasPracticeTaskForDay && 
                <View style={styles.practiceIndicator}>
                  <Ionicons 
                    name="musical-notes" 
                    size={12} 
                    color={(isSelected || isToday) ? "#FFFFFF" : "#34A853"} 
                  />
                </View>
              }
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // 週ごとの行をレンダリング
  const renderWeekRow = (weekIndex: number) => (
    <View key={weekIndex} style={styles.weekRow}>
      {calendarDays.slice(weekIndex * 7, (weekIndex + 1) * 7).map((dayInfo, dayIndex) => 
        renderDayCell(dayInfo, dayIndex)
      )}
    </View>
  );

  // カレンダーグリッドを直接レンダリング
  const renderCalendarGrid = () => (
    <Animated.View style={[styles.calendarContainer, animatedStyle]}>
      {renderWeekdayHeader()}
      {Array.from({ length: 6 }).map((_, weekIndex) => renderWeekRow(weekIndex))}
    </Animated.View>
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container}>
        {renderCalendarGrid()}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  calendarContainer: {
    width: '100%',
  },
  weekdayHeader: {
    flexDirection: 'row',
    width: '100%',
    height: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekdayCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 45,
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    padding: 1,
    height: 45,
  },
  dayButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 43,
  },
  dayCellContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    height: 20,
    lineHeight: 20,
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: colors.textTertiary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  selectedDayText: {
    color: colors.background,
    fontWeight: '700',
  },
  todayDay: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  todayDayText: {
    color: colors.background,
    fontWeight: '700',
  },
  sundayText: {
    color: colors.error,
  },
  saturdayText: {
    color: colors.primary,
  },
  lessonIndicator: {
    marginHorizontal: 2,
  },
  practiceIndicator: {
    marginHorizontal: 2,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    height: 16,
    marginTop: 2,
    minHeight: 16,
  },
});

export default CalendarGrid;
