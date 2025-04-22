import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View, TouchableOpacity, LogBox, Platform } from 'react-native';
import { useSettingsStore } from '../store/settings';
import { useAuthStore } from '../store/auth';
import { useTheme } from '../theme/index';
import 'react-native-url-polyfill/auto';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import ErrorBoundary from 'react-native-error-boundary';
import { checkOnboardingStatus } from '../services/userProfileService';
import { requestTracking } from '../utils/trackingTransparency';

// Expo Router内部のHooks呼び出し警告を無視
LogBox.ignoreLogs(['Do not call Hooks inside useEffect']);

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

// 型エラー回避のためanyとして再宣言
const ErrorBoundaryComponent: any = ErrorBoundary;

export default function RootLayout() {
  const { theme: themeName } = useSettingsStore();
  const { user, isOnboardingCompleted, setOnboardingCompleted } = useAuthStore();
  const theme = useTheme();
  const [loaded] = useFonts(FontAwesome.font);

  // スプラッシュ画面を非表示にする
  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(console.error);
    }
  }, [loaded]);

  // App Tracking Transparency (ATT) の実装
  useEffect(() => {
    // iOS 14以上のみで必要
    if (Platform.OS === 'ios') {
      // アプリ起動から少し遅らせて表示（ユーザーがアプリUIを見てから）
      const timer = setTimeout(async () => {
        try {
          // トラッキング許可をリクエスト
          const status = await requestTracking();
          console.log('トラッキング許可ステータス:', status);
        } catch (error) {
          console.error('トラッキング許可リクエストエラー:', error);
        }
      }, 2000); // 2秒後に表示
      
      return () => clearTimeout(timer);
    }
  }, []);

  // ユーザーログイン時にオンボーディング状態を確認
  useEffect(() => {
    if (user && user.uid) {
      checkOnboardingStatus()
        .then(completed => {
          console.log('オンボーディング状態:', completed ? '完了済み' : '未完了');
          setOnboardingCompleted(completed);
        })
        .catch(error => {
          console.error('オンボーディング状態確認エラー:', error);
          // エラーが発生しても、デフォルトでオンボーディング完了状態を設定
          // これにより、エラーが表示されてもアプリは通常通り動作する
          setOnboardingCompleted(true);
        });
    }
  }, [user, setOnboardingCompleted]);

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
    <ErrorBoundaryComponent FallbackComponent={ErrorFallback} onError={handleError}>
      <GestureHandlerRootView style={styles.container}>
        <Stack 
          screenOptions={{ 
            headerShown: false,
            animation: 'fade_from_bottom',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          {!user ? (
            <>
              <Stack.Screen name="auth/login" options={{ headerShown: false }} />
              <Stack.Screen name="auth/register" options={{ headerShown: false }} />
              <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            </>
          ) : isOnboardingCompleted === false ? (
            // オンボーディングが完了していない場合は、オンボーディング画面にリダイレクト
            <>
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            </>
          ) : (
            <>
              <Stack.Screen name="tabs" options={{ headerShown: false }} />
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
              
              {/* 管理者画面ルート */}
              <Stack.Screen name="admin" options={{ title: '管理者ページ' }} />
              <Stack.Screen name="admin/practice-menu" options={{ title: '練習メニュー管理' }} />
              <Stack.Screen name="admin/db-migration" options={{ title: 'DB移行' }} />
              
              {/* 管理者機能は現在非表示
              <Stack.Screen name="admin/knowledge-management" options={{ title: 'ナレッジベース管理' }} />
              <Stack.Screen name="admin/knowledge-edit" options={{ title: 'ナレッジ編集' }} />
              */}
            </>
          )}
        </Stack>
        <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </ErrorBoundaryComponent>
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
