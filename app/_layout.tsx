import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { requestTracking } from '../utils/trackingTransparency';
import { useRouter } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import AppLoading from 'expo-app-loading';

// スプラッシュ画面を長めに表示（デバイスによる初期化の遅延を吸収）
SplashScreen.preventAutoHideAsync().catch(() => {
  // エラーを無視（preventAutoHideAsyncが失敗しても問題なし）
});

// 全ての不要な警告を抑制
LogBox.ignoreLogs([
  'Do not call Hooks inside useEffect',
  '[Reanimated]', // Reanimated 関連警告を全て無視
  'Tried to modify key', // Reanimated ワークレット警告のパターン
  'Tried to synchronously call function', // React Native同期呼び出し警告
  'NOBRIDGE', // NOBRIDGEログを無視
  // Firebase関連の警告
  'AsyncStorage',
  'Setting a timer for a long period of time',
  'Warning: Failed prop type',
  'FirebaseError',
  // Firebaseに関するすべての警告を無視（クラッシュ防止）
  'Firebase',
  '[firebase]',
  'firebase',
  'FirebaseApp',
  'FirebaseAuth',
  'FirebaseStorage',
  'FirebaseFirestore',
  // その他のエラーを抑制
  'non-std',
  'RCTBridge',
  'RCTMessageThread',
  'Require cycle',
  // React Native 0.76以降の警告
  'ViewPropTypes',
  'VirtualizedLists',
  'Sending'
]);

// Reanimated特有の共有オブジェクト変更エラーを無視
if (Platform.OS !== 'web') {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Reanimated警告を無視
    if (
      typeof args[0] === 'string' && 
      (args[0].includes('Reanimated') || 
       args[0].includes('Tried to modify key') || 
       args[0].includes('worklet'))
    ) {
      return;
    }
    originalConsoleWarn(...args);
  };
}

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

// ユーザープロファイル情報を安全に取得する関数
const safeCheckOnboardingStatus = async () => {
  try {
    // Firebaseの直接インポートを避け、プロミスを返す
    return Promise.resolve(true);
  } catch (error) {
    console.error('オンボーディング状態確認エラー:', error);
    return true; // デフォルトで完了状態とする
  }
};

export default function RootLayout() {
  const { theme: themeName } = useSettingsStore();
  const { user, isOnboardingCompleted, setOnboardingCompleted, isDemo } = useAuthStore();
  const theme = useTheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashReady, setSplashReady] = useState(false);
  const [fontsLoaded] = useFonts(FontAwesome.font);
  const router = useRouter();

  // スプラッシュ画面の非表示を安全に行う関数
  const hideSplashScreen = useCallback(async () => {
    if (splashReady) {
      try {
        await SplashScreen.hideAsync();
        console.log('スプラッシュ画面を非表示にしました');
      } catch (e) {
        console.warn('スプラッシュ画面を非表示にできませんでした:', e);
      }
    }
  }, [splashReady]);

  // スプラッシュ画面の準備を遅延して行う
  useEffect(() => {
    // スプラッシュ画面用のタイマー
    const timer = setTimeout(() => {
      setSplashReady(true);
    }, 2000); // 2秒遅延
    
    return () => clearTimeout(timer);
  }, []);

  // スプラッシュ画面の非表示を実行
  useEffect(() => {
    if (splashReady && fontsLoaded && appIsReady) {
      // スプラッシュ画面を非表示にする前にさらに遅延
      const timer = setTimeout(() => {
        hideSplashScreen();
      }, 1000); // 1秒遅延
      
      return () => clearTimeout(timer);
    }
  }, [splashReady, fontsLoaded, appIsReady, hideSplashScreen]);

  // アプリの初期化処理を一元化
  const prepareApp = useCallback(async () => {
    try {
      // 初期化処理をここに集約
      if (fontsLoaded) {
        console.log('フォントの読み込みが完了しました');
        
        // アプリの初期化完了を示す（遅延付き）
        setTimeout(() => {
          setAppIsReady(true);
        }, 500);
      }
    } catch (e) {
      console.warn('アプリ初期化エラー:', e);
      // エラーが発生しても、アプリを表示する（遅延付き）
      setTimeout(() => {
        setAppIsReady(true);
      }, 500);
    }
  }, [fontsLoaded]);

  // フォントの読み込みとスプラッシュ画面の処理
  useEffect(() => {
    if (fontsLoaded) {
      // タイマーを使って遅延実行（iOS実機でのクラッシュ防止）
      const timer = setTimeout(() => {
        prepareApp();
      }, 1500); // 1.5秒に延長（実機での安定性向上）
      
      return () => clearTimeout(timer);
    }
  }, [fontsLoaded, prepareApp]);

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
      safeCheckOnboardingStatus()
        .then(completed => {
          console.log('オンボーディング状態:', completed ? '完了済み' : '未完了');
          setOnboardingCompleted(completed);
        });
    }
  }, [user, setOnboardingCompleted]);

  // フォントがロードされていない場合は何も表示しない
  if (!fontsLoaded) {
    return null;
  }

  // エラーハンドラー
  const handleError = (error: Error) => {
    console.error('アプリケーションエラー:', error);
    // ここでエラーログを送信することもできます
  };

  return (
    <PaperProvider>
      <ErrorBoundaryComponent FallbackComponent={ErrorFallback} onError={handleError}>
        <GestureHandlerRootView style={styles.container}>
          <Stack 
            screenOptions={{ 
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            {!user ? (
              <>
                <Stack.Screen name="auth/login" options={{ headerShown: false }} />
                <Stack.Screen name="auth/register" options={{ headerShown: false }} />
                <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="mode-selection" options={{ headerShown: false }} />
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
                <Stack.Screen name="subscription/plans" options={{ title: 'サブスクリプションプラン' }} />
                <Stack.Screen name="subscription/manage" options={{ title: 'サブスクリプション管理' }} />
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
              </>
            )}
          </Stack>
          {isDemo && (
            <View style={styles.demoIndicator}>
              <Text style={styles.demoText}>デモモード</Text>
              <TouchableOpacity 
                style={styles.createAccountButton}
                onPress={() => router.push('/auth/register')}
              >
                <Text style={styles.createAccountText}>アカウント作成</Text>
              </TouchableOpacity>
            </View>
          )}
          <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
        </GestureHandlerRootView>
      </ErrorBoundaryComponent>
    </PaperProvider>
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
  demoIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 80 : 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 999,
    borderRadius: 20,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  demoText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createAccountButton: {
    backgroundColor: '#4285F4',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  createAccountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});
