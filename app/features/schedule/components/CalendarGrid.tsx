import React from 'react';
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
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

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

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // 月の開始曜日を月曜日基準で計算
    const firstDayOfWeek = (firstDay.getDay() + 6) % 7; // 月曜日を0に変換
    const prevMonthLastDay = new Date(year, month, 0);
    
    // 前月分の日付を正しい順序で追加
    for (let i = firstDayOfWeek; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - i + 1),
        isCurrentMonth: false,
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    // 正確な週数計算で日付を埋める
    const totalWeeks = Math.ceil(days.length / 7);
    const totalDays = totalWeeks * 7;
    const remainingDays = totalDays - days.length;
    
    if (remainingDays > 0) {
      for (let i = 0; i < remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const hasLesson = (date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.some(lesson => lesson.date === formattedDate);
  };

  const isSelectedDate = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isTodayDate = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <View style={styles.container}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.calendarGrid, animatedStyle]}>
          {calendarDays.map((item, index) => {
            const isSelected = isSelectedDate(item.date);
            const isToday = isTodayDate(item.date);
            const hasLessonOnDate = hasLesson(item.date);
            const isSunday = item.date.getDay() === 0;
            const isSaturday = item.date.getDay() === 6;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  !item.isCurrentMonth && styles.otherMonthDay,
                  isSelected && styles.selectedDay,
                  isToday && !isSelected && styles.todayDay,
                ]}
                onPress={() => onDateSelect(item.date)}
                disabled={!item.isCurrentMonth}
              >
                <View style={styles.dayCellContent}>
                  <Text
                    style={[
                      styles.dayText,
                      !item.isCurrentMonth && styles.otherMonthDayText,
                      isSunday && styles.sundayText,
                      isSaturday && styles.saturdayText,
                      isSelected && styles.selectedDayText,
                      isToday && !isSelected && styles.todayDayText,
                    ]}
                  >
                    {item.date.getDate()}
                  </Text>
                  {hasLessonOnDate && <View style={styles.lessonIndicator} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
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
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  dayCell: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 1,
  },
  dayCellContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonthDay: {
    opacity: 0.3,
  },
  otherMonthDayText: {
    color: colors.textTertiary,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderRadius: DAY_SIZE / 2,
  },
  selectedDayText: {
    color: colors.background,
    fontWeight: '600',
  },
  todayDay: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: DAY_SIZE / 2,
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: '600',
  },
  sundayText: {
    color: colors.error,
  },
  saturdayText: {
    color: colors.primary,
  },
  lessonIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.secondary,
    position: 'absolute',
    bottom: 6,
  },
});

export default CalendarGrid;
