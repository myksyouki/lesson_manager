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
import { auth } from '../config/firebase';

// 認証コンテキストの型定義
interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

// 認証コンテキストの作成
const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  resetPassword: async () => ({ success: false }),
});

// 認証プロバイダーコンポーネント
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
      await createUserWithEmailAndPassword(auth, email, password);
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
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

// 認証フックの作成
export const useAuth = () => useContext(AuthContext);
