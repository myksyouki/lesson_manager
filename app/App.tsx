import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { LogBox } from 'react-native';
import { initializeApp } from 'firebase/app';
import Constants from 'expo-constants';
import { auth, db } from './config/firebase';

// Firebaseの設定情報をconfig/firebase.tsから再利用
import firebaseApp from './config/firebase';

// Firebase Functionsを初期化
const functions = getFunctions(firebaseApp, 'asia-northeast1');

// デバッグログ
console.log('[FIREBASE] Firebase initialized:', firebaseApp.name);
console.log('[FIREBASE] Firebase Functions region:', functions.region);
console.log('[FIREBASE] Auth service:', auth ? 'initialized' : 'failed');
console.log('[FIREBASE] Firestore service:', db ? 'initialized' : 'failed');
console.log('[FIREBASE] Functions service:', functions ? 'initialized' : 'failed');

// エミュレーターモードの場合は、Functionsエミュレーターに接続
if (__DEV__ && Constants.expoConfig?.extra?.useEmulator) {
  console.log('[FIREBASE] Running in development mode with emulator');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
} 