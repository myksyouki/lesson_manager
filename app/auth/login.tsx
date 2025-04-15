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
import { useAuthStore } from '../../store/auth';
import { useGoogleAuth } from '../../store/auth';
import { MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LoadingScreen from '../../components/LoadingScreen';
import GoogleIcon from '../../components/GoogleIcon';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { login, register, signInWithGoogle, signInAsTestUser, user, isLoading, error, clearError } = useAuthStore();
  const { request, response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // アニメーションのための値
  const waveAnim = useRef(new Animated.Value(0)).current;
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
        <Image
          source={{ uri: 'https://firebasestorage.googleapis.com/v0/b/lesson-manager-394014.appspot.com/o/wave_pattern.png?alt=media' }}
          style={styles.waveImage}
          resizeMode="repeat"
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
              opacity: 0.3 + (i % 5) * 0.1
            }
          ]}
        />
      ))}
      
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <LinearGradient
                colors={freshColors[currentColorSet]}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons 
                  name="music-note" 
                  size={48} 
                  color="#FFFFFF" 
                />
              </LinearGradient>
            </View>
            <Text style={styles.appName}>Resonote</Text>
            <Text style={styles.appTagline}>音楽の旅をもっと楽しく</Text>
          </View>

          <View style={styles.formContainer}>
            <BlurView intensity={10} tint="light" style={styles.blurBackground} />
            <View style={styles.formContent}>
              <Text style={styles.title}>
                {isSignUp ? 'アカウント作成' : 'ログイン'}
              </Text>

              {error && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
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

              {!isSignUp && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text 
                    style={[
                      styles.forgotPasswordText,
                      { color: freshColors[currentColorSet][0] }
                    ]}
                  >
                    パスワードをお忘れですか？
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.authButton}
                onPress={handleAuth}
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
                    <Text style={styles.authButtonText}>
                      {isSignUp ? 'アカウント作成' : 'ログイン'}
                    </Text>
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
                  style={styles.socialButton}
                  onPress={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  <GoogleIcon width={24} height={24} style={styles.googleIcon} />
                  <Text style={styles.socialButtonText}>Googleでログイン</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.socialButton, 
                    styles.testUserButton
                  ]}
                  onPress={handleTestUserSignIn}
                  disabled={isLoading}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={22} 
                    color="#FFFFFF" 
                  />
                  <Text style={styles.testUserButtonText}>テストユーザー</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  {isSignUp ? 'すでにアカウントをお持ちですか？' : 'アカウントをお持ちでないですか？'}
                </Text>
                <TouchableOpacity onPress={toggleAuthMode}>
                  <Text 
                    style={[
                      styles.switchButton,
                      { color: freshColors[currentColorSet][0] }
                    ]}
                  >
                    {isSignUp ? 'ログイン' : '新規登録'}
                  </Text>
                </TouchableOpacity>
              </View>
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
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  waveBg: {
    position: 'absolute',
    width: width * 2,
    height: height,
    opacity: 0.3,
  },
  waveImage: {
    width: '100%',
    height: '100%',
    tintColor: 'rgba(100, 200, 255, 0.3)',
  },
  bubble: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
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
    marginBottom: 40,
  },
  logoBox: {
    width: 90,
    height: 90,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#50A4D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2B5876',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    marginBottom: 8,
  },
  appTagline: {
    fontSize: 16,
    color: '#4A6B8A',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  formContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#A8D1EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  formContent: {
    padding: 28,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 28,
    color: '#2B5876',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF4757',
  },
  errorText: {
    color: '#FF4757',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    height: 56,
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  authButton: {
    borderRadius: 16,
    height: 56,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#50A4D2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A8D1EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 6,
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
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    lineHeight: 20,
    paddingVertical: 2,
  },
  testUserButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
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
    color: '#4A6B8A',
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  switchButton: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
}); 