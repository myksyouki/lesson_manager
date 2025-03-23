// app/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import Constants from 'expo-constants';

// 環境変数を取得する関数
const getEnvVariable = (key: string) => {
  return Constants.expoConfig?.extra?.[key] || 
         process.env[key] || 
         Constants.manifest?.extra?.[key] || 
         '';
};

const firebaseConfig = {
  apiKey: getEnvVariable('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVariable('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVariable('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVariable('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVariable('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVariable('EXPO_PUBLIC_FIREBASE_APP_ID')
};


// Firebase アプリの初期化
const firebaseApp = initializeApp(firebaseConfig);

// Auth の初期化
const auth = getAuth(firebaseApp);

// Firebase の各サービスをエクスポート
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
// Firebase Functionsの設定を更新：明示的にリージョンを指定
export const functions = getFunctions(firebaseApp, 'asia-northeast1');
// 新しいインスタンスを再作成して完全にリセット
export { auth };

// 初期化完了のログ
console.log('Firebase初期化完了', {
  projectId: firebaseApp.options.projectId,
  region: 'default'
});

export default firebaseApp;