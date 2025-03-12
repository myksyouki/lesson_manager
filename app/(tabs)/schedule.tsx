import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useLessonStore } from '../store/lessons';
import CalendarHeader from '../features/schedule/components/CalendarHeader';
import WeekDayHeader from '../features/schedule/components/WeekDayHeader';
import CalendarGrid from '../features/schedule/components/CalendarGrid';
import LessonDetails from '../features/schedule/components/LessonDetails';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { lessons } = useLessonStore();

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getLessonForDate = (date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.find(lesson => lesson.date === formattedDate);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>スケジュール</Text>
        </View>
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.calendarContainer}>
            <CalendarHeader 
              currentMonth={currentMonth} 
              onMonthChange={changeMonth} 
            />
            <WeekDayHeader />
            <CalendarGrid 
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={changeMonth}
              lessons={lessons}
            />
          </View>

          <LessonDetails 
            selectedDate={selectedDate} 
            lesson={getLessonForDate(selectedDate)} 
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  calendarContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
  },
});