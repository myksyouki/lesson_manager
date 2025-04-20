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
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../../../../theme';
import ChartSection from './ChartSection';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

// スケジュール関連のコンポーネントをインポート
import CalendarHeader from '../../schedule/components/CalendarHeader';
import WeekDayHeader from '../../schedule/components/WeekDayHeader';
import CalendarGrid from '../../schedule/components/CalendarGrid';
import LessonDetails from '../../schedule/components/LessonDetails';
import { useLessonStore } from '../../../../store/lessons';
import { auth } from '../../../../config/firebase';

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState<'charts' | 'calendar'>('charts');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { lessons, fetchLessons, isLoading } = useLessonStore();
  const theme = useTheme();
  const router = useRouter();

  // 仮のデータ（本来はストアやpropsから取得）
  const monthlyPractice = 12;
  const lessonCount = 8;
  const tagCount = 16;
  const streak = 7;

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
    // 詳細レポート画面へ遷移
    router.push('/analysis/detailed-report');
  };

  const handleShare = async () => {
    // テキスト共有のみ
    await Share.share({ message: `今月${monthlyPractice}日練習しました！ #Resonoteで練習` });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: '#F6F7F9' }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient colors={['#FFD700', '#7C4DFF']} style={styles.heroGradient}>
        <View style={styles.heroIconWrap}>
          <MaterialIcons name="emoji-events" size={48} color="#fff" />
        </View>
        <Text style={styles.heroNumberSmall}>{monthlyPractice}日</Text>
        <Text style={styles.heroCaption}>今月の練習日数</Text>
        <Text style={styles.heroMotto}>#Resonoteで練習</Text>
      </LinearGradient>
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
                  name="analytics" 
                  size={24} 
                  color={theme.colors.primary}
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
          {/* シェアボタン */}
          <TouchableOpacity style={styles.shareButtonInline} onPress={handleShare}>
            <MaterialIcons name="share" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>この成果をシェア</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
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
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    margin: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    marginLeft: 6,
    color: '#757575',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#515BD4',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  additionalStatsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#222',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    padding: 18,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#515BD4',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
  },
  detailReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7C4DFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 28,
    marginBottom: 16,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 2,
  },
  detailButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10,
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
  heroGradient: {
    width: '100%',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: 16,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroIconWrap: {
    backgroundColor: '#fff2',
    borderRadius: 32,
    padding: 4,
    marginBottom: 6,
  },
  heroNumberSmall: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2,
  },
  heroCaption: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 4,
    textShadowColor: '#0002',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroMotto: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.85,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: -24,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  badgeCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    minWidth: 90,
  },
  badgeNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7C4DFF',
    marginTop: 4,
    marginBottom: 2,
  },
  badgeLabel: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  shareButtonInline: {
    backgroundColor: '#7C4DFF',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: 16,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
}); 