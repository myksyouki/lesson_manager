import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { Image } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSettingsStore } from '../store/settings';
import { auth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RootScreen() {
  const { user, setUser, isDemo, isOnboardingCompleted } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const { theme } = useSettingsStore();
  const insets = useSafeAreaInsets();

  // 起動時にローディング状態を追加し、少し遅延させる
  useEffect(() => {
    // 安全にアプリを初期化するため、タイマーを使用
    const timer = setTimeout(() => {
      const unsubscribe = auth.onAuthStateChanged((authUser) => {
        if (authUser) {
          console.log('ユーザーが認証済みです:', authUser.uid);
          setUser(authUser);
        } else {
          console.log('ユーザーは認証されていません');
        }
        
        // 少し遅延してからローディング状態を解除
        setTimeout(() => {
          setIsLoading(false);
        }, 1000);
      });
      
      return () => {
        unsubscribe();
      };
    }, 2000); // 2秒待機してから初期化を開始
    
    return () => clearTimeout(timer);
  }, [setUser]);

  // ローディング表示
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme === 'dark' ? '#000' : '#fff' }]}>
        <ActivityIndicator size="large" color={theme === 'dark' ? '#fff' : '#212121'} />
        <Text style={[styles.loadingText, { color: theme === 'dark' ? '#fff' : '#212121' }]}>
          読み込み中...
        </Text>
      </View>
    );
  }

  // 認証状態に応じてリダイレクト
  if (!user && !isDemo) {
    return <Redirect href="/auth/login" />;
  }

  // オンボーディングチェック
  if (user && !isOnboardingCompleted && !isDemo) {
    return <Redirect href="/onboarding" />;
  }

  // メインアプリにリダイレクト
  return <Redirect href="/tabs" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 14,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 28,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 40,
  },
  loginButton: {
    marginBottom: 16,
    backgroundColor: '#4A6572',
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  signupButton: {
    marginBottom: 16,
    backgroundColor: '#344955',
    paddingVertical: 6,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  demoButton: {
    borderColor: colors.text.accent,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  buttonLabel: {
    fontSize: 17,
    fontWeight: 'bold',
    paddingVertical: 4,
    letterSpacing: 0.5,
  },
  demoButtonLabel: {
    fontSize: 17,
    color: colors.text.accent,
    paddingVertical: 4,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    fontSize: 12,
    color: colors.text.tertiary,
  },
});
