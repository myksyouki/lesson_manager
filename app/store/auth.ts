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
  isSilent: false,
});
console.log("🔍 実際に使われるURI:", redirectUri);

console.log("🔍 使用するリダイレクトURI:", redirectUri);

// ✅ Googleログイン用のフック
export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: Constants.expoConfig?.extra?.expoPublicGoogleIosClientId,
    androidClientId: Constants.expoConfig?.extra?.expoPublicGoogleAndroidClientId,
    webClientId: Constants.expoConfig?.extra?.expoPublicGoogleWebClientId,
    redirectUri,         // 上記で生成したURI
    useProxy: true,
    scopes: ["profile", "email"],
  });

  console.log("🌍 Google リクエスト URL:", request?.url); // デバッグ用

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
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // 認証状態を監視
  onAuthStateChanged(auth, (user) => {
    set({ user: user || null, isLoading: false });

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
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    signIn: async (email, password) => {
      try {
        set({ isLoading: true, error: null });
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    signInWithGoogle: async (promptAsync) => {
      try {
        set({ isLoading: true, error: null });

        const result = await promptAsync();
        if (result?.type === "success") {
          const { id_token } = result.params;
          const credential = GoogleAuthProvider.credential(id_token);
          await signInWithCredential(auth, credential);
        } else {
          set({ error: "Googleログインがキャンセルされました", isLoading: false });
        }
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    signOut: async () => {
      try {
        set({ isLoading: true, error: null });
        await signOut(auth);
        set({ user: null, isLoading: false });
        router.replace("/login");
      } catch (error: any) {
        set({ error: error.message, isLoading: false });
      }
    },

    clearError: () => set({ error: null }),
  };
});