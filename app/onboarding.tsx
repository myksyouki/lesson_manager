import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
  ImageSourcePropType
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  getUserProfile, 
  saveSelectedCategory,
  saveSelectedInstrument,
  saveSelectedModel,
  completeOnboarding,
  instrumentCategories,
  InstrumentCategory,
  Instrument,
  InstrumentModel
} from '../services/userProfileService';
import { useAuthStore } from '../store/auth';

const { width } = Dimensions.get('window');

// オンボーディングの各ステップを表す型
type OnboardingStep = 'welcome' | 'features' | 'tabs';

// モックアップ用のコンポーネント
const HomeScreenMockup = () => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 }}>
    <View style={{ marginBottom: 16, backgroundColor: '#E1ECFF', padding: 12, borderRadius: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#4285F4', marginBottom: 8 }}>今日の練習</Text>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, marginBottom: 6 }}>
        <Text style={{ fontSize: 14, color: '#444' }}>音程の安定性を高める練習</Text>
      </View>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10 }}>
        <Text style={{ fontSize: 14, color: '#444' }}>音色改善エクササイズ</Text>
      </View>
    </View>
    <View style={{ backgroundColor: '#F0F0F0', padding: 12, borderRadius: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>最近のレッスン</Text>
      <View style={{ backgroundColor: '#FFFFFF', borderRadius: 8, padding: 10, marginBottom: 6 }}>
        <Text style={{ fontSize: 14, color: '#444' }}>4月10日のレッスン</Text>
      </View>
    </View>
  </View>
);

const LessonsScreenMockup = () => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 }}>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 10, marginBottom: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#4285F4', marginRight: 10 }} />
        <Text style={{ fontSize: 16, color: '#333' }}>検索バー</Text>
      </View>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#4285F4' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 }}>4月10日のレッスン</Text>
      <Text style={{ fontSize: 14, color: '#666' }}>サクソフォン・テクニック</Text>
      <View style={{ flexDirection: 'row', marginTop: 8 }}>
        <View style={{ backgroundColor: '#E1ECFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginRight: 6 }}>
          <Text style={{ fontSize: 12, color: '#4285F4' }}>音程</Text>
        </View>
        <View style={{ backgroundColor: '#E1ECFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 12, color: '#4285F4' }}>音色</Text>
        </View>
      </View>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderLeftWidth: 3, borderLeftColor: '#4285F4' }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 6 }}>4月3日のレッスン</Text>
      <Text style={{ fontSize: 14, color: '#666' }}>ジャズ練習</Text>
    </View>
    <View style={{ position: 'absolute', right: 20, bottom: 20, width: 50, height: 50, borderRadius: 25, backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="add" size={30} color="#FFFFFF" />
    </View>
  </View>
);

const AILessonScreenMockup = () => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 }}>
    <View style={{ height: '60%', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 16 }}>
      <View style={{ backgroundColor: '#F0F0F0', alignSelf: 'flex-start', borderRadius: 12, padding: 10, marginBottom: 10, maxWidth: '80%' }}>
        <Text style={{ fontSize: 14, color: '#333' }}>サックスの音色を改善するには？</Text>
      </View>
      <View style={{ backgroundColor: '#E1ECFF', alignSelf: 'flex-end', borderRadius: 12, padding: 10, marginBottom: 10, maxWidth: '80%' }}>
        <Text style={{ fontSize: 14, color: '#333' }}>音色を改善するためには、まず適切なマウスピースと...</Text>
      </View>
      <View style={{ backgroundColor: '#F0F0F0', alignSelf: 'flex-start', borderRadius: 12, padding: 10, maxWidth: '80%' }}>
        <Text style={{ fontSize: 14, color: '#333' }}>ありがとう！他におすすめの練習は？</Text>
      </View>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ flex: 1, backgroundColor: '#F0F0F0', borderRadius: 20, padding: 10 }}>
        <Text style={{ fontSize: 14, color: '#666' }}>質問を入力...</Text>
      </View>
      <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#7C4DFF', alignItems: 'center', justifyContent: 'center', marginLeft: 10 }}>
        <MaterialIcons name="send" size={20} color="#FFFFFF" />
      </View>
    </View>
  </View>
);

const TaskScreenMockup = () => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 }}>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#4CAF50', marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialIcons name="check" size={16} color="#4CAF50" />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>長音練習</Text>
      </View>
      <Text style={{ fontSize: 14, color: '#666', marginLeft: 34 }}>4月10日のレッスンから</Text>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCCCCC', marginRight: 10 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>音程の安定性トレーニング</Text>
      </View>
      <Text style={{ fontSize: 14, color: '#666', marginLeft: 34 }}>4月3日のレッスンから</Text>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#CCCCCC', marginRight: 10 }} />
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#333' }}>タンギングエクササイズ</Text>
      </View>
      <Text style={{ fontSize: 14, color: '#666', marginLeft: 34 }}>3月27日のレッスンから</Text>
    </View>
  </View>
);

const AnalyticsScreenMockup = () => (
  <View style={{ width: '100%', height: '100%', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12 }}>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>練習統計</Text>
      <View style={{ height: 60, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 10 }}>
        <View style={{ width: 20, height: 30, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 40, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 20, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 50, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 35, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 45, backgroundColor: '#4285F4', borderRadius: 4 }} />
        <View style={{ width: 20, height: 25, backgroundColor: '#4285F4', borderRadius: 4 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
        <Text style={{ fontSize: 10, color: '#666' }}>月</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>火</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>水</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>木</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>金</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>土</Text>
        <Text style={{ fontSize: 10, color: '#666' }}>日</Text>
      </View>
    </View>
    <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14 }}>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 }}>レッスン履歴</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 8 }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F1F1F1' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F1F1F1' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F1F1F1' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#F1F1F1' }} />
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#4285F4' }} />
      </View>
      <Text style={{ fontSize: 14, color: '#666' }}>4月: 合計3回のレッスン</Text>
    </View>
  </View>
);

// タブガイドのデータ構造
interface TabGuide {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  mockupComponent: React.ReactNode;
}

const tabGuides: TabGuide[] = [
  {
    id: 'home',
    icon: 'home',
    title: 'ホーム',
    description: 'レッスンや練習の概要を確認できます。最近のレッスンが表示され、すぐにアクセスできます。AIが推奨する練習メニューも表示されるので、今日の練習に役立てられます。',
    color: '#4285F4',
    mockupComponent: <HomeScreenMockup />
  },
  {
    id: 'lessons',
    icon: 'library-music',
    title: 'レッスン',
    description: 'レッスン録音を管理・閲覧できます。録音は自動的に文字起こしされ要約が作成されます。レッスンカードを長押しすると、複数のレッスンを選択してAIに相談したり、アーカイブしたりできます。',
    color: '#4285F4',
    mockupComponent: <LessonsScreenMockup />
  },
  {
    id: 'ai-lesson',
    icon: 'assistant',
    title: 'AIレッスン',
    description: '練習に関する質問をAIにできます。サクソフォンの音色やテクニックについて質問したり、練習方法のアドバイスを求めたりできます。過去のレッスン内容に基づいた具体的なアドバイスも受けられます。',
    color: '#7C4DFF',
    mockupComponent: <AILessonScreenMockup />
  },
  {
    id: 'task',
    icon: 'check-circle',
    title: '練習管理',
    description: 'レッスンから生成された練習メニューを管理します。AIが最適な練習プランを提案し、実行状況を記録できます。完了した練習にはチェックを入れて進捗を記録できます。',
    color: '#4CAF50',
    mockupComponent: <TaskScreenMockup />
  },
  {
    id: 'schedule',
    icon: 'calendar-today',
    title: '分析',
    description: 'レッスンと練習の履歴を時系列で確認できます。カレンダーやグラフ形式で練習の進捗状況を可視化し、長期的な上達の傾向を分析できます。月ごとの統計も表示されます。',
    color: '#FF9800',
    mockupComponent: <AnalyticsScreenMockup />
  }
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setOnboardingCompleted } = useAuthStore();
  const [error, setError] = useState('');

  // 初期ロード時に既存のユーザープロファイルを確認
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // プロフィールはすでに設定済みなのでここでの処理は最小限にする
        const profile = await getUserProfile();
        if (!profile) {
          console.error('プロフィールが見つかりません');
        }
      } catch (error) {
        console.error('プロファイル読み込みエラー:', error);
      }
    };

    loadUserProfile();
  }, []);

  // オンボーディング完了処理
  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      // オンボーディング完了フラグを設定
      await completeOnboarding();
      setOnboardingCompleted(true);
      
      // ホーム画面に直接遷移
      router.replace('/tabs');
    } catch (error) {
      console.error('オンボーディング完了エラー:', error);
      setError('オンボーディングの完了に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 現在のステップに基づいて表示するコンテンツを返す
  const renderContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <View style={styles.stepContainer}>
            <View style={styles.logoPlaceholder}>
              <MaterialIcons name="music-note" size={80} color="#007AFF" />
            </View>
            <Text style={styles.title}>レッスン管理アプリへようこそ</Text>
            <Text style={styles.description}>
              このアプリでは、音楽レッスンの記録や練習の管理、AIによるアドバイスを受けることができます。
              主な機能について確認しましょう。
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setCurrentStep('features')}
            >
              <Text style={styles.buttonText}>始める</Text>
              <MaterialIcons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        );

      case 'features':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>主な機能</Text>
            <Text style={styles.description}>
              この楽器レッスン管理アプリには次の機能があります。
            </Text>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="mic" size={32} color="#007AFF" />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>レッスン録音</Text>
                <Text style={styles.featureDescription}>
                  レッスンを録音し、自動的に文字起こしとサマリーを作成します。
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="format-list-bulleted" size={32} color="#007AFF" />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>練習管理（開発中）</Text>
                <Text style={styles.featureDescription}>
                  レッスンから練習タスクを作成し、進捗を管理できます。
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="chat" size={32} color="#007AFF" />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>AIアドバイス</Text>
                <Text style={styles.featureDescription}>
                  選択した楽器に基づいたAIのアドバイスを受けられます。
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.button}
              onPress={() => setCurrentStep('tabs')}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.buttonText}>次へ</Text>
                  <MaterialIcons name="arrow-forward" size={24} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        );

      case 'tabs':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>アプリの使い方</Text>
            <Text style={styles.description}>
              アプリの各タブの機能について説明します。まずはホーム画面から探索してみましょう。
            </Text>
            
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.screenshotCarousel}
              contentContainerStyle={styles.carouselContent}
            >
              {tabGuides.map((tab, index) => (
                <View key={tab.id} style={styles.tabGuideSlide}>
                  <View style={[styles.screenshotContainer, { borderColor: tab.color }]}>
                    {tab.mockupComponent}
                  </View>
                  <View style={styles.tabInfoContainer}>
                    <View style={styles.tabHeaderRow}>
                      <MaterialIcons name={tab.icon as any} size={32} color={tab.color} />
                      <Text style={styles.tabTitle}>{tab.title}</Text>
                    </View>
                    <Text style={styles.tabDescription}>
                      {tab.description}
                    </Text>
                  </View>
                  <View style={styles.paginationDots}>
                    {tabGuides.map((_, dotIndex) => (
                      <View 
                        key={dotIndex} 
                        style={[
                          styles.paginationDot,
                          dotIndex === index && [styles.activePaginationDot, { backgroundColor: tab.color }]
                        ]} 
                      />
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
            
            <TouchableOpacity
              style={styles.button}
              onPress={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.buttonText}>アプリを始める</Text>
                  <MaterialIcons name="check" size={24} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        );
    }
  };

  // 進捗の計算（例：ウェルカム=0%, 機能=50%, タブ=100%）
  const calculateProgress = () => {
    switch (currentStep) {
      case 'welcome':
        return 0;
      case 'features':
        return 50;
      case 'tabs':
        return 100;
    }
  };

  const progress = calculateProgress();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {renderContent()}
      </ScrollView>
      
      {/* プログレスバー */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      
      {/* プログレスインジケーター */}
      <View style={styles.progressContainer}>
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'welcome') && styles.activeProgressDot
          ]} 
        />
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'features') && styles.activeProgressDot
          ]} 
        />
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'tabs') && styles.activeProgressDot
          ]} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 30,
    marginTop: 20,
    minWidth: width * 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  instrumentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectedInstrumentItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  artistModelItem: {
    backgroundColor: '#F8F9FA',
    borderColor: '#FFCC00',
    borderWidth: 1,
  },
  instrumentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instrumentLabel: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1C1E',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  betaBadge: {
    backgroundColor: '#FFCC00',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  betaBadgeText: {
    color: '#1C1C1E',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  loader: {
    marginTop: 20,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5EA',
    width: '100%',
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#007AFF',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 30,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 5,
  },
  activeProgressDot: {
    backgroundColor: '#007AFF',
    width: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  selectedInfo: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  selectedInfoText: {
    fontSize: 14,
    color: '#0D47A1',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  disabledItem: {
    backgroundColor: '#E5E5EA',
  },
  disabledText: {
    color: '#CCCCCC',
  },
  screenshotCarousel: {
    width: width,
    height: 450,
    marginVertical: 20,
  },
  carouselContent: {
    alignItems: 'center',
  },
  tabGuideSlide: {
    width: width - 40,
    marginHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotContainer: {
    width: width - 80,
    height: 250,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabInfoContainer: {
    width: '100%',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  tabHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginLeft: 12,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  tabDescription: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#CCCCCC',
    marginHorizontal: 4,
  },
  activePaginationDot: {
    backgroundColor: '#007AFF',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
}); 