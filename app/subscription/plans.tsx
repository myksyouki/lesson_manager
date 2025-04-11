import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import SubscriptionButton from '../../components/SubscriptionButton';
import {
  SubscriptionIds,
  getAvailableSubscriptions,
  initializeIAP,
  setupPurchaseListeners,
  endIAPConnection
} from '../../services/subscriptions';
import { Subscription } from 'react-native-iap';

export default function SubscriptionPlansScreen() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const router = useRouter();
  const auth = getAuth();

  // IAPの初期化と利用可能なサブスクリプションの取得
  useEffect(() => {
    const setupSubscriptions = async () => {
      try {
        setLoading(true);
        
        // IAPを初期化
        const initialized = await initializeIAP();
        if (!initialized) {
          Alert.alert('エラー', '課金システムの初期化に失敗しました。');
          return;
        }
        
        // 利用可能なサブスクリプションを取得
        const availableSubs = await getAvailableSubscriptions();
        setSubscriptions(availableSubs);
        
        // 購入リスナーを設定
        setupPurchaseListeners(
          (purchase) => {
            console.log('購入完了:', purchase);
            Alert.alert(
              '購入完了', 
              'サブスクリプションを購入しました。', 
              [
                { 
                  text: 'OK', 
                  onPress: () => router.push('/') 
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
    '1日5回までのレッスン登録',
    '音声トランスクリプション (10分まで)',
    '基本的なフィードバック機能',
  ];

  const premiumFeatures = [
    '無制限のレッスン登録',
    '音声トランスクリプション (無制限)',
    'プレミアムAIフィードバック',
    '詳細な分析機能',
    '優先サポート',
  ];

  // 価格情報を取得
  const getPrice = (type: 'standard' | 'premium') => {
    const productId = type === 'premium' ? SubscriptionIds.PREMIUM : SubscriptionIds.STANDARD;
    const product = subscriptions.find(sub => sub.productId === productId);
    
    // デフォルト価格
    const defaultPrice = type === 'premium' ? '¥1,200/月' : '¥600/月';
    
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

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>サブスクリプションプラン</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>プラン選択</Text>
        <Text style={styles.subtitle}>最適なプランを選んでレッスン管理を強化</Text>
        
        {/* スタンダードプラン */}
        <View style={[styles.planCard, styles.standardCard]}>
          <View style={styles.planHeader}>
            <Text style={styles.planTitle}>スタンダード</Text>
            <Text style={styles.planPrice}>{getPrice('standard')}</Text>
          </View>
          
          <View style={styles.featuresList}>
            {standardFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <FontAwesome name="check" size={16} color="#4A90E2" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <SubscriptionButton 
            plan="standard" 
            title="スタンダードプランを選択" 
            price={getPrice('standard')}
          />
        </View>
        
        {/* プレミアムプラン */}
        <View style={[styles.planCard, styles.premiumCard]}>
          <View style={styles.planBadge}>
            <Text style={styles.planBadgeText}>おすすめ</Text>
          </View>
          
          <View style={styles.planHeader}>
            <Text style={[styles.planTitle, styles.premiumTitle]}>プレミアム</Text>
            <Text style={[styles.planPrice, styles.premiumPrice]}>{getPrice('premium')}</Text>
          </View>
          
          <View style={styles.featuresList}>
            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <FontAwesome name="check" size={16} color="#6772e5" />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
          
          <SubscriptionButton 
            plan="premium" 
            title="プレミアムプランを選択" 
            price={getPrice('premium')}
          />
        </View>
        
        <Text style={styles.disclaimer}>
          • サブスクリプションは自動更新され、いつでもキャンセル可能です。{'\n'}
          • お支払いは{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}のアカウントに請求されます。{'\n'}
          • 更新は現在の期間が終了する24時間前までに行われます。{'\n'}
          • 購読はユーザーが管理でき、アカウント設定から自動更新を無効にできます。
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 10,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e8',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginRight: 40,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
  },
  standardCard: {
    borderWidth: 1,
    borderColor: '#e1e1e8',
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: '#6772e5',
  },
  planHeader: {
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  premiumTitle: {
    color: '#6772e5',
  },
  planPrice: {
    fontSize: 18,
    color: '#666',
  },
  premiumPrice: {
    color: '#6772e5',
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#444',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#6772e5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  planBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: '#888',
    lineHeight: 18,
    marginTop: 20,
    textAlign: 'center',
  },
}); 