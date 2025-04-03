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

// 重要: functions変数をletからconstに変更し、より確実な初期化を行う
const functions = getFunctions(firebaseApp, functionsRegion);

// 明示的にリージョンを設定（バージョン互換性のため冗長に設定）
try {
  console.log('🔧 Firebase Functions初期化およびリージョン設定...');
  
  // _delegateプロパティは最新のFirebase SDKでは異なる構造になっているため
  // カスタムドメイン設定は行わず、リージョン指定のみに依存する
  
  console.log('📊 Firebase Functions診断:', {
    functionsExists: !!functions,
    projectId: firebaseApp.options.projectId,
    appName: firebaseApp.name,
    functionsRegion: functionsRegion,
    mode: __DEV__ ? 'development' : 'production'
  });
  
  // 初期化テスト - 関数参照の取得を試す
  try {
    const testFunc = httpsCallable(functions, 'sendMessage');
    console.log('✅ sendMessage関数参照テスト:', {
      functionExists: !!testFunc,
      functionType: typeof testFunc
    });
  } catch (refError) {
    console.error('❌ 関数参照テストエラー:', refError);
  }
} catch (error) {
  console.error('Firebase Functions設定エラー:', error);
}

// 初期化したfunctionsをエクスポート
export { functions };

// Firebase Functions 接続テスト関数
export const testFunctionConnection = async () => {
  try {
    console.log('Firebase Functions接続テスト開始...');
    const functions = getFunctions(firebaseApp, 'asia-northeast1');
    
    // 簡単なhelloWorld関数を呼び出す（存在する場合）
    try {
      const helloWorld = httpsCallable(functions, 'helloWorld');
      const result = await helloWorld({});
      return { success: true, result: result.data };
    } catch (innerError) {
      // helloWorldが存在しない場合、sendMessageを試す
      try {
        const sendMessage = httpsCallable(functions, 'sendMessage');
        const testResult = await sendMessage({ test: true });
        return { success: true, result: testResult.data };
      } catch (sendMessageError) {
        console.error('Functions呼び出しエラー:', sendMessageError);
        return { success: false, error: sendMessageError };
      }
    }
  } catch (error) {
    console.error('Firebase Functions接続テストエラー:', error);
    return { success: false, error };
  }
};

export default firebaseApp;