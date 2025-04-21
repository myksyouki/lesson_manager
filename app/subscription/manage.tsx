import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

export default function SubscriptionManageScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState('無料プラン');
  const [subscriptionEndDate, setSubscriptionEndDate] = useState<Date | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
      if (user) {
        // サブスクリプション情報を取得
        fetchSubscriptionStatus(user.uid);
      } else {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchSubscriptionStatus = async (userId: string) => {
    try {
      const db = getFirestore();
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        if (userData.subscription && userData.subscription.status === 'active') {
          setSubscriptionStatus('プレミアムプラン');
          if (userData.subscription.currentPeriodEnd) {
            setSubscriptionEndDate(new Date(userData.subscription.currentPeriodEnd.toDate()));
          }
        } else {
          setSubscriptionStatus('無料プラン');
        }
      }
    } catch (error) {
      console.error('サブスクリプション情報取得エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // サブスクリプションステータス表示コンポーネント
  const SubscriptionStatus = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>読み込み中...</Text>
        </View>
      );
    }

    const isPremium = subscriptionStatus === 'プレミアムプラン';
    
    return (
      <View style={[styles.statusCard, isPremium ? styles.premiumCard : styles.freeCard]}>
        <View style={styles.statusHeader}>
          <MaterialIcons 
            name={isPremium ? "stars" : "info"} 
            size={24} 
            color={isPremium ? "#FFD700" : "#9E9E9E"} 
          />
          <Text style={styles.statusTitle}>{subscriptionStatus}</Text>
        </View>
        
        {isPremium && subscriptionEndDate && (
          <Text style={styles.renewalDate}>
            次回更新日: {subscriptionEndDate.toLocaleDateString('ja-JP')}
          </Text>
        )}
        
        <Text style={styles.statusDescription}>
          {isPremium 
            ? '現在プレミアムプランを利用中です。すべての機能を利用できます。'
            : '無料プランを利用中です。一部の機能に制限があります。'}
        </Text>
      </View>
    );
  };

  // サブスクリプションボタンコンポーネント
  const SubscriptionButton = () => {
    const isPremium = subscriptionStatus === 'プレミアムプラン';
    
    if (isPremium) {
      return (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => {
              Alert.alert(
                'サブスクリプション管理',
                'App Storeからサブスクリプションを管理しますか？',
                [
                  { text: 'キャンセル', style: 'cancel' },
                  { text: '管理する', onPress: () => handleManageSubscription() }
                ]
              );
            }}
          >
            <Text style={styles.manageButtonText}>サブスクリプションを管理</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.upgradeButton}
          onPress={() => router.push('/subscription/plans')}
        >
          <Text style={styles.upgradeButtonText}>プレミアムにアップグレード</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleManageSubscription = () => {
    // App Storeのサブスクリプション管理ページへリンク
    // 実装例：
    // Linking.openURL('https://apps.apple.com/account/subscriptions');
    Alert.alert('サブスクリプション管理', 'この機能は現在実装中です。');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'サブスクリプション管理',
        headerStyle: {
          backgroundColor: '#f7f7f7',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }} />
      
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
          <Text style={styles.title}>サブスクリプション管理</Text>
          
          {/* サブスクリプションステータス */}
          <View style={styles.statusSection}>
            <Text style={styles.sectionTitle}>現在のプラン</Text>
            <SubscriptionStatus />
          </View>
          
          {/* プラン選択ボタン */}
          {isLoggedIn && <SubscriptionButton />}
          
          {!isLoggedIn && (
            <View style={styles.loginMessage}>
              <Text style={styles.loginText}>
                サブスクリプションを管理するにはログインしてください。
              </Text>
              <TouchableOpacity
                style={styles.loginButton}
                onPress={() => router.push('/auth/login')}
              >
                <Text style={styles.loginButtonText}>ログイン</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {/* プラン比較セクション */}
          <View style={styles.comparisonSection}>
            <Text style={styles.sectionTitle}>プラン比較</Text>
            
            <View style={styles.planComparisonCard}>
              <View style={styles.planRow}>
                <Text style={styles.planFeature}>機能</Text>
                <Text style={styles.planHeaderFree}>スタンダードプラン</Text>
                <Text style={styles.planHeaderPremium}>プロフェッショナル</Text>
              </View>
              
              <View style={styles.divider} />
              
              <View style={styles.planRow}>
                <Text style={styles.planFeature}>音声アップロード</Text>
                <Text style={styles.planFree}>4回/月</Text>
                <Text style={styles.planPremium}>無制限</Text>
              </View>
              
              <View style={styles.planRow}>
                <Text style={styles.planFeature}>チャット</Text>
                <Text style={styles.planFree}>スタンダードモデルのみ</Text>
                <Text style={styles.planPremium}>アーティストモデル対応</Text>
              </View>
              
              <View style={styles.planRow}>
                <Text style={styles.planFeature}>料金</Text>
                <Text style={styles.planFree}>無料</Text>
                <Text style={styles.planPremium}>¥980/月</Text>
              </View>
            </View>
          </View>
          
          {/* サブスクリプション詳細ボタン */}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => router.push('/subscription/plans')}
          >
            <Text style={styles.detailsButtonText}>プラン詳細を見る</Text>
          </TouchableOpacity>
          
          {/* 注意事項セクション */}
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>サブスクリプションについて</Text>
            <Text style={styles.infoText}>
              • サブスクリプションは毎月自動的に更新されます。{'\n'}
              • いつでもキャンセル可能で、次の請求サイクルから適用されます。{'\n'}
              • 購入後はApp Storeからサブスクリプションの管理が可能です。
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
    paddingTop: StatusBar.currentHeight,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  statusCard: {
    borderRadius: 12,
    padding: 20,
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
  premiumCard: {
    backgroundColor: '#f0f7ff',
    borderLeftWidth: 4,
    borderLeftColor: '#4285F4',
  },
  freeCard: {
    backgroundColor: '#f7f7f7',
    borderLeftWidth: 4,
    borderLeftColor: '#9E9E9E',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  renewalDate: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  statusDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  upgradeButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  manageButton: {
    backgroundColor: '#f5f5f5',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  manageButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loginMessage: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 10,
  },
  loginButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  comparisonSection: {
    marginVertical: 20,
  },
  planComparisonCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  planRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 46,
  },
  planFeature: {
    flex: 2,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    paddingRight: 5,
  },
  planFree: {
    flex: 1.5,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  planPremium: {
    flex: 1.5,
    fontSize: 14,
    color: '#4285F4',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  detailsButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4285F4',
    marginVertical: 10,
  },
  detailsButtonText: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f0f7ff',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#444',
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
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    color: '#666',
  },
  planHeaderFree: {
    flex: 1.5,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  planHeaderPremium: {
    flex: 1.5,
    fontSize: 13,
    color: '#4285F4',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 