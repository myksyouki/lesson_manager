import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSettingsStore } from '../store/settings';
import { useTheme } from '../theme/index';
import 'react-native-url-polyfill/auto';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ErrorBoundary from 'react-native-error-boundary';

// スプラッシュ画面を非表示にするのを遅らせる
SplashScreen.preventAutoHideAsync();

// エラーバウンダリーのフォールバックコンポーネント
interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

const ErrorFallback = ({ error, resetError }: ErrorFallbackProps) => {
  const theme = useTheme();
  return (
    <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.errorTitle, { color: theme.colors.error }]}>エラーが発生しました</Text>
      <Text style={[styles.errorMessage, { color: theme.colors.text }]}>{error.message}</Text>
      <Text style={[styles.errorNote, { color: theme.colors.text }]}>
        アプリを再起動するか、以下のボタンをタップしてください
      </Text>
      <TouchableOpacity 
        style={[styles.resetButton, { backgroundColor: theme.colors.primary }]} 
        onPress={resetError}
      >
        <Text style={styles.resetButtonText}>再読み込み</Text>
      </TouchableOpacity>
    </View>
  );
};

export default function RootLayout() {
  const { theme: themeName } = useSettingsStore();
  const theme = useTheme();
  const [loaded] = useFonts(FontAwesome.font);

  // スプラッシュ画面を非表示にする
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [loaded]);

  // フォントがロードされていない場合は何も表示しない
  if (!loaded) {
    return null;
  }

  // エラーハンドラー
  const handleError = (error: Error) => {
    console.error('アプリケーションエラー:', error);
    // ここでエラーログを送信することもできます
  };

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
      <GestureHandlerRootView style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {/* 初期レンダリング時の画面 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
          
          {/* 認証関連画面 */}
          <Stack.Screen name="auth/login" options={{ headerShown: false }} />
          <Stack.Screen name="auth/register" options={{ headerShown: false }} />
          <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
          
          {/* メイン画面 */}
          <Stack.Screen name="tabs" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          
          {/* その他の画面 */}
          <Stack.Screen name="chat-room" options={{ title: 'チャットルーム' }} />
          <Stack.Screen name="chat-room-form" options={{ title: 'チャットルーム作成' }} />
          <Stack.Screen name="lesson-form" options={{ title: 'レッスン作成' }} />
          <Stack.Screen name="task-detail" options={{ title: '課題詳細' }} />
          <Stack.Screen name="task-form" options={{ title: '課題作成' }} />
          <Stack.Screen name="generate-tasks" options={{ title: '課題生成' }} />
          <Stack.Screen name="consult-ai" options={{ title: 'AIに相談' }} />
          <Stack.Screen name="subscription" options={{ title: 'サブスクリプション' }} />
          <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
          <Stack.Screen name="instrument-settings" options={{ title: '楽器設定' }} />
          <Stack.Screen name="api-settings" options={{ title: 'API設定' }} />
          <Stack.Screen name="theme-settings" options={{ title: 'テーマ設定' }} />
          <Stack.Screen name="language" options={{ title: '言語設定' }} />
          <Stack.Screen name="notifications" options={{ title: '通知設定' }} />
          <Stack.Screen name="privacy-policy" options={{ title: 'プライバシーポリシー' }} />
          <Stack.Screen name="terms-of-service" options={{ title: '利用規約' }} />
          <Stack.Screen name="help-support" options={{ title: 'ヘルプとサポート' }} />
          <Stack.Screen name="error-report" options={{ title: 'エラー報告' }} />
          <Stack.Screen name="sync" options={{ title: 'データ同期' }} />
          <Stack.Screen name="shared-audio" options={{ title: '共有音声' }} />
        </Stack>
        <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorNote: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  resetButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
