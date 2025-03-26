import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from './store/auth';
import { useGoogleAuth } from './store/auth';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, register, signInWithGoogle, signInAsTestUser, user, isLoading, error, clearError } = useAuthStore();
  const { request, response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // スペクトラムアニメーションのための値
  const spectrumBars = 8; // 表示するバーの数
  const barValues = useRef(Array(spectrumBars).fill(0).map(() => new Animated.Value(0))).current;
  
  // アニメーションを開始する関数
  const animateSpectrum = () => {
    // 各バーのアニメーションを設定
    const animations = barValues.map((barValue, index) => {
      // 異なる高さと速度でアニメーション
      const randomHeight = 0.3 + Math.random() * 0.7;
      const duration = 700 + Math.random() * 600; // 700ms～1300msのランダムな時間
      
      return Animated.sequence([
        Animated.timing(barValue, {
          toValue: randomHeight,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(barValue, {
          toValue: 0.2 + Math.random() * 0.3,
          duration: duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]);
    });

    // すべてのアニメーションを並行して実行し、繰り返す
    Animated.loop(
      Animated.parallel(animations)
    ).start();
  };

  // コンポーネントがマウントされたらアニメーションを開始
  useEffect(() => {
    if (isLoading) {
      animateSpectrum();
    }
    
    return () => {
      // アンマウント時にアニメーションをクリーンアップ
      barValues.forEach(value => value.stopAnimation());
    };
  }, [isLoading]);

  useEffect(() => {
    if (user) {
      router.replace("/(tabs)" as any);
    }
  }, [user]);

  const handleAuth = async () => {
    if (!email || !password) return;
    isSignUp ? await register(email, password) : await login(email, password);
  };

  const handleGoogleSignIn = async () => {
    if (!promptAsync) {
      alert('Googleログインの準備ができていません');
      return;
    }
    await signInWithGoogle(promptAsync);
  };

  const handleTestUserSignIn = async () => {
    try {
      await signInAsTestUser();
    } catch (error) {
      console.error('テストユーザーログインエラー:', error);
      setErrorMessage('テストユーザーログインに失敗しました');
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    clearError();
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      setErrorMessage('メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      await register(email, password);
      setEmail('');
      setPassword('');
      setErrorMessage('');
    } catch (error: any) {
      console.error('サインアップエラー:', error);
      setErrorMessage(error.message || 'サインアップに失敗しました');
    }
  };

  if (isLoading && user) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.spectrumContainer}>
          {barValues.map((value, index) => (
            <Animated.View
              key={`bar-${index}`}
              style={[
                styles.spectrumBar,
                {
                  height: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 100],
                  }),
                  backgroundColor: `rgba(255, 107, 53, ${0.7 + (index / barValues.length) * 0.3})`,
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.loadingText}>音楽を準備しています...</Text>
        <View style={styles.noteIconContainer}>
          <MaterialCommunityIcons name="music-note-eighth" size={24} color="#FF6B35" />
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#FFFCF2', '#FFF0D9']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.decorationElements}>
            <View style={[styles.circle, styles.circle1]} />
            <View style={[styles.circle, styles.circle2]} />
            <View style={[styles.circle, styles.circle3]} />
          </View>
          
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <View style={styles.circlePattern}>
                {[...Array(4)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.circleRing,
                      {
                        width: 100 - i * 22,
                        height: 100 - i * 22,
                        borderRadius: (100 - i * 22) / 2,
                        borderWidth: 2,
                        opacity: 0.8 - i * 0.15,
                      },
                    ]}
                  />
                ))}
                <View style={styles.centerIcon}>
                  <Feather name="music" size={28} color="#FFFFFF" />
                </View>
              </View>
            </View>
            <Text style={styles.appName}>Lesson Manager</Text>
            <Text style={styles.appTagline}>音楽との旅をもっと豊かに</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>{isSignUp ? 'アカウント作成' : 'ログイン'}</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <MaterialIcons name="email" size={20} color="#FFFFFF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#BBBBBB"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIconWrapper}>
                <MaterialIcons name="lock" size={20} color="#FFFFFF" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
                placeholderTextColor="#BBBBBB"
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.visibilityIcon}
              >
                <MaterialIcons
                  name={passwordVisible ? 'visibility' : 'visibility-off'}
                  size={20}
                  color="#999999"
                />
              </TouchableOpacity>
            </View>

            {!isSignUp && (
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>パスワードをお忘れですか？</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.authButton}
              onPress={handleAuth}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.authButtonText}>
                    {isSignUp ? 'アカウント作成' : 'ログイン'}
                  </Text>
                  <View style={styles.arrowContainer}>
                    <MaterialIcons name="arrow-forward" size={20} color="#FFFFFF" />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>または</Text>
              <View style={styles.divider} />
            </View>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={handleGoogleSignIn}
              disabled={isLoading}
            >
              <Image 
                source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
                style={styles.googleIcon} 
              />
              <Text style={styles.googleButtonText}>Googleでログイン</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.testUserButton}
              onPress={handleTestUserSignIn}
              disabled={isLoading}
            >
              <MaterialCommunityIcons name="account-check" size={22} color="#FFFFFF" style={styles.testUserIcon} />
              <Text style={styles.testUserButtonText}>テストユーザーとしてログイン</Text>
            </TouchableOpacity>

            <View style={styles.switchContainer}>
              <Text style={styles.switchText}>
                {isSignUp ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
              </Text>
              <TouchableOpacity onPress={toggleAuthMode}>
                <Text style={styles.switchButton}>{isSignUp ? 'ログイン' : '新規登録'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFCF2',
  },
  decorationElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  circle: {
    position: 'absolute',
    borderRadius: 150,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    top: -50,
    right: -50,
  },
  circle2: {
    width: 250,
    height: 250,
    backgroundColor: 'rgba(255, 184, 76, 0.08)',
    bottom: -100,
    left: -100,
  },
  circle3: {
    width: 150,
    height: 150,
    backgroundColor: 'rgba(255, 107, 53, 0.05)',
    bottom: 100,
    right: -50,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoBackground: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  circlePattern: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circleRing: {
    position: 'absolute',
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  appTagline: {
    fontSize: 16,
    color: '#666666',
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    height: 56,
    overflow: 'hidden',
  },
  inputIconWrapper: {
    width: 50,
    height: 56,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#333333',
    paddingHorizontal: 16,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  visibilityIcon: {
    paddingHorizontal: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    padding: 4,
  },
  forgotPasswordText: {
    color: '#FF6B35',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  authButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  arrowContainer: {
    marginLeft: 8,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#999999',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  testUserButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  testUserIcon: {
    marginRight: 12,
  },
  testUserButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  switchText: {
    color: '#999999',
    fontSize: 15,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  switchButton: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  spectrumContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 100,
    justifyContent: 'center',
    marginBottom: 24,
  },
  spectrumBar: {
    width: 6,
    marginHorizontal: 4,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#333333',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  noteIconContainer: {
    marginTop: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});