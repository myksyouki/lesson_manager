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
  InstrumentModel,
  clearInstrumentInfoCache
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
          // 現在の開発段階では管楽器のみが選択可能
          // 管楽器カテゴリを強制的に選択状態にする
          const categoryId = 'woodwind';
          setSelectedCategory(categoryId);
          
          // 管楽器カテゴリ情報を取得
          const category = instrumentCategories.find(c => c.id === categoryId);
          if (category) {
            setCurrentCategory(category);
            
            // サクソフォンを探す
            const saxophoneInstrument = category.instruments.find(i => i.id === 'saxophone');
            
            if (saxophoneInstrument) {
              // サクソフォンを選択状態にする
              setSelectedInstrument('saxophone');
              setCurrentInstrument(saxophoneInstrument);
              
              // ユーザーがサクソフォンを選択していた場合は、そのモデルを使用
              if (profile.selectedInstrument === 'saxophone') {
                setSelectedModel(profile.selectedModel);
                
                // モデルが複数ある場合はモデル選択画面からスタート
                if (saxophoneInstrument.models.length > 1) {
                  setCurrentStep('model');
                } else {
                  setCurrentStep('instrument');
                }
              } else {
                // ユーザーが他の楽器を選択していた場合は、スタンダードモデルを選択
                const standardModel = saxophoneInstrument.models.find(m => !m.isArtist)?.id || 'standard';
                setSelectedModel(standardModel);
                setCurrentStep('instrument');
              }
            } else {
              // サクソフォンが見つからない場合
              setCurrentStep('category');
            }
          } else {
            // カテゴリが見つからない場合はカテゴリ選択画面からスタート
            setCurrentStep('category');
          }
          
          setIsPremium(profile.isPremium);
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
      // 現在の開発段階では管楽器のみが選択可能
      if (categoryId !== 'woodwind') {
        Alert.alert('お知らせ', 'このカテゴリは現在開発中です。管楽器をお選びください。');
        return;
      }
      
      setIsLoading(true);
      const success = await saveSelectedCategory(categoryId);
      
      if (success) {
        // キャッシュをクリア
        clearInstrumentInfoCache();
        
        // カテゴリ情報を更新
        setSelectedCategory(categoryId);
        
        // 対応するカテゴリ情報を取得
        const category = instrumentCategories.find(c => c.id === categoryId);
        if (category) {
          setCurrentCategory(category);
          
          // 現在の開発段階ではサクソフォンのみが選択可能
          const saxophoneInstrument = category.instruments.find(i => i.id === 'saxophone');
          
          if (saxophoneInstrument) {
            // サクソフォンを自動選択
            const selectedInstrumentId = saxophoneInstrument.id;
            setSelectedInstrument(selectedInstrumentId);
            setCurrentInstrument(saxophoneInstrument);
            
            // ユーザープロファイルを取得して既存のモデル選択を確認
            const profile = await getUserProfile();
            
            // 既存のモデル選択があれば使用、なければスタンダードモデルを選択
            if (profile && profile.selectedInstrument === 'saxophone' && profile.selectedModel) {
              setSelectedModel(profile.selectedModel);
            } else {
              // スタンダードモデルを自動選択
              const standardModel = saxophoneInstrument.models.find(m => !m.isArtist)?.id || 'standard';
              setSelectedModel(standardModel);
            }
            
            // 楽器選択に進む（ユーザーに選択させる）
            setCurrentStep('instrument');
          } else {
            // サクソフォンが見つからない場合の処理
            const firstInstrument = category.instruments[0];
            const selectedInstrumentId = firstInstrument.id;
            setSelectedInstrument(selectedInstrumentId);
            setCurrentInstrument(firstInstrument);
            
            // スタンダードモデルを自動選択
            const standardModel = firstInstrument.models.find(m => !m.isArtist)?.id || 'standard';
            setSelectedModel(standardModel);
            
            // 楽器選択に進む
            setCurrentStep('instrument');
          }
        }
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
      // 現在の開発段階ではサクソフォンのみが選択可能
      if (instrumentId !== 'saxophone') {
        Alert.alert('お知らせ', 'この楽器は現在開発中です。サクソフォンをお選びください。');
        return;
      }
      
      setIsLoading(true);
      
      if (!selectedCategory) {
        throw new Error('カテゴリが選択されていません');
      }
      
      const success = await saveSelectedInstrument(selectedCategory, instrumentId);
      
      if (success) {
        // キャッシュをクリア
        clearInstrumentInfoCache();
        
        // 楽器情報を更新
        setSelectedInstrument(instrumentId);
        
        // 対応する楽器情報を取得
        if (currentCategory) {
          const instrument = currentCategory.instruments.find(i => i.id === instrumentId);
          if (instrument) {
            setCurrentInstrument(instrument);
            
            // ユーザープロファイルを取得して既存のモデル選択を確認
            const profile = await getUserProfile();
            
            // 同じ楽器のモデル選択があるか確認
            if (profile && profile.selectedInstrument === instrumentId && profile.selectedModel) {
              // ユーザーが選択した楽器と同じで、既存のモデル選択がある場合
              const existingModel = instrument.models.find(m => m.id === profile.selectedModel);
              if (existingModel) {
                // 既存のモデル選択を使用
                setSelectedModel(existingModel.id);
              } else {
                // 既存のモデルがない場合はスタンダードモデルを選択
                const standardModel = instrument.models.find(m => !m.isArtist)?.id || 'standard';
                setSelectedModel(standardModel);
              }
            } else {
              // プロファイルがない場合や楽器が変わった場合はスタンダードモデルを選択
              const standardModel = instrument.models.find(m => !m.isArtist)?.id || 'standard';
              setSelectedModel(standardModel);
            }
            
            // 複数のモデルがある場合はモデル選択画面へ、それ以外は完了
            if (instrument.models.length > 1) {
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
      
      // 開発段階のため、プレミアム制限を一時的に無効化
      /*
      // プロフェッショナルモデルかつプレミアムでない場合は処理を中断
      if (model?.isArtist && !isPremium) {
        Alert.alert(
          'プレミアム会員限定',
          'プロフェッショナルモデルを使用するにはプレミアム会員への登録が必要です。',
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
      */
      
      setIsLoading(true);
      
      if (!selectedCategory || !selectedInstrument) {
        throw new Error('カテゴリまたは楽器が選択されていません');
      }
      
      const success = await saveSelectedModel(selectedCategory, selectedInstrument, modelId);
      
      if (success) {
        // キャッシュをクリア
        clearInstrumentInfoCache();
        
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
            
            {instrumentCategories.map((category) => {
              // 管楽器(woodwind)以外はグレーアウト（無効化）
              const isDisabled = category.id !== 'woodwind';
              // グレーアウト時の色
              const textColor = isDisabled ? '#CCCCCC' : '#1C1C1E';
              const iconColor = isDisabled ? '#CCCCCC' : '#1C1C1E';
              
              return (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.instrumentItem,
                    selectedCategory === category.id && styles.selectedInstrumentItem,
                    isDisabled && styles.disabledInstrumentItem
                  ]}
                  onPress={() => handleCategorySelect(category.id)}
                  disabled={isLoading || isDisabled}
                >
                  <View style={styles.instrumentRow}>
                    {React.cloneElement(getCategoryIcon(category.id), { color: iconColor })}
                    <Text style={[styles.instrumentLabel, { color: textColor }]}>
                      {category.name}
                    </Text>
                    {isDisabled && (
                      <Text style={styles.comingSoonText}>開発中</Text>
                    )}
                  </View>
                  {selectedCategory === category.id && (
                    <MaterialIcons name="check" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
            
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
            
            {currentCategory?.instruments.map((instrument) => {
              // サクソフォン以外はグレーアウト（無効化）
              const isDisabled = instrument.id !== 'saxophone';
              // グレーアウト時の色
              const textColor = isDisabled ? '#CCCCCC' : '#1C1C1E';
              const iconColor = isDisabled ? '#CCCCCC' : '#1C1C1E';
              
              return (
                <TouchableOpacity
                  key={instrument.id}
                  style={[
                    styles.instrumentItem,
                    selectedInstrument === instrument.id && styles.selectedInstrumentItem,
                    isDisabled && styles.disabledInstrumentItem
                  ]}
                  onPress={() => handleInstrumentSelect(instrument.id)}
                  disabled={isLoading || isDisabled}
                >
                  <View style={styles.instrumentRow}>
                    {React.cloneElement(getInstrumentIcon(instrument.id), { color: iconColor })}
                    <Text style={[styles.instrumentLabel, { color: textColor }]}>
                      {instrument.name}
                    </Text>
                    {isDisabled && (
                      <Text style={styles.comingSoonText}>開発中</Text>
                    )}
                  </View>
                  {selectedInstrument === instrument.id && (
                    <MaterialIcons name="check" size={24} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
            
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
            
            {/* 実際のモデルリストからフィルタリングして表示 */}
            <TouchableOpacity
              key="standard"
              style={[
                styles.instrumentItem,
                selectedModel === 'standard' && styles.selectedInstrumentItem
              ]}
              onPress={() => handleModelSelect('standard')}
              disabled={isLoading}
            >
              <View style={styles.instrumentRow}>
                <Text style={styles.instrumentLabel}>スタンダードモデル</Text>
              </View>
              {selectedModel === 'standard' && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              key="professional"
              style={[
                styles.instrumentItem,
                (selectedModel !== 'standard') && styles.selectedInstrumentItem,
                styles.artistModelItem
              ]}
              onPress={() => {
                // 選択中のアーティストモデルIDがあればそのまま使用、なければueno（デフォルト）を使用
                const currentModelId = selectedModel !== 'standard' ? selectedModel : 'ueno';
                handleModelSelect(currentModelId);
              }}
              disabled={isLoading}
            >
              <View style={styles.instrumentRow}>
                <Text style={styles.instrumentLabel}>プロフェッショナルモデル</Text>
                <View style={styles.betaBadge}>
                  <Text style={styles.betaBadgeText}>BETA</Text>
                </View>
              </View>
              {selectedModel !== 'standard' && (
                <MaterialIcons name="check" size={24} color="#007AFF" />
              )}
            </TouchableOpacity>
            
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
  disabledInstrumentItem: {
    backgroundColor: '#F8F8F8',
    borderColor: '#E5E5EA',
    borderWidth: 1,
    opacity: 0.8,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#999999',
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
    overflow: 'hidden',
  },
}); 