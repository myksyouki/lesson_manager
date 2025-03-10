import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PrivacyPolicyScreen = () => {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>プライバシーポリシー</Text>
        </View>

        <View style={styles.content}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            1. 個人情報の収集
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            本アプリは、サービスの提供・改善のために以下の個人情報を収集することがあります：
            {'\n\n'}・お名前
            {'\n'}・メールアドレス
            {'\n'}・利用状況データ
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            2. 個人情報の利用目的
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            収集した個人情報は以下の目的で利用します：
            {'\n\n'}・サービスの提供・運営
            {'\n'}・お問い合わせへの対応
            {'\n'}・サービスの改善・新機能開発
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            3. 個人情報の第三者提供
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            法令に基づく場合を除き、収集した個人情報を第三者に提供することはありません。
          </Text>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            4. プライバシーポリシーの変更
          </Text>
          <Text style={[styles.text, { color: colors.text }]}>
            本ポリシーは必要に応じて変更されることがあります。変更内容は本ページに掲載します。
          </Text>

          <Text style={[styles.updateDate, { color: colors.text }]}>
            最終更新日：2025年3月11日
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  updateDate: {
    fontSize: 12,
    marginTop: 32,
    textAlign: 'right',
    opacity: 0.6,
  },
});

export default PrivacyPolicyScreen;
