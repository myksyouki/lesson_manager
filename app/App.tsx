import { LogBox } from 'react-native';
import Constants from 'expo-constants';

// Firebaseの設定情報とサービスをconfig/firebase.tsから再利用
import firebaseApp, { auth, db, functions } from '../config/firebase';

// デバッグログ
console.log('[FIREBASE] Firebase initialized:', firebaseApp.name);
console.log('[FIREBASE] Firebase Functions region:', functions?.region || 'not initialized');
console.log('[FIREBASE] Auth service:', auth ? 'initialized' : 'failed');
console.log('[FIREBASE] Firestore service:', db ? 'initialized' : 'failed');
console.log('[FIREBASE] Functions service:', functions ? 'initialized' : 'failed');

// エミュレーターモードの場合は、Functionsエミュレーターに接続
if (__DEV__ && Constants.expoConfig?.extra?.useEmulator) {
  console.log('[FIREBASE] Running in development mode with emulator');
  // エミュレーター接続はサーバーサイドでのみ利用可能
  try {
    const { connectFunctionsEmulator } = require('firebase/functions');
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } catch (error) {
    console.log('[FIREBASE] Failed to connect to emulator:', error);
  }
} 