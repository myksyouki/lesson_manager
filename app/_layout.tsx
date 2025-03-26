import React, { useEffect, useState } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { useAuthStore } from './store/auth';
import { useSettingsStore } from './store/settings';
import { useTheme } from './theme/index';
import { FadeIn, AnimatedLoader } from './components/AnimatedComponents';
import 'react-native-url-polyfill/auto';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import * as SplashScreen from 'expo-splash-screen';
import { useGoogleAuth } from './store/auth';
import { getUserProfile } from './services/userProfileService';
import { auth } from './config/firebase';
import { initializeDatabaseStructure } from './services/dbConfig';
import { useFonts } from 'expo-font';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

// スプラッシュ画面を非表示にするのを遅らせる
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { user, isLoading } = useAuthStore();
  const { theme: themeName } = useSettingsStore();
  const theme = useTheme();
  const { request, promptAsync } = useGoogleAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  // SpaceMonoフォントの読み込みを削除し、FontAwesomeのみ読み込む
  const [loaded, error] = useFonts(FontAwesome.font);

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.frameworkReady?.();
    }
    // コンポーネントがマウントされたことを記録
    setIsMounted(true);
  }, []);

  // アプリロード時にユーザープロファイルを読み込む
  useEffect(() => {
    const loadUserProfile = async () => {
      if (user) {
        try {
          // ユーザープロファイルを取得
          await getUserProfile();
          console.log('✅ ユーザープロファイルを読み込みました');
        } catch (error) {
          console.error('❌ ユーザープロファイルの読み込みに失敗しました:', error);
        }
      }
    };

    if (isMounted && user) {
      loadUserProfile();
    }
  }, [user, isMounted]);

  // スプラッシュ画面を非表示にする
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // データベース構造設定の初期化
  useEffect(() => {
    // アプリ起動時にデータベース構造設定を初期化
    const initializeDB = async () => {
      try {
        await initializeDatabaseStructure();
        console.log('データベース構造設定の初期化が完了しました');
      } catch (error) {
        console.error('データベース構造設定の初期化に失敗しました:', error);
      }
    };
    
    initializeDB();
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.backgroundSecondary }]}>
        <FadeIn duration={800}>
          <AnimatedLoader size={50} color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.text, fontFamily: theme.typography.fontFamily.medium }]}>
            読み込み中...
          </Text>
        </FadeIn>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'fade_from_bottom',
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!user ? (
          <React.Fragment>
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </React.Fragment>
        ) : (
          <React.Fragment>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(lesson-detail)" options={{ title: 'レッスン詳細' }} />
            <Stack.Screen name="chat-room" options={{ title: 'チャットルーム' }} />
            <Stack.Screen name="chat-room-form" options={{ title: 'チャットルーム作成' }} />
            <Stack.Screen name="lesson-form" options={{ title: 'レッスン作成' }} />
            <Stack.Screen name="task-detail" options={{ title: '課題詳細' }} />
            <Stack.Screen name="task-form" options={{ title: '課題作成' }} />
            <Stack.Screen name="generate-tasks" options={{ title: '課題生成' }} />
            <Stack.Screen name="consult-ai" options={{ title: 'AIに相談' }} />
            <Stack.Screen name="settings" options={{ title: '設定' }} />
            <Stack.Screen name="profile" options={{ title: 'プロフィール' }} />
            <Stack.Screen name="instrument-settings" options={{ title: '楽器設定' }} />
            <Stack.Screen name="api-settings" options={{ title: 'API設定' }} />
            <Stack.Screen name="theme-settings" options={{ title: 'テーマ設定' }} />
            <Stack.Screen name="language" options={{ title: '言語設定' }} />
            <Stack.Screen name="notifications" options={{ title: '通知設定' }} />
            <Stack.Screen name="privacy-policy" options={{ title: 'プライバシーポリシー' }} />
            <Stack.Screen name="sync" options={{ title: 'データ同期' }} />
            <Stack.Screen name="shared-audio" options={{ title: '共有音声' }} />
            <Stack.Screen name="admin/knowledge-management" options={{ title: 'ナレッジベース管理' }} />
            <Stack.Screen name="admin/knowledge-edit" options={{ title: 'ナレッジ編集' }} />
            <Stack.Screen name="admin/db-migration" options={{ title: 'DB移行' }} />
          </React.Fragment>
        )}
      </Stack>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  }
});
