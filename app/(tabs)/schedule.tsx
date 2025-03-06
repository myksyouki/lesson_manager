import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useLessonStore } from '../store/lessons';

const DAYS = ['日', '月', '火', '水', '木', '金', '土'];
const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = SCREEN_WIDTH - 32;
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);
const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const translateX = useSharedValue(0);
  const { lessons } = useLessonStore();

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

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
            runOnJS(changeMonth)(-1);
            translateX.value = 0;
          });
        } else {
          translateX.value = withTiming(-CALENDAR_WIDTH, {
            duration: 300,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          }, () => {
            runOnJS(changeMonth)(1);
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

  const getLessonForDate = (date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.find(lesson => lesson.date === formattedDate);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>スケジュール</Text>
        </View>

        <View style={styles.calendarContainer}>
          <View style={styles.monthHeader}>
            <TouchableOpacity
              onPress={() => changeMonth(-1)}
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="chevron-left" size={32} color="#1a73e8" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {currentMonth.getFullYear()}年{MONTHS[currentMonth.getMonth()]}
            </Text>
            <TouchableOpacity
              onPress={() => changeMonth(1)}
              style={styles.monthButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="chevron-right" size={32} color="#1a73e8" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekDayHeader}>
            {DAYS.map((day, index) => (
              <Text
                key={day}
                style={[
                  styles.weekDayText,
                  index === 0 && styles.sundayText,
                  index === 6 && styles.saturdayText,
                ]}>
                {day}
              </Text>
            ))}
          </View>

          <GestureDetector gesture={gesture}>
            <Animated.View style={[styles.calendarGrid, animatedStyle]}>
              {generateCalendarDays().map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.day,
                    !item.isCurrentMonth && styles.otherMonth,
                    formatDate(item.date) === formatDate(selectedDate) && styles.selectedDay,
                    isToday(item.date) && styles.today,
                  ]}
                  onPress={() => setSelectedDate(item.date)}>
                  <Text
                    style={[
                      styles.dayText,
                      !item.isCurrentMonth && styles.otherMonthText,
                      formatDate(item.date) === formatDate(selectedDate) &&
                        styles.selectedDayText,
                      isToday(item.date) && styles.todayText,
                    ]}>
                    {item.date.getDate()}
                  </Text>
                  {hasLesson(item.date) && (
                    <View
                      style={[
                        styles.scheduleIndicator,
                        formatDate(item.date) === formatDate(selectedDate) &&
                          styles.selectedScheduleIndicator,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </Animated.View>
          </GestureDetector>

          <ScrollView style={styles.scheduleList}>
            {getLessonForDate(selectedDate) && (
              <View style={styles.scheduleCard}>
                <View style={styles.scheduleTime}>
                  <MaterialIcons name="music-note" size={22} color="#5f6368" />
                  <Text style={styles.scheduleTimeText}>
                    {getLessonForDate(selectedDate)?.teacher}
                  </Text>
                </View>
                <Text style={styles.scheduleTeacher}>
                  {getLessonForDate(selectedDate)?.piece}
                </Text>
                <View style={styles.scheduleLocation}>
                  <MaterialIcons name="description" size={22} color="#5f6368" />
                  <Text style={styles.scheduleLocationText}>
                    {getLessonForDate(selectedDate)?.summary}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 20 : 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 30, // Larger title
    fontWeight: '700',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  monthButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
  },
  monthText: {
    fontSize: 18, // Larger font size
    fontWeight: '500',
    color: '#202124',
    marginHorizontal: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  weekDayHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekDayText: {
    width: DAY_SIZE,
    textAlign: 'center',
    fontSize: 13, // Larger font size
    fontWeight: '500',
    color: '#70757a',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  sundayText: {
    color: '#d93025',
  },
  saturdayText: {
    color: '#1a73e8',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  day: {
    width: DAY_SIZE,
    height: DAY_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayText: {
    fontSize: 14, // Larger font size
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  otherMonth: {
    opacity: 0.5,
  },
  otherMonthText: {
    color: '#70757a',
  },
  selectedDay: {
    backgroundColor: '#1a73e8',
    borderRadius: DAY_SIZE / 2,
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '500',
  },
  today: {
    backgroundColor: '#e8f0fe',
    borderRadius: DAY_SIZE / 2,
  },
  todayText: {
    color: '#1a73e8',
    fontWeight: '500',
  },
  scheduleIndicator: {
    width: 6, // Larger indicator
    height: 6, // Larger indicator
    borderRadius: 3,
    backgroundColor: '#1a73e8',
    position: 'absolute',
    bottom: 2,
  },
  selectedScheduleIndicator: {
    backgroundColor: '#ffffff',
  },
  scheduleList: {
    flex: 1,
    marginTop: 16,
  },
  scheduleCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12, // Increased border radius
    padding: 20, // Increased padding
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  scheduleTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  scheduleTimeText: {
    fontSize: 16, // Larger font size
    color: '#202124',
    marginLeft: 8,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scheduleTeacher: {
    fontSize: 18, // Larger font size
    color: '#202124',
    fontWeight: '500',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scheduleLocation: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scheduleLocationText: {
    fontSize: 16, // Larger font size
    color: '#5f6368',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});