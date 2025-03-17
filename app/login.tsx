import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from './store/auth';
import { useGoogleAuth } from './store/auth';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, signInAsTestUser, user, isLoading, error, clearError } = useAuthStore();
  const { request, response, promptAsync } = useGoogleAuth(); // ✅ Googleログインのフックを取得

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleAuth = async () => {
    if (!email || !password) return;
    isSignUp ? await signUp(email, password) : await signIn(email, password);
  };

  const handleGoogleSignIn = async () => {
    if (!promptAsync) {
      alert('Googleログインの準備ができていません');
      return;
    }
    await signInWithGoogle(promptAsync);
  };

  const handleTestUserSignIn = async () => {
    await signInAsTestUser();
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    clearError();
  };

  if (isLoading && user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.logoContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop' }}
              style={styles.logo}
            />
            <Text style={styles.appName}>Lesson Manager</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.title}>{isSignUp ? 'アカウント作成' : 'ログイン'}</Text>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* メールログイン */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={22} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="メールアドレス"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.inputContainer}>
              <MaterialIcons name="lock" size={22} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="パスワード"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity
                onPress={() => setPasswordVisible(!passwordVisible)}
                style={styles.visibilityIcon}
              >
                <MaterialIcons
                  name={passwordVisible ? 'visibility' : 'visibility-off'}
                  size={22}
                  color="#8E8E93"
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
                <Text style={styles.authButtonText}>
                  {isSignUp ? 'アカウント作成' : 'ログイン'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Googleログイン */}
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

            {/* テストユーザーログイン */}
            <TouchableOpacity
              style={styles.testUserButton}
              onPress={handleTestUserSignIn}
              disabled={isLoading}
            >
              <MaterialIcons name="person" size={22} color="#FFFFFF" style={styles.testUserIcon} />
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
    backgroundColor: '#F8F9FA',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120, // Larger logo
    height: 120, // Larger logo
    borderRadius: 24, // Increased border radius
    marginBottom: 16,
  },
  appName: {
    fontSize: 28, // Larger font size
    fontWeight: '700',
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 32, // Larger font size
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12, // Increased border radius
    padding: 16, // Increased padding
    marginBottom: 16,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 16, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16, // Increased border radius
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    height: 56, // Increased height for better touch target
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56, // Increased height
    fontSize: 17, // Larger font size
    color: '#1C1C1E',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  visibilityIcon: {
    padding: 10, // Increased padding for better touch target
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    padding: 4, // Added padding for better touch target
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 16, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  authButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16, // Increased border radius
    height: 56, // Increased height
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authButtonText: {
    color: 'white',
    fontSize: 18, // Larger font size
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
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#8E8E93',
    fontSize: 16, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  googleButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16, // Increased border radius
    height: 56, // Increased height
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  googleIcon: {
    width: 24, // Larger icon
    height: 24, // Larger icon
    marginRight: 12,
  },
  googleButtonText: {
    color: '#1C1C1E',
    fontSize: 18, // Larger font size
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
  },
  testUserIcon: {
    marginRight: 12,
  },
  testUserButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8, // Added padding for better touch target
  },
  switchText: {
    color: '#8E8E93',
    fontSize: 16, // Larger font size
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  switchButton: {
    color: '#007AFF',
    fontSize: 16, // Larger font size
    fontWeight: '600',
    marginLeft: 4,
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
});