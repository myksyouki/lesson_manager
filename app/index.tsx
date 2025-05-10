import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import { Image } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootScreen() {
  const { isAuthenticated, isDemo, isLoading, enterDemoMode } = useAuthStore();
  const insets = useSafeAreaInsets();

  // 認証中はローディングを表示
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.text.accent} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // ログイン済みまたはデモモードの場合はタブ画面にリダイレクト
  if (isAuthenticated || isDemo) {
    return <Redirect href="/tabs" />;
  }

  // ユーザーがログインしていない場合はスタート画面を表示
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.logoContainer}>
        <View style={styles.logoWrapper}>
          <Image
            source={require('../assets/images/app-logo.png')}
            style={styles.logo}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.title}>Resonote</Text>
        <Text style={styles.subtitle}>練習をデザインする</Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          style={styles.loginButton}
          labelStyle={styles.buttonLabel}
          onPress={() => router.push('/auth/login')}
        >
          ログイン
        </Button>
        
        <Button
          mode="contained"
          style={styles.signupButton}
          labelStyle={styles.buttonLabel}
          onPress={() => router.push('/auth/register')}
        >
          新規登録
        </Button>
        
        <Button
          mode="outlined"
          style={styles.demoButton}
          labelStyle={styles.demoButtonLabel}
          onPress={() => enterDemoMode().then(() => router.push('/tabs'))}
        >
          デモモードで試す
        </Button>
      </View>
      <Text style={styles.footer}>
        {Platform.OS === 'web' ? 'v' + '1.0.0' : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: colors.text.secondary,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    borderRadius: 28,
    marginBottom: 24,
    width: 140,
    height: 140,
    backgroundColor: Platform.OS === 'android' ? '#FFF' : 'transparent',
    overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
  },
  logo: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    overflow: 'hidden',
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
