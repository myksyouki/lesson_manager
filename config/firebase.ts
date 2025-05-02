// app/config/firebase.ts - エラーに強い遅延初期化バージョン
import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence, initializeAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions, httpsCallable } from 'firebase/functions';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase の設定を直接指定 - 変更なし
export const firebaseConfig = {
  apiKey: "AIzaSyA6GCKN48UZNnWQmU0LDIu7tn0jLRrJ4Ik",
  authDomain: "lesson-manager-99ab9.firebaseapp.com",
  projectId: "lesson-manager-99ab9",
  storageBucket: "lesson-manager-99ab9.firebasestorage.app",
  messagingSenderId: "21424871541",
  appId: "1:21424871541:web:eab99b9421a3d0cfbac03c"
};

// 初期化状態フラグ
let isInitialized = false;

// サービスプロバイダー（遅延ロード用）
let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: any = null;
let _functions: any = null;

// 初期化時のエラーハンドリング
const logError = (component: string, error: any) => {
  console.error(`Firebase ${component} 初期化エラー:`, error);
};

// Firebaseアプリの遅延初期化
const initializeFirebaseApp = (): FirebaseApp => {
  try {
    // 既存のアプリがあれば再利用
    const apps = getApps();
    if (apps.length > 0) {
      return apps[0];
    }
    
    // なければ新規作成
    return initializeApp(firebaseConfig);
  } catch (error) {
    logError('App', error);
    // 最終手段として空のFirebaseAppを返す
    throw new Error('Firebase初期化失敗');
  }
};

// 各サービスの安全な初期化を行う
const initializeServices = () => {
  if (isInitialized) return;
  
  try {
    console.log('Firebaseの初期化を開始します（安全モード）');
    
    // Firebaseアプリの初期化
    _app = initializeFirebaseApp();
    
    // 各サービスの初期化（エラーハンドリング付き）
    try { 
      _auth = getAuth(_app); 
    } catch (e) { 
      logError('Auth', e);
    }
    
    try { 
      _db = getFirestore(_app); 
    } catch (e) { 
      logError('Firestore', e);
    }
    
    try { 
      _storage = getStorage(_app); 
    } catch (e) { 
      logError('Storage', e);
    }
    
    try { 
      const functionsRegion = 'asia-northeast1';
      _functions = getFunctions(_app, functionsRegion); 
    } catch (e) { 
      logError('Functions', e);
    }
    
    // 初期化完了フラグを設定
    isInitialized = true;
    console.log('Firebase初期化完了');
  } catch (error) {
    console.error('Firebase初期化に完全に失敗しました:', error);
  }
};

// 遅延初期化を行う（プラットフォームに合わせて調整）
const initDelay = Platform.OS === 'web' ? 0 : 5000;
setTimeout(() => {
  initializeServices();
}, initDelay);

// 安全なアクセサ関数を提供
export const firebaseApp = (): FirebaseApp => {
  if (!_app) {
    if (!isInitialized) {
      initializeServices();
    }
    if (!_app) {
      throw new Error('Firebaseアプリが初期化されていません');
    }
  }
  return _app;
};

export const auth = (): Auth => {
  if (!_auth) {
    if (!isInitialized) {
      initializeServices();
    }
    if (!_auth) {
      _auth = getAuth();
    }
  }
  return _auth;
};

export const db = (): Firestore => {
  if (!_db) {
    if (!isInitialized) {
      initializeServices();
    }
    if (!_db) {
      _db = getFirestore();
    }
  }
  return _db;
};

export const storage = (): any => {
  if (!_storage) {
    if (!isInitialized) {
      initializeServices();
    }
    if (!_storage) {
      _storage = getStorage();
    }
  }
  return _storage;
};

export const functions = (): any => {
  if (!_functions) {
    if (!isInitialized) {
      initializeServices();
    }
    if (!_functions) {
      _functions = getFunctions();
    }
  }
  return _functions;
};

// Firebase Functions 接続テスト関数
export const testFunctionConnection = async () => {
  try {
    console.log('Firebase Functions接続テスト開始...');
    const testFunc = httpsCallable(functions(), 'helloWorld');
    const result = await testFunc({});
    return { success: true, result: result.data };
  } catch (error) {
    console.error('Firebase Functions接続テストエラー:', error);
    return { success: false, error };
  }
};

export default firebaseApp;