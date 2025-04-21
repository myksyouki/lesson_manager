import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeApp, getApps, getApp } from 'firebase/app';
import Constants from 'expo-constants';

// 環境変数 (extra) を取得 (Constants.manifestがnullの場合はexpoConfigを使用)
const config = (Constants.manifest ? Constants.manifest : Constants.expoConfig) as any;
const extra = config.extra || {};
const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN,
  projectId: extra.FIREBASE_PROJECT_ID,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.FIREBASE_APP_ID,
};
// 既存の Firebase アプリがなければ初期化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Asia-northeast1 リージョンに設定
const functions = getFunctions(app, 'asia-northeast1');

// Callable Function の取得
const verifySubscriptionReceiptCallable = httpsCallable(
  functions,
  'verifySubscriptionReceipt'
);

/**
 * サーバにレシート検証リクエスト
 * @param receipt - レシート文字列
 * @param platform - 'ios' | 'android'
 * @param productId - 購入した製品ID
 */
export async function verifySubscriptionReceipt(
  receipt: string,
  platform: 'ios' | 'android',
  productId: string
) {
  const result = await verifySubscriptionReceiptCallable({ receipt, platform, productId });
  return result.data;
} 