import { useEffect } from 'react';
import { Stack, Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, View, Text, ActivityIndicator, Platform } from 'react-native';
import { useAuthStore } from './store/auth';
import { useSettingsStore } from './store/settings';
import { useTheme } from './theme/index';
import { FadeIn, AnimatedLoader } from './components/AnimatedComponents';
import 'react-native-url-polyfill/auto';

declare global {
  interface Window {
    frameworkReady?: () => void;
  }
}

export default function RootLayout() {
  const { user, isLoading } = useAuthStore();
  const { theme: themeName } = useSettingsStore();
  const theme = useTheme();

  useEffect(() => {
    if (Platform.OS === 'web') {
      window.frameworkReady?.();
    }
  }, []);

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
          <>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="index" redirect />
          </>
        ) : (
          <>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          </>
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
