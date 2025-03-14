import React, { useState, useCallback, useEffect } from 'react';
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
import { auth } from '../config/firebase';

export default function ScheduleScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { lessons, fetchLessons, isLoading } = useLessonStore();

  // 画面表示時にFirebaseからレッスンデータを取得
  useEffect(() => {
    const loadLessons = async () => {
      const user = auth.currentUser;
      if (user) {
        await fetchLessons(user.uid);
      }
    };
    
    loadLessons();
  }, [fetchLessons]);

  const changeMonth = (increment: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + increment);
    setCurrentMonth(newMonth);
  };

  const formatDate = useCallback((date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }, []);

  const getLessonForDate = useCallback((date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.find(lesson => lesson.date === formattedDate);
  }, [lessons, formatDate]);

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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>レッスンデータを読み込み中...</Text>
            </View>
          ) : (
            <LessonDetails 
              selectedDate={selectedDate} 
              lesson={getLessonForDate(selectedDate)} 
            />
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  calendarContainer: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  loadingText: {
    fontSize: 15,
    color: '#8E8E93',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});