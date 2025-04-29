import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth';
import { useGoogleAuth } from '../../store/auth';
import { MaterialIcons, Feather, MaterialCommunityIcons, FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import LoadingScreen from '../../components/LoadingScreen';
import { Checkbox, RadioButton, Menu, Button, Divider } from 'react-native-paper';
import GoogleIcon from '../../components/GoogleIcon';
import * as AppleAuthentication from 'expo-apple-authentication';

const { width, height } = Dimensions.get('window');

// 楽器カテゴリとそれに属する楽器のリスト
const INSTRUMENT_CATEGORIES = [
  {
    label: '鍵盤楽器',
    value: 'keyboard',
    instruments: [
      { label: 'ピアノ', value: 'piano' },
      { label: 'エレクトーン', value: 'electone' },
      { label: 'シンセサイザー', value: 'synthesizer' },
    ]
  },
  {
    label: '弦楽器',
    value: 'string',
    instruments: [
      { label: 'バイオリン', value: 'violin' },
      { label: 'ビオラ', value: 'viola' },
      { label: 'チェロ', value: 'cello' },
      { label: 'コントラバス', value: 'contrabass' },
      { label: 'ギター', value: 'guitar' },
      { label: 'ウクレレ', value: 'ukulele' },
    ]
  },
  {
    label: '管楽器',
    value: 'wind',
    instruments: [
      { label: 'フルート', value: 'flute' },
      { label: 'オーボエ', value: 'oboe' },
      { label: 'クラリネット', value: 'clarinet' },
      { label: 'サックス', value: 'saxophone' },
      { label: 'トランペット', value: 'trumpet' },
      { label: 'トロンボーン', value: 'trombone' },
    ]
  },
  {
    label: '打楽器',
    value: 'percussion',
    instruments: [
      { label: 'ドラム', value: 'drums' },
      { label: 'ティンパニ', value: 'timpani' },
      { label: 'マリンバ', value: 'marimba' },
    ]
  },
  {
    label: '声楽',
    value: 'vocal',
    instruments: [
      { label: 'ボーカル', value: 'vocal' },
      { label: '合唱', value: 'chorus' },
    ]
  },
  {
    label: 'その他',
    value: 'other',
    instruments: [
      { label: 'その他', value: 'other' },
    ]
  },
];

// レベルのリスト
const SKILL_LEVELS = [
  { label: '初心者', value: 'beginner' },
  { label: '中級者', value: 'intermediate' },
  { label: '上級者', value: 'advanced' },
];

// 目標のリスト
const PRACTICE_GOALS = [
  { label: '趣味として楽しむ', value: 'hobby' },
  { label: '演奏技術の向上', value: 'improvement' },
  { label: 'コンサート/発表会出演', value: 'performance' },
  { label: 'プロを目指す', value: 'professional' },
];

export default function RegisterScreen() {
  const { register, signInWithGoogle, signInWithApple, isLoading, error, clearError } = useAuthStore();
  const { request, response, promptAsync } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  
  // 登録処理完了後に遷移する
  const handleRegisterSuccess = (userId: string) => {
    // 詳細設定画面へ遷移
    router.push('/profile');
  };

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
    ['#4ECDC4', '#51BBF3'], // ターコイズとスカイブルー
    ['#5DB8FE', '#29D0BE'], // ブルーとミントグリーン
    ['#56CCF2', '#2F80ED'], // ライトブルーとブルー
    ['#43E695', '#3BB2B8']  // ライトグリーンとターコイズ
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

  // Appleサインインの利用可能状態を確認
  useEffect(() => {
    const checkAppleAuthAvailability = async () => {
      try {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setAppleAuthAvailable(isAvailable);
      } catch (error) {
        console.log('Apple認証の確認エラー:', error);
        setAppleAuthAvailable(false);
      }
    };
    
    checkAppleAuthAvailability();
  }, []);

  const handleRegister = async () => {
    setErrorMessage('');
    
    // メールアドレスのバリデーション
    if (!email) {
      setErrorMessage('メールアドレスを入力してください');
      return;
    }
    
    // メールアドレスの形式確認
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMessage('有効なメールアドレスを入力してください');
      return;
    }
    
    // パスワードのバリデーション
    if (!password) {
      setErrorMessage('パスワードを入力してください');
      return;
    }
    
    if (password.length < 6) {
      setErrorMessage('パスワードは6文字以上で入力してください');
      return;
    }
    
    // パスワード確認のバリデーション
    if (password !== confirmPassword) {
      setErrorMessage('パスワードと確認用パスワードが一致しません');
      return;
    }
    
    // 利用規約同意のバリデーション
    if (!termsAccepted) {
      setErrorMessage('利用規約に同意してください');
      return;
    }
    
    try {
      // Firebaseでユーザー登録（デフォルトの表示名を使用）
      const result = await register(
        email, 
        password, 
        '名称未設定' // デフォルトの名前を設定
      );
      
      // 登録成功時に詳細設定画面へ遷移
      if (result && result.user) {
        handleRegisterSuccess(result.user.uid);
      }
      
    } catch (error: any) {
      console.error('登録エラー:', error);
      
      // エラーメッセージの設定
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('このメールアドレスは既に使用されています');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('メールアドレスの形式が正しくありません');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('パスワードが弱すぎます。より強力なパスワードを設定してください');
      } else {
        setErrorMessage('アカウント登録中にエラーが発生しました: ' + (error.message || '不明なエラー'));
      }
    }
  };

  // Googleでサインイン
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithGoogle();
      
      // Google認証成功時に詳細設定画面へ遷移
      if (result && result.isNewUser && result.user) {
        handleRegisterSuccess(result.user.uid);
      } else if (result && result.user) {
        // 既存ユーザーの場合はホーム画面へ
        router.push('/');
      }
    } catch (error: any) {
      console.error('Google認証エラー:', error);
      setErrorMessage('Google認証に失敗しました: ' + (error.message || '不明なエラー'));
    }
  };
  
  // Appleでサインイン
  const handleAppleSignIn = async () => {
    try {
      const result = await signInWithApple();
      
      // Apple認証成功時に詳細設定画面へ遷移
      if (result && result.isNewUser && result.user) {
        handleRegisterSuccess(result.user.uid);
      } else if (result && result.user) {
        // 既存ユーザーの場合はホーム画面へ
        router.push('/');
      }
    } catch (error: any) {
      console.error('Apple認証エラー:', error);
      setErrorMessage('Apple認証に失敗しました: ' + (error.message || '不明なエラー'));
    }
  };

  const navigateToPrivacyPolicy = () => {
    router.push('/privacy-policy');
  };

  const navigateToTermsOfService = () => {
    router.push('/terms-of-service');
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
        <LinearGradient
          colors={[freshColors[currentColorSet][0], freshColors[currentColorSet][1]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.waveGradient}
        />
      </Animated.View>
      
      {/* バブルアニメーション */}
      {bubbleAnims.map((bubble, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bubble,
            {
              transform: [
                { translateX: bubble.position.x },
                { translateY: bubble.position.y },
                { scale: bubble.scale }
              ]
            }
          ]}
        >
          <LinearGradient
            colors={[freshColors[currentColorSet][0], freshColors[currentColorSet][1]]}
            style={styles.bubbleGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      ))}
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.formContainer}>
            <BlurView intensity={10} tint="light" style={styles.blurBackground} />
            <View style={styles.formContent}>
              <Text style={styles.formTitle}>アカウント作成</Text>

              {(error || errorMessage) && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error || errorMessage}</Text>
                </View>
              )}

              {/* 基本情報（必須） */}
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>基本情報</Text>
                
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
                    placeholder="パスワード（6文字以上）"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    placeholderTextColor="rgba(100,120,140,0.5)"
                  />
                  <TouchableOpacity
                    style={styles.visibilityIcon}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  >
                    <Feather
                      name={passwordVisible ? 'eye' : 'eye-off'}
                      size={20}
                      color="rgba(100,120,140,0.8)"
                    />
                  </TouchableOpacity>
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
                    placeholder="パスワード（確認）"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmPasswordVisible}
                    placeholderTextColor="rgba(100,120,140,0.5)"
                  />
                  <TouchableOpacity
                    style={styles.visibilityIcon}
                    onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                  >
                    <Feather
                      name={confirmPasswordVisible ? 'eye' : 'eye-off'}
                      size={20}
                      color="rgba(100,120,140,0.8)"
                    />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.noteContainer}>
                  <MaterialIcons name="info" size={16} color="#4A6572" style={{marginRight: 8}} />
                  <Text style={styles.noteText}>
                    登録後、プロフィールと楽器設定の詳細画面に進みます
                  </Text>
                </View>
              </View>

              <View style={styles.termsContainer}>
                <Checkbox
                  status={termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  color={freshColors[currentColorSet][0]}
                />
                <Text style={styles.termsText}>
                  <Text>私は</Text>
                  <Text style={styles.termsLink} onPress={navigateToTermsOfService}> 利用規約 </Text>
                  <Text>および</Text>
                  <Text style={styles.termsLink} onPress={navigateToPrivacyPolicy}> プライバシーポリシー </Text>
                  <Text>に同意します</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.authButton,
                  { 
                    backgroundColor: freshColors[currentColorSet][0],
                    opacity: email && password && confirmPassword && termsAccepted ? 1 : 0.7 
                  }
                ]}
                onPress={handleRegister}
                disabled={!email || !password || !confirmPassword || !termsAccepted}
              >
                <Text style={styles.authButtonText}>アカウント作成</Text>
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

                {Platform.OS === 'ios' && appleAuthAvailable && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.appleButton]}
                    onPress={handleAppleSignIn}
                    disabled={isLoading}
                  >
                    <FontAwesome name="apple" size={22} color="#FFFFFF" />
                    <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>Apple</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>
                  すでにアカウントをお持ちですか？
                </Text>
                <TouchableOpacity onPress={() => router.push('/auth/login')}>
                  <Text 
                    style={[
                      styles.switchButton,
                      { color: freshColors[currentColorSet][0] }
                    ]}
                  >
                    ログイン
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
    backgroundColor: '#F5FBFF',
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingTop: 20,
    paddingBottom: 40,
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
  bubbleGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formContainer: {
    marginTop: 30,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  blurBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  formContent: {
    padding: 24,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#344955',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 100, 100, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#344955',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(180, 200, 220, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    padding: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    color: '#344955',
  },
  visibilityIcon: {
    padding: 14,
  },
  inputLabel: {
    fontSize: 16,
    color: '#4A6572',
    marginBottom: 8,
    fontWeight: '500',
  },
  dropdownContainer: {
    marginBottom: 16,
    zIndex: 10,
  },
  dropdownButton: {
    borderColor: 'rgba(180, 200, 220, 0.5)',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    elevation: 0,
    width: '100%',
  },
  dropdownButtonContent: {
    height: 52,
    justifyContent: 'flex-start',
  },
  dropdownButtonLabel: {
    color: '#344955',
    fontSize: 16,
    marginLeft: 8,
  },
  selectedMenuItem: {
    backgroundColor: 'rgba(70, 160, 230, 0.1)',
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#4A6572',
    flexShrink: 1,
    marginLeft: 4,
  },
  termsLink: {
    color: '#4285F4',
    fontWeight: '500',
  },
  authButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  authButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  switchText: {
    fontSize: 14,
    color: '#4A6572',
  },
  switchButton: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
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
  googleIcon: {
    marginRight: 8,
  },
  socialButtonText: {
    color: '#2B5876',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#4A6572',
    marginBottom: 16,
    marginTop: -8,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(180, 200, 220, 0.3)',
  },
  noteText: {
    fontSize: 14,
    color: '#4A6572',
    flex: 1,
  },
}); 