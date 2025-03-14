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
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentMonth,
  selectedDate,
  onDateSelect,
  onMonthChange,
  lessons,
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

  // レッスンがあるかどうかを確認する関数
  const hasLesson = useCallback((date: Date) => {
    // 日付をYYYY年MM月DD日形式に変換
    const formatDate = (d: Date) => {
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    };
    
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

  // 週ごとに日付を分割する
  const weeks = useMemo(() => {
    const result = [];
    for (let i = 0; i < 6; i++) {
      result.push(calendarDays.slice(i * 7, (i + 1) * 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.calendarContainer, animatedStyle]}>
          {weeks.map((week, weekIndex) => (
            <View key={`week-${weekIndex}`} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                const isSelected = isSelectedDate(day.date);
                const isToday = isTodayDate(day.date);
                const dayOfWeek = day.date.getDay();
                const hasLessonForDay = hasLesson(day.date);
                
                return (
                  <View key={`day-${weekIndex}-${dayIndex}`} style={styles.dayCell}>
                    <TouchableOpacity
                      style={[
                        styles.dayCellButton,
                        !day.isCurrentMonth && styles.otherMonthDay,
                      ]}
                      onPress={() => onDateSelect(day.date)}
                      disabled={!day.isCurrentMonth}
                    >
                      <View style={[
                        styles.dayCellContent,
                        isToday && styles.todayDay,
                        isSelected && styles.selectedDay,
                      ]}>
                        <Text style={[
                          styles.dayText,
                          dayOfWeek === 0 && styles.sundayText,
                          dayOfWeek === 6 && styles.saturdayText,
                          isToday && styles.todayDayText,
                          isSelected && styles.selectedDayText,
                          !day.isCurrentMonth && styles.otherMonthDayText,
                        ]}>
                          {day.date.getDate()}
                        </Text>
                      </View>
                      {hasLessonForDay && 
                        <Text style={[
                          styles.lessonIndicator,
                          (isSelected || isToday) && styles.lessonIndicatorHighlighted
                        ]}>
                          ・
                        </Text>
                      }
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
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
  weekRow: {
    flexDirection: 'row',
    width: '100%',
    height: 45, // 高さを40から45に増加
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    padding: 1,
    height: 45, // 高さを40から45に増加
  },
  dayCellButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 43, // 高さを38から43に増加
  },
  dayCellContent: {
    width: 38, // 幅を34から38に増加
    height: 38, // 高さを34から38に増加
    borderRadius: 19, // 半径を17から19に増加
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14, // フォントサイズを13から14に増加
    fontWeight: '600', // フォントの太さを500から600に増加
    color: colors.textPrimary,
    textAlign: 'center',
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
    fontWeight: '700', // フォントの太さを600から700に増加
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
    fontWeight: '700', // フォントの太さを600から700に増加
  },
  sundayText: {
    color: colors.error,
  },
  saturdayText: {
    color: colors.primary,
  },
  lessonIndicator: {
    fontSize: 16, // フォントサイズを14から16に増加
    color: colors.primary,
    fontWeight: 'bold',
    position: 'absolute',
    bottom: -3, // 位置を調整
    lineHeight: 16, // 行の高さを調整
  },
  lessonIndicatorHighlighted: {
    color: colors.background,
  },
});

export default CalendarGrid;
