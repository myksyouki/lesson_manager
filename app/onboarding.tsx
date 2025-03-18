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
  Dimensions
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
} from './services/userProfileService';
import { useAuthStore } from './store/auth';

const { width } = Dimensions.get('window');

// オンボーディングの各ステップを表す型
type OnboardingStep = 'welcome' | 'category' | 'instrument' | 'model' | 'features';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [currentCategory, setCurrentCategory] = useState<InstrumentCategory | null>(null);
  const [currentInstrument, setCurrentInstrument] = useState<Instrument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setIsNewUser } = useAuthStore();

  // 初期ロード時に既存のユーザープロファイルを確認
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setSelectedCategory(profile.selectedCategory);
          setSelectedInstrument(profile.selectedInstrument);
          setSelectedModel(profile.selectedModel);
          
          // カテゴリとインストゥルメント情報も設定
          const category = instrumentCategories.find(c => c.id === profile.selectedCategory);
          if (category) {
            setCurrentCategory(category);
            
            const instrument = category.instruments.find(i => i.id === profile.selectedInstrument);
            if (instrument) {
              setCurrentInstrument(instrument);
            }
          }
        }
      } catch (error) {
        console.error('プロファイル読み込みエラー:', error);
      }
    };

    loadUserProfile();
  }, []);

  // カテゴリ選択の処理
  const handleCategorySelect = async (categoryId: string) => {
    try {
      setIsLoading(true);
      setSelectedCategory(categoryId);
      await saveSelectedCategory(categoryId);
      
      // 対応するカテゴリ情報を取得
      const category = instrumentCategories.find(c => c.id === categoryId);
      if (category) {
        setCurrentCategory(category);
      }
      
      // 次のステップに進む
      setCurrentStep('instrument');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'カテゴリの選択に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 楽器選択の処理
  const handleInstrumentSelect = async (instrumentId: string) => {
    try {
      setIsLoading(true);
      setSelectedInstrument(instrumentId);
      
      if (!selectedCategory) {
        throw new Error('カテゴリが選択されていません');
      }
      
      await saveSelectedInstrument(selectedCategory, instrumentId);
      
      // 対応する楽器情報を取得
      if (currentCategory) {
        const instrument = currentCategory.instruments.find(i => i.id === instrumentId);
        if (instrument) {
          setCurrentInstrument(instrument);
          
          // サックスの場合はモデル選択画面へ、それ以外は機能説明画面へ
          if (instrumentId === 'saxophone') {
            setCurrentStep('model');
          } else {
            // スタンダードモデルが自動選択される
            setSelectedModel('standard');
            setCurrentStep('features');
          }
        }
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message || '楽器の選択に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // モデル選択の処理
  const handleModelSelect = async (modelId: string) => {
    try {
      setIsLoading(true);
      
      if (!selectedCategory || !selectedInstrument) {
        throw new Error('カテゴリまたは楽器が選択されていません');
      }
      
      // アーティストモデルかプレミアムでないか確認
      const model = currentInstrument?.models.find(m => m.id === modelId);
      if (model?.isArtist) {
        Alert.alert(
          'プレミアム会員限定',
          'アーティストモデルは現在ベータ版です。一般公開までお待ちください。',
          [{ text: 'OK' }]
        );
        // スタンダードモデルを選択して次に進む
        setSelectedModel('standard');
        await saveSelectedModel(selectedCategory, selectedInstrument, 'standard');
      } else {
        setSelectedModel(modelId);
        await saveSelectedModel(selectedCategory, selectedInstrument, modelId);
      }
      
      // 次のステップに進む
      setCurrentStep('features');
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'モデルの選択に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // オンボーディング完了処理
  const handleComplete = async () => {
    try {
      setIsLoading(true);
      
      // オンボーディング完了を保存
      await completeOnboarding();
      
      // 新規ユーザーフラグをリセット
      setIsNewUser(false);
      
      // ホーム画面に移動
      // @ts-ignore - 型エラーを無視
      router.replace("/(tabs)");
    } catch (error) {
      console.error('オンボーディング完了エラー:', error);
      Alert.alert('エラー', 'オンボーディングの完了に失敗しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 楽器カテゴリアイコンの取得
  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'vocal':
        return <MaterialIcons name="mic" size={32} color="#1C1C1E" />;
      case 'piano':
        return <MaterialIcons name="piano" size={32} color="#1C1C1E" />;
      case 'woodwind':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'brass':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'strings':
        return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      default:
        return <MaterialIcons name="music-note" size={32} color="#1C1C1E" />;
    }
  };

  // 楽器アイコンの取得
  const getInstrumentIcon = (instrumentId: string) => {
    switch (instrumentId) {
      case 'vocal':
        return <MaterialIcons name="mic" size={32} color="#1C1C1E" />;
      case 'piano':
        return <MaterialIcons name="piano" size={32} color="#1C1C1E" />;
      case 'flute':
        return <MaterialCommunityIcons name="music" size={32} color="#1C1C1E" />;
      case 'clarinet':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'oboe':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'fagott':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'saxophone':
        return <MaterialCommunityIcons name="saxophone" size={32} color="#1C1C1E" />;
      case 'trumpet':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'trombone':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'horn':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'euphonium':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'tuba':
        return <MaterialCommunityIcons name="trumpet" size={32} color="#1C1C1E" />;
      case 'violin':
        return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      case 'viola':
        return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      case 'cello':
        return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      case 'contrabass':
        return <MaterialCommunityIcons name="violin" size={32} color="#1C1C1E" />;
      default:
        return <MaterialIcons name="music-note" size={32} color="#1C1C1E" />;
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
              まずは簡単な設定から始めましょう。
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setCurrentStep('category')}
            >
              <Text style={styles.buttonText}>始める</Text>
              <MaterialIcons name="arrow-forward" size={24} color="white" />
            </TouchableOpacity>
          </View>
        );

      case 'category':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>楽器カテゴリの選択</Text>
            <Text style={styles.description}>
              演奏する楽器のカテゴリを選択してください。
              これに基づいてAIがアドバイスを提供します。
            </Text>
            
            {instrumentCategories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.instrumentItem,
                  selectedCategory === category.id && styles.selectedInstrumentItem
                ]}
                onPress={() => handleCategorySelect(category.id)}
                disabled={isLoading}
              >
                <View style={styles.instrumentRow}>
                  {getCategoryIcon(category.id)}
                  <Text style={styles.instrumentLabel}>{category.name}</Text>
                </View>
                {selectedCategory === category.id && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            
            {isLoading && (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            )}
          </View>
        );

      case 'instrument':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>楽器を選択</Text>
            <Text style={styles.description}>
              演奏する楽器を選択してください。
              後から設定画面で変更することもできます。
            </Text>
            
            {currentCategory?.instruments.map((instrument) => (
              <TouchableOpacity
                key={instrument.id}
                style={[
                  styles.instrumentItem,
                  selectedInstrument === instrument.id && styles.selectedInstrumentItem
                ]}
                onPress={() => handleInstrumentSelect(instrument.id)}
                disabled={isLoading}
              >
                <View style={styles.instrumentRow}>
                  {getInstrumentIcon(instrument.id)}
                  <Text style={styles.instrumentLabel}>{instrument.name}</Text>
                </View>
                {selectedInstrument === instrument.id && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            
            {isLoading && (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            )}
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentStep('category')}
            >
              <MaterialIcons name="arrow-back" size={20} color="#007AFF" />
              <Text style={styles.backButtonText}>カテゴリ選択に戻る</Text>
            </TouchableOpacity>
          </View>
        );
        
      case 'model':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>モデルを選択</Text>
            <Text style={styles.description}>
              使用するAIモデルを選択してください。
              後から設定画面で変更することもできます。
            </Text>
            
            {currentInstrument?.models.map((model) => (
              <TouchableOpacity
                key={model.id}
                style={[
                  styles.instrumentItem,
                  selectedModel === model.id && styles.selectedInstrumentItem,
                  model.isArtist && styles.artistModelItem
                ]}
                onPress={() => handleModelSelect(model.id)}
                disabled={isLoading}
              >
                <View style={styles.instrumentRow}>
                  <Text style={styles.instrumentLabel}>{model.name}</Text>
                  {model.isArtist && (
                    <View style={styles.betaBadge}>
                      <Text style={styles.betaBadgeText}>BETA</Text>
                    </View>
                  )}
                </View>
                {selectedModel === model.id && (
                  <MaterialIcons name="check" size={24} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            
            {isLoading && (
              <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            )}
            
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setCurrentStep('instrument')}
            >
              <MaterialIcons name="arrow-back" size={20} color="#007AFF" />
              <Text style={styles.backButtonText}>楽器選択に戻る</Text>
            </TouchableOpacity>
          </View>
        );

      case 'features':
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.title}>主な機能</Text>
            
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
                <Text style={styles.featureTitle}>練習タスク管理</Text>
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
              onPress={handleComplete}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.buttonText}>完了</Text>
                  <MaterialIcons name="check" size={24} color="white" />
                </>
              )}
            </TouchableOpacity>
            
            {currentStep === 'features' && currentInstrument && (
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedInfoText}>
                  選択した楽器: {currentCategory?.name} / {currentInstrument.name}
                </Text>
              </View>
            )}
          </View>
        );
    }
  };

  // 進捗の計算（例：ウェルカム=0%, カテゴリ=25%, 楽器=50%, モデル=75%, 機能=100%）
  const calculateProgress = () => {
    switch (currentStep) {
      case 'welcome':
        return 0;
      case 'category':
        return 25;
      case 'instrument':
        return 50;
      case 'model':
        return 75;
      case 'features':
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
            (currentStep === 'category') && styles.activeProgressDot
          ]} 
        />
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'instrument') && styles.activeProgressDot
          ]} 
        />
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'model' || (currentStep === 'features' && selectedInstrument !== 'saxophone')) && styles.activeProgressDot
          ]} 
        />
        <View 
          style={[
            styles.progressDot, 
            (currentStep === 'features') && styles.activeProgressDot
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
}); 