// app/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import Constants from 'expo-constants';

// 環境変数を取得する関数
const getEnvVariable = (key: string) => {
  return Constants.expoConfig?.extra?.[key] || 
         process.env[key] || 
         Constants.manifest?.extra?.[key] || 
         '';
};

// Firebase の設定を公開
export const firebaseConfig = {
  apiKey: getEnvVariable('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnvVariable('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVariable('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVariable('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVariable('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVariable('EXPO_PUBLIC_FIREBASE_APP_ID')
};

// Firebase アプリの初期化
export const firebaseApp = initializeApp(firebaseConfig);

// Auth の初期化
export const auth = getAuth(firebaseApp);

// Firebase の各サービスをエクスポート
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);

// Firebase Functions の初期化 (リージョンを明示的に指定)
const functionsRegion = 'asia-northeast1';
console.log(`Firebase Functions初期化開始 (リージョン: ${functionsRegion})`);

// 明示的にプロジェクトIDを確認
const projectId = firebaseApp.options.projectId || 'lesson-manager-99ab9';
console.log(`Firebase プロジェクトID: ${projectId}`);

// Functionsインスタンスを定義
let functions: any;

// 簡易的な疎通テスト関数
export const testFunctionConnection = async () => {
  try {
    const testURL = `https://${functionsRegion}-${projectId}.cloudfunctions.net/testDifyConnection`;
    console.log(`疎通テスト URL: ${testURL}`);
    
    // 直接HTTPでテスト
    const response = await fetch(testURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { timestamp: new Date().toISOString() } })
    });
    
    if (response.ok) {
      console.log('Firebase Functions HTTP疎通テスト成功');
      return true;
    } else {
      console.error('Firebase Functions HTTP疎通テスト失敗:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Firebase Functions疎通テストエラー:', error);
    return false;
  }
};

// Functionsの初期化を強化
try {
  // 明示的にリージョンを指定して初期化
  functions = getFunctions(firebaseApp, functionsRegion);
  
  // 確実に初期化が完了していることを確認
  if (!functions) {
    console.error('Firebase Functions初期化失敗: functions オブジェクトが null または undefined です');
  }
  
  // __DEV__モードでエミュレーターに接続するオプション
  // if (__DEV__) {
  //   connectFunctionsEmulator(functions, 'localhost', 5001);
  //   console.log('Firebase Functions エミュレーターに接続しました (localhost:5001)');
  // }
  
  // デバッグ用に詳細情報をログ出力
  console.log('Firebase Functions初期化診断:', {
    projectId: firebaseApp.options.projectId,
    region: functionsRegion,
    appName: firebaseApp.name,
    functionsInstance: !!functions,
    functionsUrl: `https://${functionsRegion}-${projectId}.cloudfunctions.net`,
    mode: __DEV__ ? 'development' : 'production'
  });
  
  // 初期化の内部状態を検証
  const functionsType = typeof functions;
  const functionsKeys = Object.keys(functions);
  const hasCustomDomain = 'customDomain' in functions;
  
  console.log('Functions検証結果:', {
    functionsType,
    functionsKeys,
    hasCustomDomain,
    hasApp: 'app' in functions
  });
  
  // 初期化が成功したことを確認
  console.log('Firebase Functions初期化成功');
} catch (error) {
  console.error('Firebase Functions初期化エラー:', error);
}

// 初期化したfunctionsをエクスポート
export { functions };

export default firebaseApp;