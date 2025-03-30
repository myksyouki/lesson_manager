// app/config/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import Constants from 'expo-constants';

// Firebase の設定を直接指定
export const firebaseConfig = {
  apiKey: "AIzaSyA6GCKN48UZNnWQmU0LDIu7tn0jLRrJ4Ik",
  authDomain: "lesson-manager-99ab9.firebaseapp.com",
  projectId: "lesson-manager-99ab9",
  storageBucket: "lesson-manager-99ab9.firebasestorage.app",
  messagingSenderId: "21424871541",
  appId: "1:21424871541:web:eab99b9421a3d0cfbac03c"
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
let functions: any = null;

// Functionsの初期化を強化
try {
  // 明示的にリージョンを指定して初期化
  functions = getFunctions(firebaseApp, functionsRegion);
  
  // 確実に初期化が完了していることを確認
  if (!functions) {
    console.error('Firebase Functions初期化失敗: functions オブジェクトが null または undefined です');
    // 再度初期化を試みる
    functions = getFunctions(firebaseApp);
    console.log('リージョン指定なしで再初期化を試みました:', !!functions);
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
  if (functions) {
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
  } else {
    console.error('Firebase Functions初期化失敗: 再初期化してもnullです');
    // 最後の手段としてデフォルト設定で初期化
    functions = getFunctions();
    console.log('デフォルト設定で再初期化:', !!functions);
  }
} catch (error) {
  console.error('Firebase Functions初期化エラー:', error);
  // エラー発生時も最後の手段として初期化を試みる
  try {
    functions = getFunctions();
    console.log('エラー発生後のデフォルト設定で再初期化:', !!functions);
  } catch (e) {
    console.error('再初期化も失敗:', e);
  }
}

// 初期化したfunctionsをエクスポート
export { functions };

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

export default firebaseApp;