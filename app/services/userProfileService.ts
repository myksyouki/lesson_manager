import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from 'firebase/auth';
import { auth } from '../config/firebase';

// ユーザープロファイル用の型定義
export interface UserProfile {
  userId: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  selectedCategory: string;
  selectedInstrument: string;
  selectedModel: string;
  isPremium: boolean;
  isOnboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// モデル型
export interface InstrumentModel {
  id: string;
  name: string;
  isArtist: boolean;
  difyAppId: string;
  difyApiKey: string;
}

// 楽器型
export interface Instrument {
  id: string;
  name: string;
  models: InstrumentModel[];
}

// カテゴリ型
export interface InstrumentCategory {
  id: string;
  name: string;
  instruments: Instrument[];
}

// 楽器カテゴリと楽器およびモデルのマッピング
export const instrumentCategories: InstrumentCategory[] = [
  {
    id: 'vocal',
    name: '声楽',
    instruments: [
      {
        id: 'vocal',
        name: '声楽',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_VOCAL_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_VOCAL_STANDARD_API_KEY || '',
          }
        ]
      }
    ]
  },
  {
    id: 'piano',
    name: 'ピアノ',
    instruments: [
      {
        id: 'piano',
        name: 'ピアノ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_PIANO_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_PIANO_STANDARD_API_KEY || '',
          }
        ]
      }
    ]
  },
  {
    id: 'woodwind',
    name: '木管楽器',
    instruments: [
      {
        id: 'flute',
        name: 'フルート',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_FLUTE_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_FLUTE_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'clarinet',
        name: 'クラリネット',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_CLARINET_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_CLARINET_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'oboe',
        name: 'オーボエ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_OBOE_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_OBOE_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'fagott',
        name: 'ファゴット',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_FAGOTT_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_FAGOTT_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'saxophone',
        name: 'サックス',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_STANDARD_API_KEY || '',
          },
          {
            id: 'ueno',
            name: '上野耕平 (BETA)',
            isArtist: true,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_UENO_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_UENO_API_KEY || '',
          },
          {
            id: 'saito',
            name: '齊藤健太 (BETA)',
            isArtist: true,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_SAITO_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_SAITO_API_KEY || '',
          },
          {
            id: 'sumiya',
            name: '住谷美帆 (BETA)',
            isArtist: true,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_SUMIYA_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_SUMIYA_API_KEY || '',
          },
          {
            id: 'tanaka',
            name: '田中奏一朗 (BETA)',
            isArtist: true,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_TANAKA_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_TANAKA_API_KEY || '',
          },
          {
            id: 'tsuzuki',
            name: '都築惇 (BETA)',
            isArtist: true,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_TSUZUKI_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_TSUZUKI_API_KEY || '',
          }
        ]
      }
    ]
  },
  {
    id: 'brass',
    name: '金管楽器',
    instruments: [
      {
        id: 'trumpet',
        name: 'トランペット',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_TRUMPET_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_TRUMPET_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'trombone',
        name: 'トロンボーン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_TROMBONE_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_TROMBONE_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'horn',
        name: 'ホルン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_HORN_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_HORN_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'euphonium',
        name: 'ユーフォニアム',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_EUPHONIUM_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_EUPHONIUM_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'tuba',
        name: 'チューバ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_TUBA_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_TUBA_STANDARD_API_KEY || '',
          }
        ]
      }
    ]
  },
  {
    id: 'strings',
    name: '弦楽器',
    instruments: [
      {
        id: 'violin',
        name: 'バイオリン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_VIOLIN_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_VIOLIN_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'viola',
        name: 'ビオラ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_VIOLA_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_VIOLA_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'cello',
        name: 'チェロ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_CELLO_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_CELLO_STANDARD_API_KEY || '',
          }
        ]
      },
      {
        id: 'contrabass',
        name: 'コントラバス',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false,
            difyAppId: process.env.EXPO_PUBLIC_DIFY_CONTRABASS_STANDARD_APP_ID || '',
            difyApiKey: process.env.EXPO_PUBLIC_DIFY_CONTRABASS_STANDARD_API_KEY || '',
          }
        ]
      }
    ]
  }
];

// デフォルト値
const DEFAULT_CATEGORY = 'woodwind';
const DEFAULT_INSTRUMENT = 'clarinet';
const DEFAULT_MODEL = 'standard';

// 新しいデータ構造を使用するかどうかのフラグ
let useNewStructure = false;

// 新しいデータ構造の使用を設定する関数
export const setUseNewStructure = (useNew: boolean): void => {
  useNewStructure = useNew;
};

// ユーザープロファイルの作成
export const createUserProfile = async (user: User) => {
  // プロファイルデータを作成
  const defaultProfile: UserProfile = {
    userId: user.uid,
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    email: user.email || '',
    selectedCategory: DEFAULT_CATEGORY,
    selectedInstrument: DEFAULT_INSTRUMENT,
    selectedModel: DEFAULT_MODEL,
    isPremium: false,
    isOnboardingCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // 新しい構造を使用する場合
  if (useNewStructure) {
    const userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    await setDoc(userProfileRef, defaultProfile);
  } else {
    // 従来の構造を使用する場合
    const userProfileRef = doc(db, 'userProfiles', user.uid);
    await setDoc(userProfileRef, defaultProfile);
  }
  
  return defaultProfile;
};

// ユーザープロファイルの取得
export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('ユーザーがログインしていません');
      return null;
    }
    
    let docSnap;
    
    if (useNewStructure) {
      // 新構造を使用する場合
      const userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
      docSnap = await getDoc(userProfileRef);
    } else {
      // 従来の構造を使用する場合
      const userProfileRef = doc(db, 'userProfiles', user.uid);
      docSnap = await getDoc(userProfileRef);
    }
    
    if (docSnap.exists()) {
      return docSnap.data() as UserProfile;
    } else {
      return await createUserProfile(user);
    }
  } catch (error) {
    console.error('プロファイル取得エラー:', error);
    return null;
  }
};

// 選択したカテゴリの保存
export const saveSelectedCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }
    
    let userProfileRef;
    
    if (useNewStructure) {
      // 新構造を使用する場合
      userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    } else {
      // 従来の構造を使用する場合
      userProfileRef = doc(db, 'userProfiles', user.uid);
    }
    
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      await setDoc(userProfileRef, {
        ...docSnap.data(),
        selectedCategory: categoryId,
        updatedAt: new Date()
      });
    } else {
      const newProfile = await createUserProfile(user);
      await setDoc(userProfileRef, {
        ...newProfile,
        selectedCategory: categoryId,
        updatedAt: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('カテゴリ保存エラー:', error);
    return false;
  }
};

// 選択した楽器の保存
export const saveSelectedInstrument = async (categoryId: string, instrumentId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // カテゴリが有効か確認
    const category = instrumentCategories.find(c => c.id === categoryId);
    if (!category) {
      throw new Error('無効なカテゴリです');
    }
    
    // 楽器が有効か確認
    const instrument = category.instruments.find(i => i.id === instrumentId);
    if (!instrument) {
      throw new Error('無効な楽器です');
    }
    
    let userProfileRef;
    
    if (useNewStructure) {
      // 新構造を使用する場合
      userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    } else {
      // 従来の構造を使用する場合
      userProfileRef = doc(db, 'userProfiles', user.uid);
    }
    
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      await setDoc(userProfileRef, {
        ...docSnap.data(),
        selectedCategory: categoryId,
        selectedInstrument: instrumentId,
        updatedAt: new Date()
      });
    } else {
      const newProfile = await createUserProfile(user);
      await setDoc(userProfileRef, {
        ...newProfile,
        selectedCategory: categoryId,
        selectedInstrument: instrumentId,
        updatedAt: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('楽器保存エラー:', error);
    return false;
  }
};

// 選択したモデルの保存
export const saveSelectedModel = async (categoryId: string, instrumentId: string, modelId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // カテゴリが有効か確認
    const category = instrumentCategories.find(c => c.id === categoryId);
    if (!category) {
      throw new Error('無効なカテゴリです');
    }
    
    // 楽器が有効か確認
    const instrument = category.instruments.find(i => i.id === instrumentId);
    if (!instrument) {
      throw new Error('無効な楽器です');
    }
    
    // モデルが有効か確認
    const model = instrument.models.find(m => m.id === modelId);
    if (!model) {
      throw new Error('無効なモデルです');
    }
    
    let userProfileRef;
    
    if (useNewStructure) {
      // 新構造を使用する場合
      userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    } else {
      // 従来の構造を使用する場合
      userProfileRef = doc(db, 'userProfiles', user.uid);
    }
    
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      await setDoc(userProfileRef, {
        ...docSnap.data(),
        selectedCategory: categoryId,
        selectedInstrument: instrumentId,
        selectedModel: modelId,
        updatedAt: new Date()
      });
    } else {
      const newProfile = await createUserProfile(user);
      await setDoc(userProfileRef, {
        ...newProfile,
        selectedCategory: categoryId,
        selectedInstrument: instrumentId,
        selectedModel: modelId,
        updatedAt: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('モデル保存エラー:', error);
    return false;
  }
};

// オンボーディング完了フラグの設定
export const completeOnboarding = async (): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('ユーザーがログインしていません');
    }
    
    let userProfileRef;
    
    if (useNewStructure) {
      // 新構造を使用する場合
      userProfileRef = doc(db, `users/${user.uid}/profile`, 'main');
    } else {
      // 従来の構造を使用する場合
      userProfileRef = doc(db, 'userProfiles', user.uid);
    }
    
    const docSnap = await getDoc(userProfileRef);
    
    if (docSnap.exists()) {
      await setDoc(userProfileRef, {
        ...docSnap.data(),
        isOnboardingCompleted: true,
        updatedAt: new Date()
      });
    } else {
      const newProfile = await createUserProfile(user);
      await setDoc(userProfileRef, {
        ...newProfile,
        isOnboardingCompleted: true,
        updatedAt: new Date()
      });
    }

    return true;
  } catch (error) {
    console.error('オンボーディング完了エラー:', error);
    return false;
  }
};

// オンボーディングの完了状態を確認
export const checkOnboardingStatus = async (): Promise<boolean> => {
  try {
    const profile = await getUserProfile();
    if (!profile) {
      return false;
    }
    
    return profile.isOnboardingCompleted;
  } catch (error) {
    console.error('オンボーディング状態確認エラー:', error);
    return false;
  }
};

// 選択された楽器とモデルに対応するDify設定を取得
export const getDifyConfig = async (): Promise<{ appId: string; apiKey: string } | null> => {
  try {
    // ユーザープロファイルの取得
    const profile = await getUserProfile();
    if (!profile) {
      throw new Error('ユーザープロファイルが取得できません');
    }

    // 対応するDify設定の取得
    const category = instrumentCategories.find(c => c.id === profile.selectedCategory);
    if (!category) {
      throw new Error('選択されたカテゴリの設定が見つかりません');
    }
    
    const instrument = category.instruments.find(i => i.id === profile.selectedInstrument);
    if (!instrument) {
      throw new Error('選択された楽器の設定が見つかりません');
    }

    const model = instrument.models.find(m => m.id === profile.selectedModel);
    if (!model) {
      throw new Error('選択されたモデルの設定が見つかりません');
    }

    return {
      appId: model.difyAppId || '',
      apiKey: model.difyApiKey || '',
    };
  } catch (error) {
    console.error('Dify設定の取得に失敗しました:', error);
    return null;
  }
};

// 選択した楽器とモデルのDify API情報を取得
export const getDifyApiInfo = async (): Promise<{appId: string; apiKey: string}> => {
  try {
    const profile = await getUserProfile();
    
    if (!profile) {
      return { appId: '', apiKey: '' };
    }
    
    // カテゴリの検索
    const category = instrumentCategories.find(c => c.id === profile.selectedCategory);
    if (!category) {
      return { appId: '', apiKey: '' };
    }
    
    // 楽器の検索
    const instrument = category.instruments.find(i => i.id === profile.selectedInstrument);
    if (!instrument) {
      return { appId: '', apiKey: '' };
    }
    
    // モデルの検索
    const model = instrument.models.find(m => m.id === profile.selectedModel);
    if (!model) {
      return { appId: '', apiKey: '' };
    }
    
    return {
      appId: model.difyAppId || '',
      apiKey: model.difyApiKey || '',
    };
  } catch (error) {
    console.error('Dify API情報取得エラー:', error);
    return { appId: '', apiKey: '' };
  }
}; 