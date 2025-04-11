import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { initializeIAP, purchaseSubscription, SubscriptionIds, getAvailableSubscriptions } from '../services/subscriptions';

interface SubscriptionButtonProps {
  plan: 'standard' | 'premium';
  price?: string;
  title?: string;
}

export default function SubscriptionButton({ plan, price, title }: SubscriptionButtonProps) {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const auth = getAuth();

  // コンポーネントマウント時にIAPを初期化
  useEffect(() => {
    const setupIAP = async () => {
      try {
        const result = await initializeIAP();
        setInitialized(result);
        if (!result) {
          console.error('IAP初期化に失敗しました');
        }
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
      console.error('Subscription error:', error);
      Alert.alert('エラー', '購読処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  // ボタンのタイトルを決定
  const buttonTitle = title || (plan === 'premium' ? 'プレミアムプランに登録' : 'スタンダードプランに登録');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, plan === 'premium' ? styles.premiumButton : styles.standardButton]}
        onPress={handleSubscription}
        disabled={loading || !initialized}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <>
            <Text style={styles.buttonText}>{buttonTitle}</Text>
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