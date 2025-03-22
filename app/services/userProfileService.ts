import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { User } from 'firebase/auth';

// ユーザープロファイル用の型定義
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  selectedInstrument: string;
  isPremium: boolean;
  isOnboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 楽器情報の型定義
export interface Instrument {
  id: string;
  name: string;
  difyAppId?: string;
  difyApiKey?: string;
}

// データベース構造フラグ
let useNewStructure = true;

/**
 * データベース構造フラグを設定
 * @param value 新しい構造を使用する場合はtrue
 */
export const setUseNewStructure = (value: boolean): void => {
  useNewStructure = value;
  console.log(`userProfileService: データベース構造フラグを${value ? '新' : '旧'}に設定しました`);
};

// 楽器カテゴリと楽器のマッピング
export const instrumentCategories: Instrument[] = [
  {
    id: 'piano',
    name: 'ピアノ',
    difyAppId: process.env.EXPO_PUBLIC_DIFY_PIANO_APP_ID || '',
    difyApiKey: process.env.EXPO_PUBLIC_DIFY_PIANO_API_KEY || '',
  },
  {
    id: 'saxophone',
    name: 'サックス',
    difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_APP_ID || '',
    difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_API_KEY || '',
  },
  {
    id: 'violin',
    name: 'バイオリン',
    difyAppId: process.env.EXPO_PUBLIC_DIFY_VIOLIN_APP_ID || '',
    difyApiKey: process.env.EXPO_PUBLIC_DIFY_VIOLIN_API_KEY || '',
  }
];

// デフォルト値
const DEFAULT_INSTRUMENT = 'piano';

// ユーザープロファイルの作成
export const createUserProfile = async (user: User) => {
  // プロファイルデータを作成
  const defaultProfile: UserProfile = {
    id: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    selectedInstrument: DEFAULT_INSTRUMENT,
    isPremium: false,
    isOnboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
  await setDoc(userProfileRef, defaultProfile);
  
  return defaultProfile;
};

/**
 * 現在のユーザーのプロファイルを取得
 */
export const getCurrentUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーがログインしていません');
      return null;
    }

    // ユーザープロファイルを取得
    const profileDoc = await getDoc(doc(db, `users/${user.uid}/profile`, 'main'));
    
    if (!profileDoc.exists()) {
      // プロファイルが存在しない場合は作成
      return await createUserProfile(user);
    }
    
    const data = profileDoc.data();
    return {
      id: user.uid,
      name: data.name || user.displayName || '',
      email: data.email || user.email || '',
      selectedInstrument: data.selectedInstrument || DEFAULT_INSTRUMENT,
      isPremium: !!data.isPremium,
      isOnboardingCompleted: !!data.isOnboardingCompleted,
      createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt.seconds * 1000) : new Date(),
    };
  } catch (error) {
    console.error('プロファイル取得エラー:', error);
    return null;
  }
};

/**
 * getUserProfileのエイリアス - 互換性のために維持
 * _layout.tsxで使用されている関数
 */
export const getUserProfile = getCurrentUserProfile;

/**
 * 選択した楽器を保存
 */
export const saveSelectedInstrument = async (instrumentId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーがログインしていません');
      return false;
    }

    // プロファイルを更新
    await updateDoc(doc(db, `users/${user.uid}/profile`, 'main'), {
      selectedInstrument: instrumentId,
      updatedAt: new Date()
    });
    
    return true;
  } catch (error) {
    console.error('楽器選択の保存エラー:', error);
    return false;
  }
};

// オンボーディング完了の保存
export const saveOnboardingCompletion = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }

    const userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    await updateDoc(userProfileRef, {
      isOnboardingCompleted: true,
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('オンボーディング完了の保存エラー:', error);
    return false;
  }
};

// オンボーディング状態のチェック
export const checkOnboardingStatus = async (): Promise<boolean> => {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return false;
    }
    return profile.isOnboardingCompleted;
  } catch (error) {
    console.error('オンボーディング状態チェックエラー:', error);
    return false;
  }
};

// Dify APIの情報取得
export const getDifyApiInfo = async (): Promise<{appId: string; apiKey: string}> => {
  try {
    const profile = await getCurrentUserProfile();
    
    if (!profile) {
      return { appId: '', apiKey: '' };
    }
    
    // 楽器の検索
    const instrument = instrumentCategories.find(i => i.id === profile.selectedInstrument);
    if (!instrument) {
      return { appId: '', apiKey: '' };
    }
    
    // Dify APIの情報を返す
    return {
      appId: instrument.difyAppId || '',
      apiKey: instrument.difyApiKey || ''
    };
  } catch (error) {
    console.error('Dify API情報取得エラー:', error);
    return { appId: '', apiKey: '' };
  }
}; 