// app/services/auth.tsx
import { useState, useEffect, createContext, useContext } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuthStore } from '../store/auth';
import { signInWithGoogleNative, silentSignInWithGoogle, refreshGoogleAuthentication } from './googleSignInNative';
import { configureGoogleSignIn } from './googleSignInCommon';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Google SignInのネイティブSDK初期化
if (Platform.OS !== 'web') {
  configureGoogleSignIn();
}

// AsyncStorageのキー
const LAST_SIGNIN_METHOD = 'lastSignInMethod';

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
  setIsNewUser: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  refreshAuth: () => Promise<boolean>;
}

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isNewUser: false,
  setIsNewUser: () => {},
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
  signInWithGoogle: async () => ({ success: false }),
  refreshAuth: async () => false
});

// 認証プロバイダーコンポーネント
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // 最後にサインインした方法をAsyncStorageに保存
  const saveSignInMethod = async (method: string) => {
    try {
      await AsyncStorage.setItem(LAST_SIGNIN_METHOD, method);
    } catch (error) {
      console.error('サインイン方法の保存エラー:', error);
    }
  };

  // トークンの更新
  const refreshAuth = async (): Promise<boolean> => {
    try {
      if (!user) return false;

      const lastMethod = await AsyncStorage.getItem(LAST_SIGNIN_METHOD);
      if (lastMethod === 'google') {
        await refreshGoogleAuthentication();
        return true;
      }
      return false;
    } catch (error) {
      console.error('認証更新エラー:', error);
      return false;
    }
  };

  useEffect(() => {
    let isActive = true;

    const initAuth = async () => {
      // Firebase Auth状態のリスナー
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        // ユーザーがログアウトした状態で、前回Googleでログインしていた場合はサイレントログインを試みる
        if (!currentUser && Platform.OS !== 'web') {
          try {
            const lastMethod = await AsyncStorage.getItem(LAST_SIGNIN_METHOD);
            if (lastMethod === 'google') {
              console.log('サイレントサインインを試みます');
              const result = await silentSignInWithGoogle();
              if (result && isActive) {
                // silentSignInWithGoogleはonAuthStateChangedをトリガーするので
                // ここでsetUserを呼ぶ必要はない
                console.log('サイレントサインイン成功');
              }
            }
          } catch (error) {
            console.log('サイレントサインイン失敗:', error);
          }
        }

        if (isActive) {
          setUser(currentUser);
          setLoading(false);
        }
      });

      return unsubscribe;
    };

    const unsubscribe = initAuth();

    return () => {
      isActive = false;
      // unsubscribeは関数なのでクリーンアップで呼び出す
      unsubscribe.then(fn => fn());
    };
  }, []);

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // サインイン方法を保存
      await saveSignInMethod('email');
      // 既存ユーザーのサインインなのでfalseに設定
      setIsNewUser(false);
      return { success: true };
    } catch (error: any) {
      console.error('サインインエラー:', error);
      return { 
        success: false, 
        error: error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password'
          ? 'メールアドレスまたはパスワードが間違っています'
          : 'サインインに失敗しました。後でもう一度お試しください。'
      };
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // サインイン方法を保存
      await saveSignInMethod('email');
      
      // 新規ユーザーのプロファイルをFirestoreに作成
      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        email: userCredential.user.email,
        createdAt: new Date(),
        selectedInstrument: '',
        selectedModel: '',
        isPremium: false,
        isOnboardingCompleted: false
      });
      
      // 新規ユーザーなのでtrueに設定
      setIsNewUser(true);
      return { success: true };
    } catch (error: any) {
      console.error('サインアップエラー:', error);
      return { 
        success: false, 
        error: error.code === 'auth/email-already-in-use'
          ? 'このメールアドレスは既に使用されています'
          : 'アカウント作成に失敗しました。後でもう一度お試しください。'
      };
    }
  };

  // サインアウト
  const signOut = async () => {
    try {
      // サインイン方法を削除
      await AsyncStorage.removeItem(LAST_SIGNIN_METHOD);
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('サインアウトエラー:', error);
    }
  };

  // Googleサインイン
  const signInWithGoogle = async () => {
    try {
      if (Platform.OS === 'web') {
        // Webの場合はstoreのsignInWithGoogle関数を使用
        throw new Error('Web環境ではこの関数を使用せず、store/auth.tsのsignInWithGoogleを使用してください');
      } else {
        // ネイティブ環境の場合
        const result = await signInWithGoogleNative();
        // サインイン方法を保存
        await saveSignInMethod('google');
        setIsNewUser(result.isNewUser);
        return { success: true };
      }
    } catch (error: any) {
      console.error('Googleサインインエラー:', error);
      return { 
        success: false, 
        error: error.message || 'Googleサインインに失敗しました。後でもう一度お試しください。'
      };
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      console.error('パスワードリセットエラー:', error);
      return { 
        success: false, 
        error: error.code === 'auth/user-not-found'
          ? 'このメールアドレスに関連するアカウントが見つかりません'
          : 'パスワードリセットに失敗しました。後でもう一度お試しください。'
      };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      isNewUser, 
      setIsNewUser, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      signInWithGoogle,
      refreshAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// 認証フックの作成
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
