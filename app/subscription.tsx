import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useAuthStore } from '../store/auth'; // Import auth store
import { getOfferings, purchasePackage, restorePurchases } from '../services/iapService'; // Import IAP functions
import { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

const PLAN_DETAILS = {
  standard_monthly: {
    title: 'スタンダードプラン',
    price: '¥1,000 / 月',
    features: [
      '基本的なAI機能へのアクセス',
      'レッスン記録の保存',
      '基本的な練習メニュー',
    ],
  },
  pro_monthly: {
    title: 'プロプラン',
    price: '¥10,000 / 月',
    features: [
      '全てのAI機能へのアクセス (高度な分析含む)',
      '無制限のレッスン記録保存',
      'パーソナライズされた練習メニュー',
      '優先サポート',
    ],
  },
};

export default function SubscriptionScreen() {
  const { user, premiumStatus } = useAuthStore();
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPurchasing, setIsPurchasing] = useState<string | null>(null); // Track which package is being purchased
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    const fetchOfferings = async () => {
      setIsLoading(true);
      const fetchedOfferings = await getOfferings();
      setOfferings(fetchedOfferings);
      setIsLoading(false);
    };

    if (user) {
      fetchOfferings();
    } else {
      setIsLoading(false); // Not logged in, no need to load offerings
    }
  }, [user]);

  const handlePurchase = async (pack: PurchasesPackage) => {
    setIsPurchasing(pack.identifier);
    const success = await purchasePackage(pack);
    if (!success) {
      Alert.alert('購入エラー', '購入処理中に問題が発生しました。');
    }
    setIsPurchasing(null);
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    const success = await restorePurchases();
    if (success) {
      Alert.alert('復元成功', '購入情報が復元されました。');
    } else {
      Alert.alert('復元エラー', '購入情報の復元に失敗しました。');
    }
    setIsRestoring(false);
  };

  const renderPackage = (pack: PurchasesPackage) => {
    const planKey = pack.product.identifier as keyof typeof PLAN_DETAILS;
    const details = PLAN_DETAILS[planKey];

    if (!details) {
      console.warn(`Plan details not found for identifier: ${planKey}`);
      return null; // Don't render if details are missing
    }

    return (
      <View key={pack.identifier} style={styles.planCard}>
        <Text style={styles.planTitle}>{details.title}</Text>
        {/* Use priceString from RevenueCat package */}
        <Text style={styles.price}>{pack.product.priceString} / 月</Text> 
        <View style={styles.divider} />
        <Text style={styles.featureTitle}>特典</Text>
        <View style={styles.featureContainer}>
          {details.features.map((feature, index) => (
            <Text key={index} style={styles.featureItem}>• {feature}</Text>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.purchaseButton, isPurchasing === pack.identifier && styles.disabledButton]}
          onPress={() => handlePurchase(pack)}
          disabled={isPurchasing !== null}
        >
          {isPurchasing === pack.identifier ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.purchaseButtonText}>
              {premiumStatus?.isPremium && premiumStatus.expiryDate ? 'プラン変更' : '購入する'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'サブスクリプション' }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>プランを選択</Text>

          {isLoading && <ActivityIndicator size="large" color="#6772e5" style={styles.loader} />}

          {!isLoading && !user && (
            <View style={styles.loginMessage}>
              <Text style={styles.loginText}>
                サブスクリプションを表示・購入するにはログインしてください。
              </Text>
            </View>
          )}

          {!isLoading && user && (
            <>
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>現在のステータス</Text>
                <Text style={styles.statusText}>
                  {premiumStatus?.isPremium ? `プレミアム会員 (有効期限: ${premiumStatus.expiryDate ? premiumStatus.expiryDate.toLocaleDateString() : 'N/A'})` : 'フリープラン'}
                </Text>
              </View>

              {offerings?.availablePackages.length === 0 && !isLoading && (
                 <Text style={styles.infoText}>現在利用可能なプランはありません。</Text>
              )}

              {offerings?.availablePackages.map(renderPackage)}

              <TouchableOpacity
                style={[styles.restoreButton, isRestoring && styles.disabledButton]}
                onPress={handleRestore}
                disabled={isRestoring}
              >
                {isRestoring ? (
                  <ActivityIndicator color="#6772e5" />
                ) : (
                  <Text style={styles.restoreButtonText}>購入情報を復元</Text>
                )}
              </TouchableOpacity>
            </>
          )}
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>サブスクリプションについて</Text>
            <Text style={styles.infoText}>
              • サブスクリプションは毎月自動的に更新されます。{'\n'}
              • いつでもキャンセル可能で、次の請求サイクルから適用されます。{'\n'}
              • 購入後はApp Storeのアカウント設定からサブスクリプションの管理が可能です。
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  loader: {
    marginVertical: 30,
  },
  planCard: {
    backgroundColor: '#f9f9f9', // Slightly lighter background
    borderRadius: 12,
    padding: 20,
    marginBottom: 25, // Increased spacing
    borderColor: '#eee', // Subtle border
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '600', // Semi-bold
    marginBottom: 8,
    color: '#222',
  },
  price: {
    fontSize: 22, // Slightly smaller price
    color: '#007AFF', // iOS blue
    fontWeight: 'bold',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginVertical: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  featureContainer: {
    marginBottom: 20, // More space before button
  },
  featureItem: {
    fontSize: 15, // Slightly smaller feature text
    marginBottom: 8,
    color: '#555',
    lineHeight: 22,
  },
  purchaseButton: {
    backgroundColor: '#007AFF', // iOS blue
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10, // Add some margin top
  },
  purchaseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    opacity: 0.6,
  },
  statusSection: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#eef7ff', // Light blue background for status
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
   statusText: {
    fontSize: 16,
    color: '#444',
  },
  loginMessage: {
    padding: 15,
    backgroundColor: '#fff3cd', // Light yellow for login prompt
    borderRadius: 8,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffeeba',
  },
  loginText: {
    fontSize: 16,
    color: '#856404', // Darker text for yellow background
  },
  restoreButton: {
    backgroundColor: '#f0f0f0', // Lighter background for restore
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  restoreButtonText: {
    color: '#007AFF', // iOS blue text
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    marginTop: 30, // More space before info section
    padding: 15,
    backgroundColor: '#f8f8f8', // Neutral background
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#444',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666', // Slightly lighter info text
  },
});   