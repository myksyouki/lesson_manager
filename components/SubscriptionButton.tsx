import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import * as WebBrowser from 'expo-web-browser';

import { db } from '../config/firebase';

interface PortalLinkResponse {
  url: string;
}

interface CheckoutSessionResponse {
  url: string;
}

export default function SubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const auth = getAuth();
  const functions = getFunctions();

  const handleSubscription = async () => {
    if (!auth.currentUser) {
      Alert.alert('エラー', 'サブスクリプションを購入するにはログインしてください。');
      router.push('/auth/login');
      return;
    }

    setLoading(true);

    try {
      // ユーザーの購読状態を確認
      const customerRef = doc(db, 'customers', auth.currentUser.uid);
      const customerDoc = await getDoc(customerRef);
      
      if (customerDoc.exists() && customerDoc.data()?.subscriptions) {
        // すでに購読している場合はポータルリンクを取得
        const createPortalLink = httpsCallable<any, PortalLinkResponse>(functions, 'ext-firestore-stripe-payments-createPortalLink');
        const { data } = await createPortalLink({ returnUrl: window.location.origin });
        
        // ポータルリンクに移動
        await WebBrowser.openBrowserAsync(data.url);
      } else {
        // 購読していない場合はチェックアウトセッションを作成
        const createCheckoutSession = httpsCallable<any, CheckoutSessionResponse>(functions, 'ext-firestore-stripe-payments-createCheckoutSession');
        
        // プラン指定（Stripeで作成したプランID）
        const { data } = await createCheckoutSession({
          price: 'price_YOUR_PRICE_ID', // ここにStripeで作成した価格IDを入力
          success_url: window.location.origin,
          cancel_url: window.location.origin,
        });
        
        // チェックアウトページに移動
        await WebBrowser.openBrowserAsync(data.url);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('エラー', '購読処理中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={handleSubscription}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>プレミアムプランに登録</Text>
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
    backgroundColor: '#6772e5',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 