import { Platform } from 'react-native';
import * as RNIap from 'react-native-iap';

// local Subscription型定義 (UIコンポーネントに合わせて必要に応じて拡張可能)
interface Subscription {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  subscriptionPeriodNumberIOS?: number;
  subscriptionPeriodUnitIOS?: string;
}

import { getAuth } from 'firebase/auth';
import { doc, setDoc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../config/firebase';

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
  await RNIap.initConnection();
  if (Platform.OS === 'android') {
    await RNIap.flushFailedPurchasesCachedAsPendingAndroid();
  }
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

  RNIap.endConnection();
};

export const getAvailableSubscriptions = async (): Promise<Subscription[]> => {
  const products = await RNIap.getSubscriptions({ skus: [SubscriptionIds.STANDARD, SubscriptionIds.PREMIUM] });
  return products as Subscription[];
};

export const purchaseSubscription = async (productId: string): Promise<void> => {
  if (Platform.OS === 'ios') {
    await RNIap.requestSubscription({ sku: productId } as any);
  } else {
    await RNIap.requestSubscription({ skus: [productId] } as any);
  }
};

export const restorePurchases = async (): Promise<void> => {
  const purchases = await RNIap.getAvailablePurchases();
  for (const purchase of purchases) {
    await validateAndSavePurchase(purchase as any);
  }
};

/**
 * サブスクリプション購入リスナーを設定
 */
export const setupPurchaseListeners = (
  onPurchaseComplete: (purchase: any) => void,
  onPurchaseError: (error: any) => void
): void => {
  if (purchaseUpdateSubscription) {
    purchaseUpdateSubscription.remove();
  }
  purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase: any) => {
    console.log('購入アップデート:', purchase);
    try {
      await validateAndSavePurchase(purchase);
      await RNIap.finishTransaction({ purchase });
      if (Platform.OS === 'ios' && RNIap.isIosStorekit2(purchase.transactionId)) {
        await RNIap.clearTransactionIOS();
      }
      onPurchaseComplete(purchase);
    } catch (err) {
      console.error('購入処理エラー:', err);
    }
  });
  if (purchaseErrorSubscription) {
    purchaseErrorSubscription.remove();
  }
  purchaseErrorSubscription = RNIap.purchaseErrorListener((error: any) => {
    console.error('購入エラー:', error);
    onPurchaseError(error);
  });
};

/**
 * 購入を検証してFirestoreに保存
 */
const validateAndSavePurchase = async (purchase: any): Promise<void> => {
  const auth = getAuth();
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('ユーザーが認証されていません');
  }

  try {
    // サーバーサイドで検証を行うCloud Function呼び出し
    const verifySubscriptionReceipt = httpsCallable<
      { receipt: string; platform: string; productId: string },
      { success: boolean; isValid: boolean; expiryDateMs: number }
    >(functions, 'verifySubscriptionReceipt');

    const verificationResult = await verifySubscriptionReceipt({
      receipt: purchase.transactionReceipt,
      platform: Platform.OS,
      productId: purchase.productId
    });

    console.log('レシート検証結果:', verificationResult.data);

    // 検証が成功した場合、ローカルのユーザープロファイルも更新
    if (verificationResult.data.success) {
      // 購入完了の処理 (ユーザーの閲覧権限を更新)
      // 注意: 主な保存はCloud Functionで行われていますが、
      // アプリ側でもSubscription状態を更新して表示を即座に反映
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'subscription.active': true,
        'subscription.plan': purchase.productId.includes('premium') ? 'premium' : 'standard',
        'subscription.updatedAt': serverTimestamp()
      });
    } else {
      throw new Error('サーバーでのレシート検証に失敗しました');
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
    const purchases = await RNIap.getAvailablePurchases();
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