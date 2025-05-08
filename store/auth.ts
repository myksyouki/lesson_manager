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
  OAuthProvider,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { router } from "expo-router";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { checkOnboardingStatus } from "../services/userProfileService";
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '../utils/_storage';
import { Alert } from "react-native";
import { getDefaultDemoData } from './demoData';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoModeService } from '../services/demoModeService';
import * as AppleAuthentication from 'expo-apple-authentication';

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

// プレミアムステータスの型定義
export interface PremiumStatus {
  isPremium: boolean;
  expiryDate?: Date | null;
}

// 削除予約ステータスの型定義
export interface DeletionStatus {
  isScheduledForDeletion: boolean;
  scheduledForDeletion: Date | null;
  remainingDays: number;
}

export interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewUser: boolean;
  isOnboardingCompleted: boolean;
  premiumStatus: PremiumStatus | null;
  deletionStatus: DeletionStatus | null;
  isDemo: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<{ user: AppUser; isNewUser: boolean }>;
  signInWithGoogle: () => Promise<{ user: AppUser; isNewUser: boolean } | null>;
  signInWithApple: (credential?: AppleAuthentication.AppleAuthenticationCredential) => Promise<{ user: AppUser; isNewUser: boolean } | null>;
  signInAsTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  scheduleAccountDeletion: (password: string) => Promise<void>;
  cancelAccountDeletion: () => Promise<void>;
  checkDeletionStatus: () => Promise<void>;
  setError: (error: string) => void;
  clearError: () => void;
  setIsNewUser: (value: boolean) => void;
  setOnboardingCompleted: (value: boolean) => void;
  setUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setPremiumStatus: (status: PremiumStatus | null) => void;
  enterDemoMode: () => Promise<void>;
  exitDemoMode: () => Promise<void>;
}

// Firebaseのエラーコードと日本語エラーメッセージのマッピング
const firebaseErrorMessages: { [key: string]: string } = {
  'auth/user-not-found': 'メールアドレスが登録されていません',
  'auth/wrong-password': 'パスワードが正しくありません',
  'auth/email-already-in-use': 'このメールアドレスは既に使用されています',
  'auth/invalid-email': 'メールアドレスの形式が正しくありません',
  'auth/weak-password': 'パスワードが弱すぎます。6文字以上の強力なパスワードを使用してください',
  'auth/operation-not-allowed': 'この操作は許可されていません',
  'auth/network-request-failed': 'ネットワークエラーが発生しました。インターネット接続を確認してください',
  'auth/too-many-requests': '短時間にあまりにも多くのリクエストがありました。しばらく時間をおいてから再試行してください',
  'auth/user-disabled': 'このアカウントは無効化されています',
  'auth/requires-recent-login': '再度ログインしてからもう一度お試しください',
  'auth/popup-closed-by-user': 'ログインウィンドウが閉じられました',
  'auth/cancelled-popup-request': 'ログイン処理がキャンセルされました',
  'auth/popup-blocked': 'ログインポップアップがブロックされました。ポップアップを許可してください',
  'auth/account-exists-with-different-credential': 'このメールアドレスは既に別の方法で登録されています',
  'auth/invalid-credential': '認証情報が無効です',
  'auth/invalid-verification-code': '確認コードが無効です',
  'auth/invalid-verification-id': '確認IDが無効です',
  'auth/missing-verification-code': '確認コードがありません',
  'auth/missing-verification-id': '確認IDがありません',
};

// エラーメッセージを日本語に変換する関数
const getJapaneseErrorMessage = (error: any): string => {
  if (!error) return '不明なエラーが発生しました';
  
  // エラーコードが存在する場合
  if (error.code && firebaseErrorMessages[error.code]) {
    return firebaseErrorMessages[error.code];
  }
  
  // メッセージが存在する場合
  if (error.message) {
    // メッセージに "Firebase: " が含まれる場合は削除
    const message = error.message.replace('Firebase: ', '');
    // 英語のエラーメッセージを含む可能性があるので、デフォルトの日本語メッセージを返す
    return '認証エラーが発生しました。もう一度お試しください。';
  }
  
  return '不明なエラーが発生しました';
};

export const useAuthStore = create<AuthState>((set, get) => {
  // 初期状態を設定
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isNewUser: false,
    isOnboardingCompleted: false,
    premiumStatus: null,
    deletionStatus: null,
    isDemo: false,
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
      
      // 1. まずFirebase認証状態を確認
      const currentUser = auth.currentUser;

      // 2. AsyncStorage/LocalStorageからユーザー情報の復元を試みる
      let storedUser = null;
      
      try {
        if (Platform.OS === 'web') {
          // ウェブの場合はlocalStorageから直接読み込み
          const userId = localStorage.getItem('userId');
          const userEmail = localStorage.getItem('userEmail');
          if (userId) {
            storedUser = {
              uid: userId,
              email: userEmail,
              displayName: localStorage.getItem('userDisplayName'),
              photoURL: localStorage.getItem('userPhotoURL')
            };
          }
        } else {
          // ネイティブアプリの場合はAsyncStorageから読み込み
          const userData = await getLocalStorageItem('auth_user');
          if (userData && userData.uid) {
            storedUser = userData;
          }
        }
      } catch (storageError) {
        console.error("ストレージからの認証情報取得エラー:", storageError);
      }
      
      // 3. 現在のユーザーが取得できた場合はそれを使用
      if (currentUser) {
        console.log("✅ Firebase認証からユーザー情報を復元:", currentUser.uid);
        set({ user: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL
        }, isAuthenticated: true, isLoading: false });
        
        // ローカルストレージにも保存/更新
        try {
          if (Platform.OS === 'web') {
            localStorage.setItem('userAuth', 'true');
            localStorage.setItem('userId', currentUser.uid);
            localStorage.setItem('userEmail', currentUser.email || '');
            localStorage.setItem('userDisplayName', currentUser.displayName || '');
            localStorage.setItem('userPhotoURL', currentUser.photoURL || '');
          } else {
            await setLocalStorageItem('auth_user', {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL
            });
          }
        } catch (e) {
          console.error('ローカルストレージへの保存に失敗:', e);
        }
      } 
      // 4. ストレージからユーザー情報が取得できていて、Firebaseにはない場合
      else if (storedUser) {
        console.log("⚠️ ストレージにユーザー情報がありますが、Firebase認証セッションが見つかりません");
        console.log("🔄 ユーザーを暫定的に復元し、onAuthStateChangedの結果を待機します");
        
        // ローカルストレージからの情報でユーザー状態を設定
        set({ 
          user: storedUser,
          isAuthenticated: true,
          isLoading: true // onAuthStateChangedを待機中という意味で
        });
      }
      // 5. どこにも認証情報がない場合
      else {
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
    checkInitialAuth().catch(error => {
      console.error('認証状態初期化エラー:', error);
      // エラー時は明示的に未認証状態に設定
      set({ user: null, isAuthenticated: false, isLoading: false });
    });
  }, 0);

  // 認証状態を監視（一度だけリスナーを設定）
  useEffect(() => {
    console.log('🔐 認証状態監視を開始します');
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        console.log('🔐 認証状態変更:', user ? `ユーザー ${user.uid} がログイン中` : "未ログイン");
        
        if (user) {
          // ユーザー情報をストアに保存
          set({ 
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            }, 
            isAuthenticated: true, 
            isLoading: false 
          });
          
          // ストレージに保存
          try {
            if (Platform.OS === 'web') {
              localStorage.setItem('userAuth', 'true');
              localStorage.setItem('userId', user.uid);
              localStorage.setItem('userEmail', user.email || '');
              localStorage.setItem('userDisplayName', user.displayName || '');
              localStorage.setItem('userPhotoURL', user.photoURL || '');
            } else {
              await setLocalStorageItem('auth_user', {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL
              });
            }
          } catch (e) {
            console.error('ストレージへの認証情報保存に失敗:', e);
          }
        } else {
          // 未ログイン状態に設定
          set({ user: null, isAuthenticated: false, isLoading: false });
          
          // ストレージから削除
          try {
            if (Platform.OS === 'web') {
              localStorage.removeItem('userAuth');
              localStorage.removeItem('userId');
              localStorage.removeItem('userEmail');
              localStorage.removeItem('userDisplayName');
              localStorage.removeItem('userPhotoURL');
            } else {
              await removeLocalStorageItem('auth_user');
            }
          } catch (e) {
            console.error('ストレージからの認証情報削除に失敗:', e);
          }
        }
      } catch (error) {
        console.error('認証状態監視エラー:', error);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    });
    
    // クリーンアップ関数を返す
    return () => {
      console.log('🔐 認証状態監視を終了します');
      unsubscribe();
    };
  }, []);

  // ユーザー情報をローカルストレージに保存する関数
  const saveUserToStorage = async (user: AppUser | null, isDemo: boolean = false) => {
    try {
      if (Platform.OS === 'web') {
        if (user) {
          localStorage.setItem('userAuth', 'true');
          localStorage.setItem('userId', user.uid);
          localStorage.setItem('userEmail', user.email || '');
          localStorage.setItem('userDisplayName', user.displayName || '');
          localStorage.setItem('userPhotoURL', user.photoURL || '');
          localStorage.setItem('isDemo', isDemo ? 'true' : 'false');
        } else {
          localStorage.removeItem('userAuth');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userDisplayName');
          localStorage.removeItem('userPhotoURL');
          localStorage.removeItem('isDemo');
        }
      } else {
        if (user) {
          await setLocalStorageItem('auth_user', user);
          await setLocalStorageItem('isDemo', isDemo);
        } else {
          await removeLocalStorageItem('auth_user');
          await removeLocalStorageItem('isDemo');
        }
      }
    } catch (error) {
      console.error('ユーザー情報の保存/削除に失敗:', error);
    }
  };

  return {
    ...initialState,
    login: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        console.log("🔑 ログイン試行:", email);
        
        await signInWithEmailAndPassword(auth, email, password);
        console.log("✅ ログイン成功");
        
        // 追加情報は onAuthStateChanged で設定されるため、
        // ここでは最低限の情報だけを設定
        set({ isLoading: false, isNewUser: false, error: null });
      } catch (error: any) {
        console.error("❌ ログイン失敗:", error);
        const errorMessage = getJapaneseErrorMessage(error);
        set({ isLoading: false, error: errorMessage });
      }
    },

    register: async (email, password, displayName) => {
      try {
        set({ isLoading: true, error: null });
        console.log("📝 ユーザー登録試行:", email);
        
        // 新規ユーザー作成
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("✅ ユーザー登録成功:", userCredential.user.uid);
        
        // 表示名を設定
        if (displayName) {
          await updateProfile(userCredential.user, { displayName });
        }
        
        // 新規ユーザーのプロファイルをFirestoreに作成
        const userRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userRef, {
          email: userCredential.user.email,
          displayName: displayName || null,
          createdAt: new Date(),
          selectedInstrument: '',
          selectedModel: '',
          isPremium: false,
          isOnboardingCompleted: false
        });
        
        set({ isLoading: false, isNewUser: true });
        
        // ユーザー情報を返す
        const appUser: AppUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        };
        
        return { user: appUser, isNewUser: true };
      } catch (error: any) {
        console.error("❌ ユーザー登録失敗:", error);
        const errorMessage = getJapaneseErrorMessage(error);
        set({ isLoading: false, error: errorMessage });
        throw new Error(errorMessage);
      }
    },
    
    signInWithGoogle: async () => {
      try {
        set({ isLoading: true, error: null, isNewUser: false });
        console.log("🔑 Googleサインイン試行");
        
        let userCredential;
        
        // プラットフォームに応じた認証方法を使用
        if (Platform.OS === 'web') {
          // Web環境: ポップアップ認証を使用
          const provider = new GoogleAuthProvider();
          userCredential = await signInWithPopup(auth, provider);
        } else {
          // モバイル環境: 別の方法が必要
          // モバイルではlogin.tsxからprompさせる必要があるため、
          // signInWithGoogle関数はそのまま実行する
          throw new Error('モバイル環境ではGoogle認証方法が異なります。アプリを更新してください。');
        }
        
        // 以降はユーザー情報の処理（既存のコード）
        // ユーザーが既に存在するか確認
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        
        let isNewUser = false;
        
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
          
          // ユーザーのプロファイルも作成（新しい構造対応）
          const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
          await setDoc(profileRef, {
            name: userCredential.user.displayName || '',
            email: userCredential.user.email,
            selectedCategory: '',
            selectedInstrument: '',
            selectedModel: '',
            isPremium: false,
            isOnboardingCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          isNewUser = true;
        } else {
          // 既存ユーザーの場合、オンボーディング完了状態を確認
          const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
          const profileDoc = await getDoc(profileRef);
          
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            // オンボーディングが未完了の場合も新規ユーザーと同様に扱う
            if (profileData.isOnboardingCompleted === false) {
              isNewUser = true;
            }
          } else {
            // プロファイルが存在しない場合、新規作成
            await setDoc(profileRef, {
              name: userCredential.user.displayName || '',
              email: userCredential.user.email,
              selectedCategory: '',
              selectedInstrument: '',
              selectedModel: '',
              isPremium: false,
              isOnboardingCompleted: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            isNewUser = true;
          }
        }
        
        // ストアの状態を更新
        set({ isNewUser, isLoading: false });
        
        console.log("✅ Googleサインイン成功");
        
        const appUser: AppUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        };
        
        return { user: appUser, isNewUser };
      } catch (error: any) {
        console.error("❌ Googleサインイン失敗:", error.message);
        const errorMessage = getJapaneseErrorMessage(error);
        set({ error: errorMessage, isLoading: false });
        
        if (error.code === 'auth/popup-closed-by-user') {
          // ユーザーがポップアップを閉じた場合
          set({ error: "Googleログインがキャンセルされました", isLoading: false });
        }
        
        throw error;
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
        // ログイン画面に遷移
        const router = require('expo-router').router;
        router.replace('/auth/login');
      } catch (error: any) {
        console.error("❌ サインアウト失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    // アカウント削除予約機能
    scheduleAccountDeletion: async (password: string = '') => {
      try {
        set({ isLoading: true, error: null });
        
        // 再認証を行う - パスワードが空でない場合のみ実行
        if (password) {
          const authService = await import('../services/authService');
          await authService.reauthenticate(password);
        }
        
        // アカウント削除を予約
        const authService = await import('../services/authService');
        const result = await authService.scheduleAccountDeletion();
        
        // 削除ステータスを更新
        set({ 
          isLoading: false,
          deletionStatus: {
            isScheduledForDeletion: true,
            scheduledForDeletion: result.scheduledForDeletion,
            remainingDays: 30
          }
        });
        
        // 成功メッセージを表示
        Alert.alert(
          'アカウント削除を予約しました',
          '30日後にアカウントが完全に削除されます。その前にログインすれば削除をキャンセルできます。'
        );
        
      } catch (error: any) {
        console.error('アカウント削除予約エラー:', error);
        set({ 
          isLoading: false, 
          error: error.message || 'アカウント削除予約中にエラーが発生しました'
        });
        throw error;
      }
    },
    
    // 削除予約キャンセル
    cancelAccountDeletion: async () => {
      try {
        set({ isLoading: true, error: null });
        
        // 削除予約をキャンセル
        const authService = await import('../services/authService');
        await authService.cancelAccountDeletion();
        
        // 削除ステータスをリセット
        set({ 
          isLoading: false,
          deletionStatus: {
            isScheduledForDeletion: false,
            scheduledForDeletion: null,
            remainingDays: 0
          }
        });
        
        // 成功メッセージを表示
        Alert.alert(
          '削除予約をキャンセルしました',
          'アカウント削除がキャンセルされました。引き続きサービスをご利用いただけます。'
        );
        
      } catch (error: any) {
        console.error('削除予約キャンセルエラー:', error);
        set({ 
          isLoading: false, 
          error: error.message || '削除予約のキャンセル中にエラーが発生しました'
        });
        throw error;
      }
    },
    
    // 削除ステータスを確認
    checkDeletionStatus: async () => {
      try {
        // 現在のユーザーがあるか確認
        const { user } = get();
        if (!user) return;
        
        // 削除ステータスを取得
        const authService = await import('../services/authService');
        const status = await authService.getAccountDeletionStatus(user.uid);
        
        // エラーが発生した場合でもデフォルト値を設定
        if (status.error) {
          console.error('削除ステータス確認エラー:', status.error);
          set({ 
            deletionStatus: {
              isScheduledForDeletion: false,
              scheduledForDeletion: null,
              remainingDays: 0
            }
          });
          return;
        }
        
        // ステータスを更新
        set({ deletionStatus: status });
        
      } catch (error: any) {
        console.error('削除ステータス確認エラー:', error);
        // エラー発生時もデフォルト値を設定
        set({ 
          deletionStatus: {
            isScheduledForDeletion: false,
            scheduledForDeletion: null,
            remainingDays: 0
          }
        });
      }
    },
    
    // 即時アカウント削除（パスワード必須）
    deleteAccount: async (password: string) => {
      try {
        set({ isLoading: true, error: null });
        
        // 再認証を行う
        const authService = await import('../services/authService');
        await authService.reauthenticate(password);
        
        // アカウントを削除
        await authService.deleteAccount();
        
        // ストレージからユーザー情報を削除
        if (Platform.OS === 'web') {
          localStorage.removeItem('userAuth');
          localStorage.removeItem('userId');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userDisplayName');
          localStorage.removeItem('userPhotoURL');
        } else {
          await removeLocalStorageItem('auth_user');
        }
        
        // ストアをリセット
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false,
          isNewUser: false,
          isOnboardingCompleted: false,
          premiumStatus: null,
          deletionStatus: null,
          error: null
        });
        
        // ホーム画面へリダイレクト
        router.replace('/');
        
      } catch (error: any) {
        console.error('アカウント削除エラー:', error);
        set({ 
          isLoading: false, 
          error: error.message || 'アカウント削除中にエラーが発生しました'
        });
        throw error;
      }
    },

    setError: (error) => set({ error }),
    
    clearError: () => set({ error: null }),
    
    setIsNewUser: (value) => set({ isNewUser: value }),

    setOnboardingCompleted: (value) => set({ isOnboardingCompleted: value }),

    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

    setLoading: (loading) => set({ isLoading: loading }),

    setPremiumStatus: (status) => set({ premiumStatus: status }),

    signInWithApple: async (credential?: AppleAuthentication.AppleAuthenticationCredential) => {
      try {
        set({ isLoading: true, error: null, isNewUser: false });
        console.log("🔑 Appleサインイン試行");
        
        // AppleのOAuth認証を実行
        const credentialResult = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        
        // Appleから取得した認証情報をFirebaseの認証情報に変換
        const { identityToken } = credentialResult;
        
        if (!identityToken) {
          throw new Error('Apple認証からIDトークンを取得できませんでした');
        }
        
        const provider = new OAuthProvider('apple.com');
        const firebaseCredential = provider.credential({
          idToken: identityToken,
          // nonce プロパティが Apple の認証情報に存在しない場合、省略
          // rawNonce: credential.nonce,
        });
        
        // Firebaseでサインイン
        const userCredential = await signInWithCredential(auth, firebaseCredential);
        
        // ユーザーが存在するか確認
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        
        let isNewUser = false;
        
        if (!userDoc.exists()) {
          // Apple認証から取得できる名前情報は初回のみなので保存しておく
          const displayName = credentialResult.fullName 
            ? `${credentialResult.fullName.givenName || ''} ${credentialResult.fullName.familyName || ''}`.trim()
            : userCredential.user.displayName || '';
          
          // 新規ユーザーの場合、プロファイルを作成
          await setDoc(userRef, {
            email: userCredential.user.email,
            displayName: displayName,
            createdAt: new Date(),
            selectedInstrument: '',
            selectedModel: '',
            isPremium: false,
            isOnboardingCompleted: false
          });
          
          // Firebaseの表示名を更新（Appleは2回目以降名前が取得できないため）
          if (displayName && auth.currentUser) {
            await updateProfile(auth.currentUser, {
              displayName: displayName
            });
          }
          
          // ユーザーのプロファイルも作成（新しい構造対応）
          const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
          await setDoc(profileRef, {
            name: displayName,
            email: userCredential.user.email,
            selectedCategory: '',
            selectedInstrument: '',
            selectedModel: '',
            isPremium: false,
            isOnboardingCompleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          isNewUser = true;
        } else {
          // 既存ユーザーの場合、オンボーディング完了状態を確認
          const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
          const profileDoc = await getDoc(profileRef);
          
          if (profileDoc.exists()) {
            const profileData = profileDoc.data();
            // オンボーディングが未完了の場合も新規ユーザーと同様に扱う
            if (profileData.isOnboardingCompleted === false) {
              isNewUser = true;
            }
          } else {
            // プロファイルが存在しない場合、新規作成
            await setDoc(profileRef, {
              name: userCredential.user.displayName || '',
              email: userCredential.user.email,
              selectedCategory: '',
              selectedInstrument: '',
              selectedModel: '',
              isPremium: false,
              isOnboardingCompleted: false,
              createdAt: new Date(),
              updatedAt: new Date()
            });
            
            isNewUser = true;
          }
        }
        
        // ストアの状態を更新
        set({ isNewUser, isLoading: false });
        
        console.log("✅ Appleサインイン成功");
        
        const appUser: AppUser = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: userCredential.user.displayName,
          photoURL: userCredential.user.photoURL
        };
        
        return { user: appUser, isNewUser };
      } catch (error: any) {
        console.error("❌ Appleサインイン失敗:", error);
        set({ error: error.message || "Apple認証に失敗しました", isLoading: false });
        
        if (error.code === 'ERR_CANCELED') {
          // ユーザーが認証をキャンセルした場合
          set({ error: "Apple認証がキャンセルされました", isLoading: false });
        }
        
        throw error;
      }
    },

    // デモモードに入る
    enterDemoMode: async () => {
      try {
        console.log('デモモード開始');
        
        // デモユーザーを作成
        const demoUser: AppUser = {
          uid: 'demo-user',
          email: 'demo@example.com',
          displayName: 'デモユーザー',
          photoURL: null
        };
        
        // デモデータをリセット（デフォルトデータを確実に読み込む）
        await demoModeService.resetToDefaultData();
        
        // デモユーザー情報を保存
        set({ 
          user: demoUser, 
          isAuthenticated: true,
          isDemo: true 
        });
        
        // ローカルストレージにデモユーザー情報を保存
        await saveUserToStorage(demoUser, true);
        
      } catch (error: any) {
        console.error('デモモード開始エラー:', error);
        set({ error: error.message });
      }
    },
    
    // デモモードから抜ける
    exitDemoMode: async () => {
      try {
        console.log('デモモード終了');
        
        // 認証状態をリセット
        set({ 
          user: null, 
          isAuthenticated: false,
          isDemo: false 
        });
        
        // ローカルストレージからデモユーザー情報を削除
        await saveUserToStorage(null);
        
        // デモデータをクリア
        await demoModeService.clearAllDemoData();
        
        // ログイン画面にリダイレクト
        router.replace('/');
      } catch (error: any) {
        console.error('デモモード終了エラー:', error);
        set({ error: error.message });
      }
    },
  };
});