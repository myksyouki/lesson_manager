import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { initializeIAP, purchaseSubscription, SubscriptionIds, getAvailableSubscriptions, getCurrentSubscription } from '../services/subscriptions';

interface SubscriptionButtonProps {
  plan: 'standard' | 'premium';
  price?: string;
  title?: string;
}

export default function SubscriptionButton({ plan, price, title }: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const router = useRouter();
  const auth = getAuth();

  // コンポーネントマウント時にIAPを初期化
  useEffect(() => {
    const setupIAP = async () => {
      try {
        await initializeIAP();
        setInitialized(true);
        
        // 現在のサブスクリプション状態を取得
        const subscription = await getCurrentSubscription();
        setCurrentPlan(subscription.plan);
      } catch (error) {
        console.error('IAP初期化エラー:', error);
      }
    };

    setupIAP();
  }, []);

  const handleSubscription = async () => {
    if (!auth.currentUser) {
      Alert.alert('エラー', 'サブスクリプションを購入するにはログインしてください。');
      router.push('/auth/login');
      return;
    }

    // 既に該当プランをサブスクリプション中の場合
    if (currentPlan === plan) {
      Alert.alert(
        '既にサブスクリプション中',
        `${plan === 'premium' ? 'プロフェッショナル' : 'スタンダード'}プランは既にサブスクリプション中です。`,
        [
          {
            text: '管理画面を開く',
            onPress: () => router.push('/subscription/manage')
          },
          {
            text: 'キャンセル',
            style: 'cancel'
          }
        ]
      );
      return;
    }

    if (!initialized) {
      Alert.alert('エラー', '購入システムの初期化中です。しばらくお待ちください。');
      return;
    }

    setLoading(true);

    try {
      // 利用可能なサブスクリプションを取得
      const subscriptions = await getAvailableSubscriptions();
      
      if (subscriptions.length === 0) {
        Alert.alert('エラー', 'サブスクリプション情報を取得できませんでした。');
        return;
      }
      
      // スタンダードプランに切り替える場合は確認
      if (currentPlan === 'premium' && plan === 'standard') {
        Alert.alert(
          'プランのダウングレード',
          'プロフェッショナルプランからスタンダードプランへのダウングレードは、現在の期間が終了した後に適用されます。続行しますか？',
          [
            {
              text: '続行',
              onPress: async () => {
                await handlePurchase();
              }
            },
            {
              text: 'キャンセル',
              style: 'cancel',
              onPress: () => setLoading(false)
            }
          ]
        );
        return;
      }
      
      // プレミアムプランに切り替える場合
      await handlePurchase();
      
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('エラー', '購読処理中にエラーが発生しました。');
      setLoading(false);
    }
  };
  
  const handlePurchase = async () => {
    try {
      // 選択されたプランのIDを取得
      const productId = plan === 'premium' 
        ? SubscriptionIds.PREMIUM 
        : SubscriptionIds.STANDARD;
      
      console.log(`サブスクリプション購入を開始: ${productId}`);
      
      // サブスクリプションを購入
      await purchaseSubscription(productId);
      
      // 注意: 実際の購入完了はリスナーで処理される
      console.log('購入プロセスを開始しました');
    } catch (error) {
      console.error('購入処理エラー:', error);
      Alert.alert('エラー', '購入処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // ボタンのタイトルを決定
  const getButtonTitle = () => {
    if (currentPlan === plan) {
      return plan === 'premium' ? '現在のプラン（プロフェッショナル）' : '現在のプラン（スタンダード）';
    }
    
    return title || (plan === 'premium' ? 'プロフェッショナルプランに登録' : 'スタンダードプランに登録');
  };

  // ボタンのスタイルを決定
  const getButtonStyle = () => {
    if (currentPlan === plan) {
      if (plan === 'premium') {
        return [styles.button, styles.premiumButton, styles.currentPlanButton];
      } else {
        return [styles.button, styles.standardButton, styles.currentPlanButton];
      }
    } else {
      if (plan === 'premium') {
        return [styles.button, styles.premiumButton];
      } else {
        return [styles.button, styles.standardButton];
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handleSubscription}
        disabled={loading || !initialized}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text style={styles.buttonText}>{getButtonTitle()}</Text>
            {price && <Text style={styles.priceText}>{price}</Text>}
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 20,
  },
  button: {
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  standardButton: {
    backgroundColor: '#4A90E2',
  },
  premiumButton: {
    backgroundColor: '#6772e5',
  },
  currentPlanButton: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  priceText: {
    color: '#ffffff',
    fontSize: 14,
    marginTop: 5,
  },
}); 