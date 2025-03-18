import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { 
  getUserProfile, 
  saveSelectedCategory,
  saveSelectedInstrument, 
  saveSelectedModel,
  instrumentCategories,
  InstrumentCategory,
  Instrument,
  InstrumentModel
} from './services/userProfileService';

// 設定ステップを表す型
type SettingsStep = 'category' | 'instrument' | 'model';

export default function InstrumentSettingsScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [currentStep, setCurrentStep] = useState<SettingsStep>('category');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedInstrument, setSelectedInstrument] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [currentCategory, setCurrentCategory] = useState<InstrumentCategory | null>(null);
  const [currentInstrument, setCurrentInstrument] = useState<Instrument | null>(null);
  const router = useRouter();

  // 初期ロード時にユーザープロファイルを取得
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoading(true);
        const profile = await getUserProfile();
        
        if (profile) {
          setSelectedCategory(profile.selectedCategory);
          setSelectedInstrument(profile.selectedInstrument);
          setSelectedModel(profile.selectedModel);
          setIsPremium(profile.isPremium);
          
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
        console.error('プロファイル取得エラー:', error);
        Alert.alert('エラー', '設定の取得に失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProfile();
  }, []);

  // カテゴリ選択の処理
  const handleCategorySelect = async (categoryId: string) => {
    try {
      setIsLoading(true);
      const success = await saveSelectedCategory(categoryId);
      
      if (success) {
        // カテゴリ情報を更新
        setSelectedCategory(categoryId);
        
        // 対応するカテゴリ情報を取得
        const category = instrumentCategories.find(c => c.id === categoryId);
        if (category) {
          setCurrentCategory(category);
          
          // カテゴリの最初の楽器を自動選択
          const firstInstrument = category.instruments[0];
          setSelectedInstrument(firstInstrument.id);
          setCurrentInstrument(firstInstrument);
          
          // スタンダードモデルを自動選択
          const standardModel = firstInstrument.models.find(m => !m.isArtist)?.id || 'standard';
          setSelectedModel(standardModel);
        }
        
        // 次のステップに進む
        setCurrentStep('instrument');
      } else {
        Alert.alert('エラー', 'カテゴリの選択の保存に失敗しました');
      }
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
      
      if (!selectedCategory) {
        throw new Error('カテゴリが選択されていません');
      }
      
      const success = await saveSelectedInstrument(selectedCategory, instrumentId);
      
      if (success) {
        // 楽器情報を更新
        setSelectedInstrument(instrumentId);
        
        // 対応する楽器情報を取得
        if (currentCategory) {
          const instrument = currentCategory.instruments.find(i => i.id === instrumentId);
          if (instrument) {
            setCurrentInstrument(instrument);
            
            // スタンダードモデルを自動選択
            const standardModel = instrument.models.find(m => !m.isArtist)?.id || 'standard';
            setSelectedModel(standardModel);
            
            // サックスの場合はモデル選択画面へ、それ以外は完了
            if (instrumentId === 'saxophone') {
              setCurrentStep('model');
            } else {
              Alert.alert('成功', '楽器の選択を保存しました');
            }
          }
        }
      } else {
        Alert.alert('エラー', '楽器の選択の保存に失敗しました');
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
      // 選択したモデルを取得
      const model = currentInstrument?.models.find(m => m.id === modelId);
      
      // アーティストモデルかつプレミアムでない場合は処理を中断
      if (model?.isArtist && !isPremium) {
        Alert.alert(
          'プレミアム会員限定',
          'アーティストモデルを使用するにはプレミアム会員への登録が必要です。',
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: 'プレミアムに登録', 
              // @ts-ignore - 型エラーを無視
              onPress: () => router.push('/')
            }
          ]
        );
        return;
      }
      
      setIsLoading(true);
      
      if (!selectedCategory || !selectedInstrument) {
        throw new Error('カテゴリまたは楽器が選択されていません');
      }
      
      const success = await saveSelectedModel(selectedCategory, selectedInstrument, modelId);
      
      if (success) {
        setSelectedModel(modelId);
        Alert.alert('成功', 'モデルの選択を保存しました');
      } else {
        Alert.alert('エラー', 'モデルの選択の保存に失敗しました');
      }
    } catch (error: any) {
      Alert.alert('エラー', error.message || 'モデルの選択に失敗しました');
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
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {isLoading && !currentCategory ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>読み込み中...</Text>
          </View>
        ) : (
          renderContent()
        )}
      </ScrollView>

      {/* フッター */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.homeButton} 
          // @ts-ignore - 型エラーを無視
          onPress={() => router.push("/settings")}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
          <Text style={styles.homeButtonText}>設定に戻る</Text>
        </TouchableOpacity>
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
    paddingBottom: 80,
  },
  stepContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    width: '80%',
  },
  homeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
}); 