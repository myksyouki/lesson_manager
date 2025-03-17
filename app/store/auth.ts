import { useEffect } from "react";
import { create } from "zustand";
import { auth } from "../config/firebase";
import {
  User,
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

  // デバッグ用のログ出力を削除
  // console.log("🌍 Google リクエスト URL:", request?.url);

  // 自動サインイン処理を削除
  // useEffect(() => {
  //   if (response?.type === "success") {
  //     const { id_token } = response.params;
  //     const credential = GoogleAuthProvider.credential(id_token);
  //     signInWithCredential(auth, credential)
  //       .then(() => console.log("✅ Googleログイン成功"))
  //       .catch((error) => console.error("❌ Googleログイン失敗:", error));
  //   }
  // }, [response]);

  return { request, response, promptAsync };
}

// ✅ Zustand（認証ストア）
interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: (promptAsync: () => Promise<any>) => Promise<void>;
  signInAsTestUser: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 認証状態を監視
  onAuthStateChanged(auth, (user) => {
    console.log("🔐 認証状態変更:", user ? `ユーザー ${user.uid} がログイン中` : "未ログイン");
    set({ user: user || null, isLoading: false });
    
    // ユーザー情報をローカルストレージに保存（ウェブのみ）
    if (Platform.OS === 'web' && user) {
      try {
        localStorage.setItem('userAuth', 'true');
      } catch (e) {
        console.error('ローカルストレージへの保存に失敗:', e);
      }
    }

    if (user) {
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 100);
    }
  });

  return {
    user: null,
    isLoading: true,
    error: null,

    signUp: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        console.log("📝 サインアップ試行:", email);
        await createUserWithEmailAndPassword(auth, email, password);
        console.log("✅ サインアップ成功:", email);
      } catch (error: any) {
        console.error("❌ サインアップ失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    signIn: async (email, password) => {
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

    signInWithGoogle: async (promptAsync) => {
      try {
        set({ isLoading: true, error: null });
        console.log("🔑 Googleサインイン試行");
        const result = await promptAsync();
        if (result?.type === "success") {
          const { id_token } = result.params;
          const credential = GoogleAuthProvider.credential(id_token);
          await signInWithCredential(auth, credential);
          console.log("✅ Googleサインイン成功");
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
        set({ isLoading: true, error: null });
        console.log("🔑 テストユーザーサインイン試行");
        await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
        console.log("✅ テストユーザーサインイン成功");
      } catch (error: any) {
        console.log("❌ テストユーザーサインイン失敗:", error.message);
        // テストユーザーが存在しない場合は作成してからログイン
        try {
          console.log("📝 テストユーザー作成試行");
          await createUserWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
          console.log("✅ テストユーザー作成成功");
        } catch (createError: any) {
          // ユーザーが既に存在する場合は無視（再度ログイン試行）
          if (createError.code !== 'auth/email-already-in-use') {
            console.error("❌ テストユーザー作成失敗:", createError.message);
            set({ error: createError.message, isLoading: false });
            return;
          }
        }
        
        // 再度ログイン試行
        try {
          console.log("🔑 テストユーザー再サインイン試行");
          await signInWithEmailAndPassword(auth, TEST_USER_EMAIL, TEST_USER_PASSWORD);
          console.log("✅ テストユーザー再サインイン成功");
        } catch (signInError: any) {
          console.error("❌ テストユーザー再サインイン失敗:", signInError.message);
          set({ error: signInError.message, isLoading: false });
        }
      }
    },

    signOut: async () => {
      try {
        set({ isLoading: true, error: null });
        console.log("🚪 サインアウト試行");
        await signOut(auth);
        set({ user: null, isLoading: false });
        console.log("✅ サインアウト成功");
        router.replace("/login");
      } catch (error: any) {
        console.error("❌ サインアウト失敗:", error.message);
        set({ error: error.message, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});