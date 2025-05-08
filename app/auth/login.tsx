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
  Alert
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore, AppUser } from '../../store/auth';
import { useGoogleAuth } from '../../store/auth';
import { MaterialIcons, Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LoadingScreen from '../../components/LoadingScreen';
import GoogleIcon from '../../components/GoogleIcon';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleAuthProvider, getAuth, signInWithCredential } from 'firebase/auth';
import { useAuth } from '../../services/auth';
import { configureGoogleSignIn } from '../../services/googleSignInCommon';
import Constants from 'expo-constants';

// GoogleSignInの初期化
if (Platform.OS !== 'web') {
  configureGoogleSignIn();
}

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, signInWithGoogle: storeSignInWithGoogle, signInWithApple, signInAsTestUser, user, isLoading, error, clearError } = useAuthStore();
  const { request, response, promptAsync } = useGoogleAuth();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);

  // アニメーションのための値
  const waveAnim = useRef(new Animated.Value(0)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.9)).current;
  const logoOpacityAnim = useRef(new Animated.Value(0)).current;
  const formSlideAnim = useRef(new Animated.Value(50)).current;
  const formOpacityAnim = useRef(new Animated.Value(0)).current;
  const bubbleAnims = useRef(
    Array(6).fill(0).map(() => ({
      position: new Animated.ValueXY({ x: Math.random() * width, y: height + 50 + Math.random() * 100 }),
      scale: new Animated.Value(0.5 + Math.random() * 1)
    }))
  ).current;
  
  // 爽やかなカラーパレット
  const freshColors = [
    ['#4ECDC4', '#51BBF3'] as const, // ターコイズとスカイブルー
    ['#5DB8FE', '#29D0BE'] as const, // ブルーとミントグリーン
    ['#56CCF2', '#2F80ED'] as const, // ライトブルーとブルー
    ['#43E695', '#3BB2B8'] as const  // ライトグリーンとターコイズ
  ];
  
  const [currentColorSet, setCurrentColorSet] = useState(0);
  
  // 10秒ごとに色を変える
  useEffect(() => {
    const colorInterval = setInterval(() => {
      setCurrentColorSet((prev) => (prev + 1) % freshColors.length);
    }, 10000);
    
    return () => clearInterval(colorInterval);
  }, []);

  // コンポーネントがマウントされたらアニメーションを開始
  useEffect(() => {
    // ロゴアニメーション
    Animated.parallel([
      Animated.timing(logoScaleAnim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.back(1.7)),
        useNativeDriver: true
      }),
      Animated.timing(logoOpacityAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true
      })
    ]).start();
    
    // フォームアニメーション
    Animated.parallel([
      Animated.timing(formSlideAnim, {
        toValue: 0,
        duration: 800,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(formOpacityAnim, {
        toValue: 1,
        duration: 800,
        delay: 300,
        useNativeDriver: true
      })
    ]).start();
    
    // 波アニメーション
    Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 10000,
        easing: Easing.linear,
        useNativeDriver: true
      })
    ).start();
    
    // バブルアニメーション
    animateBubbles();
    
    return () => {
      // アンマウント時にアニメーションをクリーンアップ
      waveAnim.stopAnimation();
      bubbleAnims.forEach(anim => {
        anim.position.stopAnimation();
        anim.scale.stopAnimation();
      });
    };
  }, []);
  
  // バブルアニメーション
  const animateBubbles = () => {
    bubbleAnims.forEach((bubble, index) => {
      const resetBubble = () => {
        bubble.position.setValue({ 
          x: Math.random() * width, 
          y: height + 50
        });
        
        const duration = 15000 + Math.random() * 10000;
        const targetY = -100 - Math.random() * 100;
        
        Animated.parallel([
          Animated.timing(bubble.position.y, {
            toValue: targetY,
            duration,
            easing: Easing.linear,
            useNativeDriver: true
          }),
          Animated.sequence([
            Animated.timing(bubble.scale, {
              toValue: 0.5 + Math.random(),
              duration: duration / 3,
              useNativeDriver: true
            }),
            Animated.timing(bubble.scale, {
              toValue: 0.3 + Math.random() * 0.5,
              duration: duration / 3,
              useNativeDriver: true
            }),
            Animated.timing(bubble.scale, {
              toValue: 0.2 + Math.random() * 0.3,
              duration: duration / 3,
              useNativeDriver: true
            })
          ])
        ]).start(resetBubble);
      };
      
      // 初回のアニメーション開始
      setTimeout(() => resetBubble(), index * 2000);
    });
  };

  // ユーザー状態に応じた画面遷移
  useEffect(() => {
    if (user) {
      // レイアウトがマウントされるのを待つために遅延させる
      setTimeout(() => {
        router.replace("/tabs" as any);
      }, 100);
    }
  }, [user]);

  // Appleサインインの利用可能状態を確認
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        console.log('🍎 Apple認証利用可能:', isAvailable, 'プラットフォーム:', Platform.OS);
        setAppleAuthAvailable(isAvailable);
      } catch (error) {
        console.log('🍎 Apple認証の確認エラー:', error);
        setAppleAuthAvailable(false);
      }
    };
    
    checkAppleAuthAvailability();
  }, []);

  const handleLogin = async () => {
    clearError();
    setErrorMessage('');
    
    if (!email) {
      setErrorMessage('メールアドレスを入力してください');
      return;
    }
    
    if (!password) {
      setErrorMessage('パスワードを入力してください');
      return;
    }
    
    try {
      await login(email, password);
    } catch (error: any) {
      console.error('ログインエラー:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Expo開発環境では制限あり
      if (Constants.appOwnership === 'expo') {
        // Expo Goの場合は警告表示
        Alert.alert(
          'Google認証制限',
          'Expo Go環境ではGoogle認証を使用できません。実機ビルドが必要です。代わりにテストアカウントをご利用ください。',
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
      
      if (Platform.OS === 'web') {
        // Web環境では直接signInWithGoogleを呼び出す
        await storeSignInWithGoogle();
      } else {
        // ネイティブ環境ではネイティブSDKを使用
        const result = await auth.signInWithGoogle();
        if (!result.success) {
          setErrorMessage(result.error || 'Googleログインに失敗しました');
        }
      }
    } catch (error: any) {
      console.error('Google Sign-Inエラー:', error);
      setErrorMessage(error.message || 'Googleログインに失敗しました');
    }
  };

  const handleTestUserSignIn = async () => {
    try {
      await signInAsTestUser();
    } catch (error) {
      console.error('テストユーザーログインエラー:', error);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple();
    } catch (error: any) {
      console.error('Appleサインインエラー:', error);
      // Apple認証がキャンセルされた場合はメッセージを表示しない
      if (error.code !== 'ERR_CANCELED') {
        setErrorMessage(error.message || 'Appleログインに失敗しました');
      }
    }
  };

  const navigateToRegister = () => {
    router.push('/auth/register');
  };

  const navigateToForgotPassword = () => {
    router.push('/auth/forgot-password');
  };

  // ローディング画面
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#F5FBFF', '#E0F6FF', '#D5F0FF']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* 背景のウェーブアニメーション */}
      <Animated.View 
        style={[
          styles.waveBg,
          {
            transform: [
              { 
                translateX: waveAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -width]
                })
              }
            ]
          }
        ]}
      >
        <LinearGradient
          colors={[freshColors[currentColorSet][0], freshColors[currentColorSet][1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.waveGradient}
        />
      </Animated.View>
      
      {/* バブルエフェクト */}
      {bubbleAnims.map((bubble, i) => (
        <Animated.View
          key={`bubble-${i}`}
          style={[
            styles.bubble,
            {
              transform: [
                { translateX: bubble.position.x },
                { translateY: bubble.position.y },
                { scale: bubble.scale }
              ],
              backgroundColor: i % 2 === 0 ? freshColors[currentColorSet][0] : freshColors[currentColorSet][1],
              opacity: 0.25 + (i % 5) * 0.05
            }
          ]}
        />
      ))}
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ロゴアニメーション */}
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                opacity: logoOpacityAnim,
                transform: [{ scale: logoScaleAnim }]
              }
            ]}
          >
            <View style={styles.logoBox}>
              <LinearGradient
                colors={freshColors[currentColorSet]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name="music-note" 
                  size={54} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </View>
            <Text style={styles.appTitle}>Resonote</Text>
            <Text style={styles.appSubtitle}>練習をデザインする</Text>
          </Animated.View>

          {/* フォームアニメーション */}
          <Animated.View 
            style={[
              styles.formContainer,
              {
                opacity: formOpacityAnim,
                transform: [{ translateY: formSlideAnim }]
              }
            ]}
          >
            <BlurView intensity={15} tint="light" style={styles.blurBackground} />
            <View style={styles.formContent}>
              <Text style={styles.formTitle}>ログイン</Text>

              {(error || errorMessage) && (
                <View style={styles.errorContainer}>
                  <MaterialIcons name="error-outline" size={20} color="#FF4757" style={{ marginRight: 8 }} />
                  <Text style={styles.errorText}>{error || errorMessage}</Text>
                </View>
              )}

              <View style={styles.inputContainer}>
                <MaterialIcons 
                  name="email" 
                  size={22} 
                  color={freshColors[currentColorSet][0]} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="メールアドレス"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholderTextColor="rgba(100,120,140,0.5)"
                />
              </View>

              <View style={styles.inputContainer}>
                <MaterialIcons 
                  name="lock" 
                  size={22} 
                  color={freshColors[currentColorSet][0]} 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder="パスワード"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!passwordVisible}
                  placeholderTextColor="rgba(100,120,140,0.5)"
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  style={styles.visibilityIcon}
                >
                  <MaterialIcons
                    name={passwordVisible ? 'visibility' : 'visibility-off'}
                    size={22}
                    color="rgba(100,120,140,0.5)"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={navigateToForgotPassword}
              >
                <Text 
                  style={[
                    styles.forgotPasswordText,
                    { color: freshColors[currentColorSet][0] }
                  ]}
                >
                  パスワードをお忘れですか？
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.authButton}
                onPress={handleLogin}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={freshColors[currentColorSet]}
                  style={styles.buttonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.authButtonText}>ログイン</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>または</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialButtonsContainer}>
                <TouchableOpacity
                  style={[styles.socialButton, styles.googleButton]}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <GoogleIcon width={22} height={22} style={styles.googleIcon} />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>

                {/* Appleサインインボタン - iOSのみ表示 */}
                {(Platform.OS === 'ios' || Platform.OS === 'macos') && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={handleAppleSignIn}
                    disabled={isLoading || !appleAuthAvailable}
                  >
                    <FontAwesome name="apple" size={22} color="#FFFFFF" />
                    <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>Apple</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.socialButton, styles.testUserButton]}
                  onPress={handleTestUserSignIn}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons name="account-check" size={22} color="#FFFFFF" />
                  <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>テスト</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>アカウントをお持ちでないですか？</Text>
                <TouchableOpacity onPress={navigateToRegister}>
                  <Text 
                    style={[
                      styles.switchButton,
                      { color: freshColors[currentColorSet][0] }
                    ]}
                  >
                    新規登録
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5FBFF',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  waveBg: {
    position: 'absolute',
    width: width * 2,
    height: height * 0.7,
    bottom: -height * 0.5,
  },
  waveGradient: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: width,
    borderTopRightRadius: width,
  },
  bubble: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    shadowColor: '#50A4D2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    overflow: 'hidden',
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2B5876',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 18,
    color: '#4A6B8A',
    letterSpacing: 1,
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#A8D1EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  formContent: {
    padding: 28,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2B5876',
    marginBottom: 20,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF4757',
    fontSize: 14,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    height: 58,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#A8D1EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#2B5876',
  },
  visibilityIcon: {
    padding: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    padding: 4,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
  },
  authButton: {
    borderRadius: 16,
    height: 56,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#50A4D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(150, 170, 190, 0.2)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#4A6B8A',
    fontSize: 14,
  },
  socialButtonsContainer: {
    flexDirection: 'column',
    marginBottom: 24,
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    borderRadius: 16,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A8D1EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
  },
  appleButton: {
    backgroundColor: '#000000',
  },
  testUserButton: {
    backgroundColor: '#4A6B8A',
  },
  googleIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    color: '#2B5876',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  switchText: {
    color: '#4A6B8A',
    fontSize: 14,
  },
  switchButton: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 