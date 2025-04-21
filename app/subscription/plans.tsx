import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Image,
  SafeAreaView
} from 'react-native';
import { Link, useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import SubscriptionButton from '../../components/SubscriptionButton';
import {
  SubscriptionIds,
  getAvailableSubscriptions,
  initializeIAP,
  setupPurchaseListeners,
  endIAPConnection,
  purchaseSubscription
} from '../../services/subscriptions';
import { useAuthStore } from '../../store/auth';
import { verifySubscriptionReceipt } from '../services/receiptService';

// react-native-iapのインポートをコメントアウト
// import { Subscription } from 'react-native-iap';

// 代わりにローカルの型定義を使用
interface Subscription {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  subscriptionPeriodNumberIOS?: number;
  subscriptionPeriodUnitIOS?: string;
}

export default function SubscriptionPlansScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const auth = getAuth();

  // IAPの初期化と利用可能なサブスクリプションの取得
  useEffect(() => {
    const setupSubscriptions = async () => {
      try {
        setLoading(true);
        
        // IAPを初期化
        await initializeIAP();
        
        // 利用可能なサブスクリプションを取得
        const availableSubs = await getAvailableSubscriptions();
        setSubscriptions(availableSubs);
        
        // 購入リスナーを設定
        setupPurchaseListeners(
          async (purchase) => {
            console.log('購入完了:', purchase);
            // レシート検証
            const receipt = (purchase as any).transactionReceipt || (purchase as any).receipt;
            if (receipt) {
              try {
                await verifySubscriptionReceipt(
                  receipt,
                  Platform.OS === 'ios' ? 'ios' : 'android',
                  purchase.productId
                );
                console.log('サーバ検証成功');
              } catch (error) {
                console.error('サーバ検証エラー:', error);
              }
            }

            Alert.alert(
              '購入完了', 
              'サブスクリプションを購入しました。', 
              [
                { 
                  text: 'OK', 
                  onPress: () => router.push('/subscription/manage') 
                }
              ]
            );
          },
          (error) => {
            console.error('購入エラー:', error);
            Alert.alert('エラー', '購入処理中にエラーが発生しました。');
          }
        );
      } catch (error) {
        console.error('サブスクリプション設定エラー:', error);
        Alert.alert('エラー', 'サブスクリプション情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    
    setupSubscriptions();
    
    // クリーンアップ
    return () => {
      endIAPConnection();
    };
  }, [router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>プラン情報を読み込み中...</Text>
      </View>
    );
  }

  // プラン情報
  const standardFeatures = [
    'レッスン音声アップロード：4回/月',
    'チャット：スタンダードモデルのみ使用可能',
  ];

  const professionalFeatures = [
    'レッスン音声アップロード：無制限',
    'チャット：アーティストモデルも使用可能',
  ];

  // 価格情報を取得
  const getPrice = (type: 'standard' | 'premium') => {
    const productId = type === 'premium' ? SubscriptionIds.PREMIUM : SubscriptionIds.STANDARD;
    const product = subscriptions.find(sub => sub.productId === productId);
    
    // デフォルト価格
    const defaultPrice = type === 'premium' ? '¥980/月' : '無料';
    
    if (!product) {
      return defaultPrice;
    }
    
    // React Native IAPは型定義が完全ではないためany型にキャストして処理
    const productAny = product as any;
    
    if (productAny.localizedPrice) {
      return productAny.localizedPrice;
    } else if (productAny.price) {
      return productAny.price;
    } else if (productAny.priceString) {
      return productAny.priceString;
    }
    
    return defaultPrice;
  };

  // プラン選択の処理
  const handlePlanSelection = (plan: string) => {
    setSelectedPlan(plan as 'monthly' | 'yearly');
  };

  // サブスクリプション購入処理
  const handleSubscribe = async () => {
    // ユーザーがログインしていない場合はログイン画面に誘導
    if (!user) {
      Alert.alert(
        'ログインが必要です',
        'サブスクリプションを購入するにはログインが必要です。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: 'ログイン', onPress: () => router.push('/auth/login') }
        ]
      );
      return;
    }

    try {
      setIsLoading(true);
      // 選択中のプランに応じた productId を取得
      const productId = selectedPlan === 'monthly'
        ? SubscriptionIds.STANDARD
        : SubscriptionIds.PREMIUM;
      // 実際に購入処理を呼び出す
      await purchaseSubscription(productId);
      // 成功後は購入リスナーで Alert と画面遷移を行います
    } catch (error) {
      console.error('購入処理エラー:', error);
      Alert.alert('エラー', 'サブスクリプションの購入中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  // 価格情報
  const prices = {
    monthly: {
      price: '980',
      period: '月額',
      savings: '0%割引'
    },
    yearly: {
      price: '9,800',
      period: '年額',
      savings: '17%割引'
    }
  };

  // 型安全のために型を定義
  type PlanType = 'monthly' | 'yearly';
  type PricesType = {
    [key in PlanType]: {
      price: string;
      period: string;
      savings: string;
    }
  };

  const typedPrices = prices as PricesType;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'サブスクリプションプラン',
        headerStyle: {
          backgroundColor: '#f7f7f7',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }} />
      
      <StatusBar style="dark" />
      
      <ScrollView style={styles.scrollView}>
        {/* 戻るボタン */}
        <TouchableOpacity
          style={styles.backButtonContainer}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
        
        <View style={styles.content}>
          <Text style={styles.title}>プレミアムプランに{'\n'}アップグレード</Text>
          <Text style={styles.subtitle}>すべての機能を使って音楽レッスンを最大限に活用しましょう</Text>
          
          {/* プラン選択 */}
          <View style={styles.planSelector}>
            <TouchableOpacity 
              style={[
                styles.planOption, 
                selectedPlan === 'monthly' && styles.selectedPlan
              ]}
              onPress={() => handlePlanSelection('monthly')}
            >
              <Text style={[
                styles.planOptionText,
                selectedPlan === 'monthly' && styles.selectedPlanText
              ]}>月額プラン</Text>
              {selectedPlan === 'monthly' && (
                <MaterialIcons name="check-circle" size={20} color="#4285F4" />
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.planOption, 
                selectedPlan === 'yearly' && styles.selectedPlan
              ]}
              onPress={() => handlePlanSelection('yearly')}
            >
              <View style={styles.planOptionContent}>
                <Text style={[
                  styles.planOptionText,
                  selectedPlan === 'yearly' && styles.selectedPlanText
                ]}>年額プラン</Text>
                <View style={styles.savingsTag}>
                  <Text style={styles.savingsText}>お得</Text>
                </View>
              </View>
              {selectedPlan === 'yearly' && (
                <MaterialIcons name="check-circle" size={20} color="#4285F4" />
              )}
            </TouchableOpacity>
          </View>
          
          {/* 選択したプランの詳細 */}
          <View style={styles.selectedPlanDetails}>
            <Text style={styles.selectedPlanPrice}>
              ¥{typedPrices[selectedPlan].price}
              <Text style={styles.selectedPlanPeriod}>/{typedPrices[selectedPlan].period}</Text>
            </Text>
            {selectedPlan === 'yearly' && (
              <Text style={styles.savingsDescription}>{typedPrices.yearly.savings}</Text>
            )}
          </View>
          
          {/* 特典リスト */}
          <View style={styles.featuresSection}>
            <Text style={styles.featuresSectionTitle}>プレミアム特典</Text>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>無制限のレッスン登録</Text>
                <Text style={styles.featureDescription}>
                  無制限に生徒とレッスンを登録できます
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>高度なAIアシスタント</Text>
                <Text style={styles.featureDescription}>
                  レッスン計画や教材作成のためのAIアシスタント機能が使い放題
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>5GBのファイルストレージ</Text>
                <Text style={styles.featureDescription}>
                  楽譜や教材、レッスン動画などを保存するための容量が増加
                </Text>
              </View>
            </View>
            
            <View style={styles.featureItem}>
              <MaterialIcons name="check-circle" size={24} color="#4CAF50" style={styles.featureIcon} />
              <View style={styles.featureTextContainer}>
                <Text style={styles.featureTitle}>優先サポート</Text>
                <Text style={styles.featureDescription}>
                  問題が発生した際に優先的にサポートを受けられます
                </Text>
              </View>
            </View>
          </View>
          
          {/* 購入ボタン */}
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.subscribeButtonText}>
                {selectedPlan === 'monthly' ? '月額プランに登録' : '年額プランに登録'}
              </Text>
            )}
          </TouchableOpacity>
          
          {/* 注意事項 */}
          <View style={styles.disclaimerSection}>
            <Text style={styles.disclaimerText}>
              • サブスクリプションは自動更新されます。{'\n'}
              • いつでも設定からキャンセル可能です。{'\n'}
              • 支払いは{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}アカウントに請求されます。
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  backButtonContainer: {
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 10,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  planSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 4,
  },
  planOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  planOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedPlan: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  planOptionText: {
    fontSize: 16,
    color: '#555',
  },
  selectedPlanText: {
    color: '#4285F4',
    fontWeight: 'bold',
  },
  savingsTag: {
    backgroundColor: '#FFECB3',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  savingsText: {
    fontSize: 10,
    color: '#FF8F00',
    fontWeight: 'bold',
  },
  selectedPlanDetails: {
    alignItems: 'center',
    marginBottom: 30,
  },
  selectedPlanPrice: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPlanPeriod: {
    fontSize: 16,
    color: '#666',
  },
  savingsDescription: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
  },
  featuresSection: {
    marginBottom: 30,
  },
  featuresSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 3,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  subscribeButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  disclaimerSection: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginTop: 10,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f7',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
}); 