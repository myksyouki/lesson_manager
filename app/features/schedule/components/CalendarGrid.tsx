import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
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

    for (let i = 0; i < firstDay.getDay(); i++) {
      const prevMonthLastDay = new Date(year, month, 0);
      days.push({
        date: new Date(year, month - 1, prevMonthLastDay.getDate() - i),
        isCurrentMonth: false,
      });
    }
    days.reverse();

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true,
      });
    }

    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false,
        });
      }
    }

    return days;
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const hasLesson = (date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.some(lesson => lesson.date === formattedDate);
  };

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.calendarGrid, animatedStyle]}>
        {generateCalendarDays().map((item, index) => {
          const isSelected = formatDate(item.date) === formatDate(selectedDate);
          const isTodayDate = isToday(item.date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                !item.isCurrentMonth && styles.otherMonth,
                isSelected && styles.selectedDay,
                isTodayDate && !isSelected && styles.today,
              ]}
              onPress={() => onDateSelect(item.date)}>
              <Text
                style={[
                  styles.dayText,
                  !item.isCurrentMonth && styles.otherMonthText,
                  isSelected && styles.selectedDayText,
                  isTodayDate && !isSelected && styles.todayText,
                  isSelected && isTodayDate && styles.selectedTodayText,
                ]}>
                {item.date.getDate()}
              </Text>
              {hasLesson(item.date) && (
                <View style={[
                  styles.lessonIndicator,
                  isSelected && styles.selectedLessonIndicator
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  otherMonth: {
    opacity: 0.4,
  },
  otherMonthText: {
    color: '#8E8E93',
  },
  selectedDay: {
    backgroundColor: '#1a73e8',
    borderRadius: DAY_SIZE / 2,
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  today: {
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderRadius: DAY_SIZE / 2,
  },
  todayText: {
    color: '#1a73e8',
    fontWeight: '600',
  },
  selectedTodayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  lessonIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9500',
    position: 'absolute',
    bottom: 8,
  },
  selectedLessonIndicator: {
    backgroundColor: '#ffffff',
  },
});

export default CalendarGrid;
