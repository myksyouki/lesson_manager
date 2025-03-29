import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../config/firebase';

interface Subscription {
  status: string;
  price: {
    id: string;
    product: string;
  };
  items: Array<{
    price: {
      product: {
        name: string;
        description: string;
      };
    };
  }>;
}

export default function SubscriptionStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const auth = getAuth();

  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const userId = auth.currentUser.uid;
    const customerRef = doc(db, 'customers', userId);
    
    const unsubscribe = onSnapshot(
      customerRef,
      (snapshot) => {
        setLoading(true);
        
        const data = snapshot.data();
        if (!data) {
          setLoading(false);
          return;
        }
        
        // サブスクリプション情報を取得
        const subscriptions = data.subscriptions;
        if (subscriptions) {
          // アクティブなサブスクリプションを探す
          const activeSubscription = Object.values(subscriptions).find(
            (sub: any) => sub.status === 'active' || sub.status === 'trialing'
          ) as Subscription | undefined;
          
          setSubscription(activeSubscription || null);
        } else {
          setSubscription(null);
        }
        
        setLoading(false);
      },
      (err) => {
        console.error('Subscription status error:', err);
        setError('サブスクリプション情報の取得に失敗しました');
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [auth.currentUser]);

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
      </View>
    );
  }

  if (!subscription) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>現在、有効なサブスクリプションはありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>サブスクリプション状態</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.label}>ステータス:</Text>
        <Text style={[
          styles.status,
          subscription.status === 'active' || subscription.status === 'trialing' 
            ? styles.active 
            : styles.inactive
        ]}>
          {subscription.status === 'active' ? 'アクティブ' : 
           subscription.status === 'trialing' ? 'トライアル中' : 
           subscription.status === 'canceled' ? 'キャンセル済み' : 
           subscription.status === 'past_due' ? '支払い期限切れ' : 
           subscription.status}
        </Text>
      </View>

      {subscription.items?.[0]?.price?.product && (
        <View style={styles.planContainer}>
          <Text style={styles.label}>プラン:</Text>
          <Text style={styles.planName}>
            {subscription.items[0].price.product.name || 'プレミアムプラン'}
          </Text>
          {subscription.items[0].price.product.description && (
            <Text style={styles.description}>
              {subscription.items[0].price.product.description}
            </Text>
          )}
        </View>
      )}
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
  },
  planName: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 3,
  },
  description: {
    color: '#666',
    fontSize: 14,
    marginTop: 3,
  },
  errorText: {
    color: '#F44336',
  },
}); 