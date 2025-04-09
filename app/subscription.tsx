import React from 'react';
import { StyleSheet, View, Text, ScrollView, SafeAreaView, StatusBar, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import SubscriptionButton from '../components/SubscriptionButton';
import SubscriptionStatus from '../components/SubscriptionStatus';

export default function SubscriptionScreen() {
  const auth = getAuth();
  const isLoggedIn = !!auth.currentUser;
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ 
        title: 'サブスクリプション',
        headerStyle: {
          backgroundColor: '#f7f7f7',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        headerLeft: () => (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
        ),
      }} />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>プレミアムプラン</Text>
          
          <View style={styles.planCard}>
            <Text style={styles.planTitle}>プレミアムメンバーシップ</Text>
            <Text style={styles.price}>¥980 / 月</Text>
            
            <View style={styles.divider} />
            
            <Text style={styles.featureTitle}>特典</Text>
            <View style={styles.featureContainer}>
              <Text style={styles.featureItem}>• 無制限のメッセージ送信</Text>
              <Text style={styles.featureItem}>• 高度なAI機能へのアクセス</Text>
              <Text style={styles.featureItem}>• より多くのファイルアップロード</Text>
              <Text style={styles.featureItem}>• 優先サポート</Text>
            </View>
          </View>
          
          {isLoggedIn && (
            <>
              <View style={styles.statusSection}>
                <Text style={styles.sectionTitle}>現在のステータス</Text>
                <SubscriptionStatus />
              </View>
              
              <SubscriptionButton />
            </>
          )}
          
          {!isLoggedIn && (
            <View style={styles.loginMessage}>
              <Text style={styles.loginText}>
                サブスクリプションを購入するにはログインしてください。
              </Text>
            </View>
          )}
          
          <View style={styles.infoSection}>
            <Text style={styles.infoTitle}>サブスクリプションについて</Text>
            <Text style={styles.infoText}>
              • サブスクリプションは毎月自動的に更新されます。{'\n'}
              • いつでもキャンセル可能で、次の請求サイクルから適用されます。{'\n'}
              • 購入後はStripeのカスタマーポータルから支払い方法の変更やサブスクリプションの管理が可能です。
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
  planCard: {
    backgroundColor: '#f7f7f7',
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
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  price: {
    fontSize: 24,
    color: '#6772e5',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  featureContainer: {
    marginBottom: 10,
  },
  featureItem: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  statusSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loginMessage: {
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  loginText: {
    fontSize: 16,
    color: '#555',
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
  backButton: {
    padding: 10,
  },
}); 