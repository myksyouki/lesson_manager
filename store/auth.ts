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
import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '../utils/_storage';

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

export interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isNewUser: boolean;
  premiumStatus: PremiumStatus | null;
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
  setPremiumStatus: (status: PremiumStatus | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 初期状態を設定
  const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isNewUser: false,
    premiumStatus: null,
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

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isNewUser: false,
    premiumStatus: null,

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
        
        // ユーザーのプロファイルも作成（新しい構造対応）
        const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
        await setDoc(profileRef, {
          name: '',
          email: userCredential.user.email,
          selectedCategory: '',
          selectedInstrument: '',
          selectedModel: '',
          isPremium: false,
          isOnboardingCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date()
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
              
              // 新規ユーザーフラグを設定
              set({ isNewUser: true });
            } else {
              // 既存ユーザーの場合、オンボーディング完了状態を確認
              const profileRef = doc(db, `users/${userCredential.user.uid}/profile`, 'main');
              const profileDoc = await getDoc(profileRef);
              
              if (profileDoc.exists()) {
                const profileData = profileDoc.data();
                // オンボーディングが未完了の場合も新規ユーザーと同様に扱う
                if (profileData.isOnboardingCompleted === false) {
                  set({ isNewUser: true });
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
                
                // 新規ユーザーフラグを設定
                set({ isNewUser: true });
              }
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

    setPremiumStatus: (status) => set({ premiumStatus: status }),
  };
});