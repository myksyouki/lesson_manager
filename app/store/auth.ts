import { useEffect } from "react";
import { create } from "zustand";
import { auth, db } from "../config/firebase";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { checkOnboardingStatus } from "../services/userProfileService";
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '../utils/storage';

console.log("✅ Expo Config Extra:", Constants.expoConfig?.extra);
console.log("🔗 Redirect URI:", Constants.expoConfig?.extra?.expoPublicGoogleRedirectUri);

// ExpoのWebブラウザセッションを有効化
WebBrowser.maybeCompleteAuthSession();

// Expoの自動リダイレクトURI生成を使う
const redirectUri = AuthSession.makeRedirectUri({
  scheme: "lessonmanager",
  preferLocalhost: false, // ✅ ローカル環境でも `https://auth.expo.io/...` を使う
});

// 初期化時に一度だけログ出力
console.log("🔍 実際に使われるURI:", redirectUri);

// テストユーザーの認証情報
const TEST_USER_EMAIL = "test@example.com";
const TEST_USER_PASSWORD = "testuser123";

// ✅ Googleログイン用のフック
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: Constants.expoConfig?.extra?.expoPublicGoogleIosClientId,
    androidClientId: Constants.expoConfig?.extra?.expoPublicGoogleAndroidClientId,
    webClientId: Constants.expoConfig?.extra?.expoPublicGoogleWebClientId,
    redirectUri,         // 上記で生成したURI
    scopes: ["profile", "email"],
  });

  return { request, response, promptAsync };
}

// ✅ Zustand（認証ストア）
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (promptAsync: () => Promise<any>) => Promise<void>;
  signInAsTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
  setIsNewUser: (value: boolean) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 初期状態を設定
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isNewUser: false,
  };
  
  // 起動時にonAuthStateChangedより先に実行されるチェック
  const checkInitialAuth = async () => {
    try {
      console.log("🔍 初期認証状態をチェック中...");
      
      // 現在の状態を安全に取得
      const currentState = get ? get() : initialState;
      
      // すでにログイン中の場合は処理を行わない
      if (currentState.user) {
        return;
      }
      
      // 認証状態を確認
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log("✅ 保存されていた認証情報を復元:", currentUser.uid);
        set({ user: currentUser, isAuthenticated: true, isLoading: false });
      } else {
        console.log("❌ 保存された認証情報なし");
        // 状態だけ更新し、ナビゲーションはレイアウトコンポーネントに任せる
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      console.error("❌ 初期認証チェックエラー:", error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  };
  
  // 安全に初期チェックを実行 (setTimeout経由で非同期に実行)
  setTimeout(() => {
    checkInitialAuth();
  }, 0);

  // 認証状態を監視
  onAuthStateChanged(auth, async (user) => {
    console.log("🔐 認証状態変更:", user ? `ユーザー ${user.uid} がログイン中` : "未ログイン");
    set({ user: user || null, isAuthenticated: !!user, isLoading: false });
    
    // ユーザー情報をローカルストレージに保存（ウェブのみ）
    if (Platform.OS === 'web' && user) {
      try {
        localStorage.setItem('userAuth', 'true');
        localStorage.setItem('userId', user.uid);
      } catch (e) {
        console.error('ローカルストレージへの保存に失敗:', e);
      }
    }

    // ユーザーがログインしている場合の処理
    if (user) {
      try {
        // オンボーディング状態を確認
        const isOnboardingCompleted = await checkOnboardingStatus();
        
        // 新規ユーザーフラグを設定 (ナビゲーションはレイアウトコンポーネントに任せる)
        if (get().isNewUser) {
          console.log("🆕 新規ユーザー - オンボーディングが必要");
        } 
        // オンボーディング未完了の場合も状態を記録
        else if (!isOnboardingCompleted) {
          console.log("🔄 既存ユーザー - オンボーディングが未完了");
        }
        // 通常ユーザーの場合のログ
        else {
          console.log("✅ 認証済みユーザー - 全設定完了");
        }
      } catch (error) {
        console.error('ユーザープロファイル確認エラー:', error);
      }
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isNewUser: false,

    login: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        console.log("🔑 サインイン試行:", email);
        await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ サインイン成功:", email);
      } catch (error: any) {
        console.error("❌ サインイン失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    register: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        console.log("📝 サインアップ試行:", email);
        
        // ユーザー作成
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
        
        // 新規ユーザーフラグを設定
        set({ isNewUser: true });
        
        console.log("✅ サインアップ成功:", email);
      } catch (error: any) {
        console.error("❌ サインアップ失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },
    
    signInWithGoogle: async (promptAsync) => {
      try {
        set({ isLoading: true, error: null, isNewUser: false });
        console.log("🔑 Googleサインイン試行");
        const result = await promptAsync();
        if (result?.type === "success") {
          const { id_token } = result.params;
          const credential = GoogleAuthProvider.credential(id_token);
          
          // ユーザーが既に存在するか確認するためにサインイン前にチェック
          try {
            const userCredential = await signInWithCredential(auth, credential);
            
            // Googleアカウントで初めてのログインかどうかを確認
            const userRef = doc(db, 'users', userCredential.user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
              // 新規ユーザーの場合、プロファイルを作成
              await setDoc(userRef, {
                email: userCredential.user.email,
                createdAt: new Date(),
                selectedInstrument: '',
                selectedModel: '',
                isPremium: false,
                isOnboardingCompleted: false
              });
              
              // 新規ユーザーフラグを設定
              set({ isNewUser: true });
            }
            
            console.log("✅ Googleサインイン成功");
          } catch (error) {
            console.error("❌ Googleサインイン処理失敗:", error);
            set({ error: "Googleログイン処理中にエラーが発生しました", isLoading: false });
          }
        } else {
          console.log("❌ Googleサインインキャンセル:", result?.type);
          set({ error: "Googleログインがキャンセルされました", isLoading: false });
        }
      } catch (error: any) {
        console.error("❌ Googleサインイン失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    signInAsTestUser: async () => {
      try {
        set({ isLoading: true, error: null, isNewUser: false });
        console.log("🔑 テストユーザーサインイン試行");
        
        try {
          // テストユーザーでログイン試行
          await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
          console.log("✅ テストユーザーサインイン成功");
        } catch (error) {
          // ログイン失敗の場合はアカウント作成
          console.log("📝 テストユーザー作成試行");
          const userCredential = await createUserWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
          
          // 新規ユーザーのプロファイルをFirestoreに作成
          const userRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(userRef, {
            email: userCredential.user.email,
            createdAt: new Date(),
            selectedInstrument: 'clarinet', // テストユーザーには初期値を設定
            selectedModel: 'standard',
            isPremium: true, // テスト用に全機能を有効化
            isOnboardingCompleted: true // テスト用にオンボーディングをスキップ
          });
          
          console.log("✅ テストユーザー作成成功");
        }
      } catch (error: any) {
        console.error("❌ テストユーザー処理失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    signOut: async () => {
      try {
        set({ isLoading: true, error: null });
        console.log("🚪 サインアウト試行");
        await signOut(auth);
        set({ user: null, isAuthenticated: false, isLoading: false, isNewUser: false });
        console.log("✅ サインアウト成功");
        // サインアウト後のナビゲーションはレイアウトの条件付きレンダリングに任せる
      } catch (error: any) {
        console.error("❌ サインアウト失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    setError: (error) => set({ error }),
    
    clearError: () => set({ error: null }),
    
    setIsNewUser: (value) => set({ isNewUser: value }),

    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

    setLoading: (loading) => set({ isLoading: loading }),
  };
});