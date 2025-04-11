import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { initializeIAP, getCurrentSubscription, SubscriptionStatus } from '../../services/subscriptions';

export default function SubscriptionManageScreen() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const router = useRouter();
  const auth = getAuth();

  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      try {
        setLoading(true);
        
        // IAPを初期化
        await initializeIAP();
        
        // サブスクリプション情報を取得
        const subInfo = await getCurrentSubscription();
        setSubscription(subInfo);
      } catch (error) {
        console.error('サブスクリプション情報取得エラー:', error);
        Alert.alert('エラー', 'サブスクリプション情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubscriptionInfo();
  }, []);

  // サブスクリプション管理（App Store/Google Play設定に移動）
  const handleManageSubscription = async () => {
    try {
      let url = '';
      
      if (Platform.OS === 'ios') {
        url = 'https://apps.apple.com/account/subscriptions';
      } else if (Platform.OS === 'android') {
        url = 'https://play.google.com/store/account/subscriptions';
      }
      
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'エラー', 
          'サブスクリプション管理ページを開けませんでした。App Store/Google Playアプリから直接管理してください。'
        );
      }
    } catch (error) {
      console.error('リンクを開くエラー:', error);
      Alert.alert('エラー', 'サブスクリプション管理ページを開けませんでした。');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4A90E2" />
        <Text style={styles.loadingText}>サブスクリプション情報を読み込み中...</Text>
      </View>
    );
  }

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
        <Text style={styles.headerTitle}>サブスクリプション管理</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {!subscription || !subscription.active ? (
          <View style={styles.noSubscriptionContainer}>
            <MaterialIcons name="info-outline" size={48} color="#888" />
            <Text style={styles.noSubscriptionText}>
              現在アクティブなサブスクリプションはありません
            </Text>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/subscription/plans')}
            >
              <Text style={styles.actionButtonText}>プランを選択する</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.subscriptionContainer}>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>現在のプラン</Text>
                <View style={[
                  styles.statusBadge, 
                  subscription.autoRenewing ? styles.activeStatus : styles.inactiveStatus
                ]}>
                  <Text style={styles.statusText}>
                    {subscription.autoRenewing ? '自動更新' : '自動更新オフ'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.cardContent}>
                <Text style={styles.planName}>
                  {subscription.plan === 'premium' ? 'プレミアムプラン' : 'スタンダードプラン'}
                </Text>
                
                {subscription.purchaseDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>開始日:</Text>
                    <Text style={styles.infoValue}>
                      {subscription.purchaseDate.toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                )}
                
                {subscription.expiryDate && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>次回更新日:</Text>
                    <Text style={styles.infoValue}>
                      {subscription.expiryDate.toLocaleDateString('ja-JP')}
                    </Text>
                  </View>
                )}
                
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>プラットフォーム:</Text>
                  <Text style={styles.infoValue}>
                    {subscription.platform === 'ios' ? 'App Store' : 
                     subscription.platform === 'android' ? 'Google Play' : '不明'}
                  </Text>
                </View>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleManageSubscription}
            >
              <Text style={styles.actionButtonText}>サブスクリプションを管理する</Text>
            </TouchableOpacity>
            
            <Text style={styles.infoText}>
              サブスクリプションの変更やキャンセルは、{Platform.OS === 'ios' ? 'App Store' : 'Google Play'}の設定から行えます。
              {'\n\n'}
              キャンセルしても、現在の期間の終了まではサービスを利用できます。
            </Text>
          </View>
        )}
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
  noSubscriptionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noSubscriptionText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginTop: 16,
    marginBottom: 30,
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscriptionContainer: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    width: '100%',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  activeStatus: {
    backgroundColor: '#E3F2FD',
  },
  inactiveStatus: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  cardContent: {
    marginBottom: 16,
  },
  planName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  infoLabel: {
    width: 100,
    fontSize: 16,
    color: '#666',
  },
  infoValue: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 30,
    textAlign: 'center',
  },
}); 