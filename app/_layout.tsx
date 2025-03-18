import React, { useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { AuthProvider } from './services/auth';
import * as SplashScreen from 'expo-splash-screen';
import { useGoogleAuth } from './store/auth';
import { getUserProfile } from './services/userProfileService';

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
  const router = useRouter();
  const { request, promptAsync } = useGoogleAuth();

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.frameworkReady?.();
    }
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

    loadUserProfile();
  }, [user]);

  // スプラッシュ画面を非表示にする
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

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
    <AuthProvider>
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
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="index" redirect />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
              <Stack.Screen 
                name="lesson-form" 
                options={{ 
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: 'vertical',
                }} 
              />
              <Stack.Screen 
                name="lesson-detail" 
                options={{ 
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }} 
              />
              <Stack.Screen 
                name="shared-audio" 
                options={{ 
                  presentation: 'modal', 
                  title: '音声ファイル処理中',
                  animation: 'fade',
                }} 
              />
              <Stack.Screen 
                name="task-detail" 
                options={{ 
                  presentation: 'modal',
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                  gestureDirection: 'horizontal',
                }} 
              />
              <Stack.Screen 
                name="task-form" 
                options={{ 
                  presentation: 'modal',
                  animation: 'slide_from_bottom',
                  gestureEnabled: true,
                  gestureDirection: 'vertical',
                }} 
              />
              <Stack.Screen name="instrument-settings" />
            </React.Fragment>
          )}
        </Stack>
        <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      </GestureHandlerRootView>
    </AuthProvider>
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
