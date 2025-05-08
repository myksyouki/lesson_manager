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
import { signInWithGoogleNative } from './googleSignInNative';
import { configureGoogleSignIn } from './googleSignInCommon';
import { Platform } from 'react-native';

// Google SignInのネイティブSDK初期化
if (Platform.OS !== 'web') {
  configureGoogleSignIn();
}

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
  signInWithGoogle: async () => ({ success: false })
});

// 認証プロバイダーコンポーネント
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // サインイン
  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
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
      signInWithGoogle 
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
