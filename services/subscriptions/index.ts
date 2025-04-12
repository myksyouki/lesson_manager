import { Platform } from 'react-native';
// react-native-iapのインポートをモックに置き換え
// import {
//   initConnection,
//   endConnection,
//   getProducts,
//   getSubscriptions,
//   finishTransaction,
//   purchaseErrorListener,
//   purchaseUpdatedListener,
//   requestSubscription,
//   ProductPurchase,
//   PurchaseError,
//   Purchase,
//   SubscriptionPurchase,
//   Subscription,
//   validateReceiptIos,
//   validateReceiptAndroid,
//   flushFailedPurchasesCachedAsPendingAndroid,
//   isIosStorekit2,
//   clearTransactionIOS,
//   getAvailablePurchases
// } from 'react-native-iap';

// モック型定義
interface Purchase {
  productId: string;
  transactionId: string;
  transactionReceipt: string;
}

interface PurchaseError {
  code: string;
  message: string;
}

interface Subscription {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  subscriptionPeriodNumberIOS?: number;
  subscriptionPeriodUnitIOS?: string;
}

// react-native-iapのモック関数
const endConnection = () => {};
const purchaseUpdatedListener = (callback: (purchase: Purchase) => void) => ({ remove: () => {} });
const purchaseErrorListener = (callback: (error: PurchaseError) => void) => ({ remove: () => {} });
const finishTransaction = async (params: any) => {};
const isIosStorekit2 = (transactionId: string) => false;
const clearTransactionIOS = async (transactionId: string) => {};
const getAvailablePurchases = async () => [] as Purchase[];

import { getAuth } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

// サブスクリプション製品ID
export const SubscriptionIds = {
  STANDARD: Platform.select({
    ios: 'com.lessonmanager.standard',
    android: 'com.lessonmanager.standard'
  }) as string,
  PREMIUM: Platform.select({
    ios: 'com.lessonmanager.premium', 
    android: 'com.lessonmanager.premium'
  }) as string
};

// サブスクリプションプラン情報
export interface SubscriptionPlan {
  id: string;
  title: string;
  description: string;
  price: string;
  priceValue: number;
  currency: string;
  period: string;
  features: string[];
}

// サブスクリプション状態
export interface SubscriptionStatus {
  active: boolean;
  plan: string | null;
  expiryDate: Date | null;
  purchaseDate: Date | null;
  platform: 'ios' | 'android' | null;
  receipt: string | null;
  productId: string | null;
  autoRenewing: boolean;
  trialPeriod: boolean;
}

// リスナーのコールバック
let purchaseUpdateSubscription: { remove: () => void } | null = null;
let purchaseErrorSubscription: { remove: () => void } | null = null;

// 一時的にサブスクリプション機能を無効化（ビルド用）
export const initializeIAP = async (): Promise<void> => {
  console.log('IAP initialization skipped');
  return Promise.resolve();
};

/**
 * IAP接続を終了
 */
export const endIAPConnection = (): void => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
    purchaseUpdateSubscription = null;
  }

  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
    purchaseErrorSubscription = null;
  }

  endConnection();
};

export const getAvailableSubscriptions = async (): Promise<Subscription[]> => {
  console.log('getAvailableSubscriptions skipped');
  return Promise.resolve([]);
};

export const purchaseSubscription = async (
  productId: string
): Promise<void> => {
  console.log('purchaseSubscription skipped', productId);
  return Promise.resolve();
};

export const restorePurchases = async (): Promise<void> => {
  console.log('restorePurchases skipped');
  return Promise.resolve();
};

/**
 * サブスクリプション購入リスナーを設定
 */
export const setupPurchaseListeners = (
  onPurchaseComplete: (purchase: Purchase) => void,
  onPurchaseError: (error: PurchaseError) => void
): void => {
  // 購入完了リスナー
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  
  purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: Purchase) => {
    console.log('購入アップデート:', purchase);
    
    try {
      // 購入レシートをサーバーで検証（実際の実装では）
      await validateAndSavePurchase(purchase);
      
      // トランザクションを完了
      if (Platform.OS === 'ios') {
        await finishTransaction({ purchase, isConsumable: false });
        if (isIosStorekit2(purchase.transactionId)) {
          await clearTransactionIOS(purchase.transactionId);
        }
      } else {
        await finishTransaction({ purchase });
      }
      
      onPurchaseComplete(purchase);
    } catch (error) {
      console.error('購入処理エラー:', error);
    }
  });

  // 購入エラーリスナー
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }
  
  purchaseErrorSubscription = purchaseErrorListener((error: PurchaseError) => {
    console.error('購入エラー:', error);
    onPurchaseError(error);
  });
};

/**
 * 購入を検証してFirestoreに保存
 */
const validateAndSavePurchase = async (purchase: Purchase): Promise<void> => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('ユーザーが認証されていません');
  }

  try {
    let validationResult;
    
    // プラットフォームに応じたレシート検証
    if (Platform.OS === 'ios') {
      // iOSのレシート検証（実際には自社サーバーを経由して検証する必要あり）
      validationResult = {
        isValid: true, // 実際の実装では本当に検証する
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 仮の日付
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt
      };
    } else {
      // Androidのレシート検証（実際には自社サーバーを経由して検証する必要あり）
      validationResult = {
        isValid: true, // 実際の実装では本当に検証する
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 仮の日付
        productId: purchase.productId,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt
      };
    }

    if (validationResult.isValid) {
      // Firestoreに購入情報を保存
      const subscriptionRef = doc(db, 'users', userId, 'subscriptions', purchase.productId);
      
      await setDoc(subscriptionRef, {
        productId: purchase.productId,
        platform: Platform.OS,
        purchaseDate: serverTimestamp(),
        expiryDate: validationResult.expiryDate,
        transactionId: purchase.transactionId,
        receipt: purchase.transactionReceipt,
        autoRenewing: purchase.productId.includes('premium'),
        status: 'active',
        updatedAt: serverTimestamp()
      });

      // ユーザープロファイルも更新
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.active': true,
        'subscription.plan': purchase.productId.includes('premium') ? 'premium' : 'standard',
        'subscription.updatedAt': serverTimestamp()
      });
    } else {
      throw new Error('購入の検証に失敗しました');
    }
  } catch (error) {
    console.error('購入検証・保存エラー:', error);
    throw error;
  }
};

/**
 * 現在のサブスクリプション状態を取得
 */
export const getCurrentSubscription = async (): Promise<SubscriptionStatus> => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    return {
      active: false,
      plan: null,
      expiryDate: null,
      purchaseDate: null,
      platform: null,
      receipt: null,
      productId: null,
      autoRenewing: false,
      trialPeriod: false
    };
  }

  try {
    // 最新の購入履歴を取得（アプリ内）
    const purchases = await getAvailablePurchases();
    console.log('利用可能な購入:', purchases);
    
    // Firestoreからサブスクリプション情報を取得
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();
    
    if (userData?.subscription?.active) {
      // プランを判断
      const plan = userData.subscription.plan || null;
      
      // サブスクリプションの詳細を取得
      const subProductId = plan === 'premium' 
        ? SubscriptionIds.PREMIUM 
        : SubscriptionIds.STANDARD;
      
      const subQuery = doc(db, 'users', userId, 'subscriptions', subProductId);
      const subDoc = await getDoc(subQuery);
      const subData = subDoc.data();
      
      if (subData) {
        return {
          active: true,
          plan: plan,
          expiryDate: subData.expiryDate?.toDate() || null,
          purchaseDate: subData.purchaseDate?.toDate() || null,
          platform: subData.platform || null,
          receipt: subData.receipt || null,
          productId: subData.productId || null,
          autoRenewing: subData.autoRenewing || false,
          trialPeriod: subData.trialPeriod || false
        };
      }
    }
    
    // サブスクリプションなし
    return {
      active: false,
      plan: null,
      expiryDate: null,
      purchaseDate: null,
      platform: null,
      receipt: null,
      productId: null,
      autoRenewing: false,
      trialPeriod: false
    };
  } catch (error) {
    console.error('サブスクリプション状態取得エラー:', error);
    
    // エラー時はデフォルトの非アクティブ状態を返す
    return {
      active: false,
      plan: null,
      expiryDate: null,
      purchaseDate: null,
      platform: null,
      receipt: null,
      productId: null,
      autoRenewing: false,
      trialPeriod: false
    };
  }
}; 