import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import ChartSection from './ChartSection';
import DetailedReport from './DetailedReport';
import { useRouter } from 'expo-router';

// スケジュール関連のコンポーネントをインポート
import CalendarHeader from '../../schedule/components/CalendarHeader';
import WeekDayHeader from '../../schedule/components/WeekDayHeader';
import CalendarGrid from '../../schedule/components/CalendarGrid';
import LessonDetails from '../../schedule/components/LessonDetails';
import { useLessonStore } from '../../../store/lessons';
import { auth } from '../../../config/firebase';

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState<'charts' | 'calendar'>('charts');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { lessons, fetchLessons, isLoading } = useLessonStore();
  const theme = useTheme();
  const router = useRouter();

  React.useEffect(() => {
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

  const formatDate = React.useCallback((date: Date) => {
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }, []);

  const getLessonForDate = React.useCallback((date: Date) => {
    const formattedDate = formatDate(date);
    return lessons.find(lesson => lesson.date === formattedDate);
  }, [lessons, formatDate]);

  const handleShowDetailedReport = () => {
    router.push('/analysis/detailed-report');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'charts' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('charts')}
          >
            <MaterialIcons 
              name="insights" 
              size={18} 
              color={activeTab === 'charts' ? theme.colors.primary : '#757575'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'charts' && styles.activeTabText
            ]}>
              グラフ
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tabButton, 
              activeTab === 'calendar' && styles.activeTabButton
            ]}
            onPress={() => setActiveTab('calendar')}
          >
            <MaterialIcons 
              name="calendar-today" 
              size={18} 
              color={activeTab === 'calendar' ? theme.colors.primary : '#757575'} 
            />
            <Text style={[
              styles.tabText,
              activeTab === 'calendar' && styles.activeTabText
            ]}>
              カレンダー
            </Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'charts' ? (
            // グラフ表示
            <View>
              <ChartSection />
              
              {/* 追加の統計情報などがあればここに表示 */}
              <View style={styles.additionalStatsContainer}>
                <Text style={styles.sectionTitle}>概要</Text>
                <View style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{lessons.length}</Text>
                    <Text style={styles.statLabel}>累計レッスン数</Text>
                  </View>
                  
                  <View style={styles.statCard}>
                    <Text style={styles.statNumber}>
                      {/* レッスンタグを抽出してユニークなものをカウント */}
                      {new Set(lessons.flatMap(lesson => lesson.tags || [])).size}
                    </Text>
                    <Text style={styles.statLabel}>学習タグ数</Text>
                  </View>
                </View>
              </View>
              
              {/* 詳細レポートボタンを最下部に配置 */}
              <TouchableOpacity 
                style={styles.detailReportButton}
                onPress={handleShowDetailedReport}
              >
                <MaterialIcons 
                  name="assessment" 
                  size={24} 
                  color="#FFFFFF"
                />
                <Text style={styles.detailButtonText}>詳細レポート</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
            </>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    margin: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#515BD4',
  },
  tabText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#757575',
  },
  activeTabText: {
    color: '#515BD4',
    fontWeight: '600',
  },
  detailReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#515BD4',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  detailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  calendarContainer: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    marginBottom: 12,
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
  additionalStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F8F9FA',
    minWidth: 120,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#515BD4',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
  },
}); 