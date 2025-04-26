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
import { useLessonStore } from '../../../../store/lessons';
import { auth } from '../../../../config/firebase';

export default function AnalysisScreen() {
  const [activeTab, setActiveTab] = useState<'charts'>('charts');
  const theme = useTheme();
  const router = useRouter();
  const { lessons, fetchLessons, isLoading } = useLessonStore();

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
        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  heroGradient: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
  },
  heroIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  heroNumberSmall: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  heroCaption: {
    fontSize: 16,
    color: '#fff',
    marginTop: 4,
  },
  heroMotto: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F6F7F9',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  additionalStatsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  statCard: {
    alignItems: 'center',
    padding: 12,
    minWidth: '40%',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7C4DFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#5F6368',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#202124',
    marginBottom: 8,
  },
  detailReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  detailButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    color: '#7C4DFF',
  },
}); 