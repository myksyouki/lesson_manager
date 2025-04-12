import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { getCurrentSubscription, SubscriptionStatus as SubStatus, initializeIAP } from '../services/subscriptions';

export default function SubscriptionStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubStatus | null>(null);
  const auth = getAuth();
  const router = useRouter();

  // サブスクリプション情報を取得
  const fetchSubscriptionInfo = async () => {
    setLoading(true);
    try {
      // IAPを初期化
      await initializeIAP();
      
      // サブスクリプション状態を取得
      const subInfo = await getCurrentSubscription();
      setSubscription(subInfo);
      setError(null);
    } catch (err) {
      console.error('サブスクリプション情報取得エラー:', err);
      setError('サブスクリプション情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // ユーザー認証状態が変わったらサブスクリプション情報を取得
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      setSubscription(null);
      return;
    }

    fetchSubscriptionInfo();

    // ユーザーがアプリに戻ってきたときにも再取得
    const unsubscribeAuthState = auth.onAuthStateChanged(user => {
      if (user) {
        fetchSubscriptionInfo();
      } else {
        setSubscription(null);
      }
    });
    
    return () => {
      unsubscribeAuthState();
    };
  }, [auth.currentUser]);

  // サブスクリプション管理画面へ移動
  const handleManageSubscription = () => {
    router.push('/subscription/manage');
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#6772e5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchSubscriptionInfo}>
          <Text style={styles.retryText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!subscription || !subscription.active) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>現在、有効なサブスクリプションはありません</Text>
        <TouchableOpacity 
          style={styles.manageButton}
          onPress={() => router.push('/subscription/plans')}
        >
          <Text style={styles.manageButtonText}>プランを見る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>サブスクリプション状態</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.label}>ステータス:</Text>
        <Text style={[styles.status, styles.active]}>
          アクティブ
        </Text>
      </View>

      <View style={styles.planContainer}>
        <Text style={styles.label}>プラン:</Text>
        <Text style={styles.planName}>
          {subscription.plan === 'premium' ? 'プレミアムプラン' : 'スタンダードプラン'}
        </Text>
      </View>

      {subscription.expiryDate && (
        <View style={styles.expiryContainer}>
          <Text style={styles.label}>有効期限:</Text>
          <Text style={styles.expiryDate}>
            {subscription.expiryDate.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.manageButton}
        onPress={handleManageSubscription}
      >
        <Text style={styles.manageButtonText}>サブスクリプションを管理</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#f7f7f7',
    borderRadius: 8,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  planContainer: {
    marginTop: 5,
    marginBottom: 10,
  },
  expiryContainer: {
    marginTop: 5,
    marginBottom: 15,
  },
  label: {
    fontWeight: 'bold',
    marginRight: 5,
  },
  status: {
    fontWeight: '500',
  },
  active: {
    color: '#4CAF50',
  },
  inactive: {
    color: '#F44336',
  },
  text: {
    color: '#666',
    marginBottom: 10,
  },
  planName: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 3,
  },
  expiryDate: {
    fontSize: 14,
    color: '#555',
    marginTop: 3,
  },
  errorText: {
    color: '#F44336',
    marginBottom: 10,
  },
  retryText: {
    color: '#4A90E2',
    textDecorationLine: 'underline',
  },
  manageButton: {
    backgroundColor: '#4A90E2',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 10,
  },
  manageButtonText: {
    color: 'white',
    fontWeight: '500',
  }
}); 