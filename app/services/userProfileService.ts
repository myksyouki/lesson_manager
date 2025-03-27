import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { User } from 'firebase/auth';

// ユーザープロファイル用の型定義
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  selectedCategory: string;
  selectedInstrument: string;
  selectedModel: string;
  isPremium: boolean;
  isOnboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// モデル情報の型定義
export interface InstrumentModel {
  id: string;
  name: string;
  isArtist: boolean;
  description?: string;
}

// 楽器情報の型定義
export interface Instrument {
  id: string;
  name: string;
  models: InstrumentModel[];
  difyAppId?: string;
  difyApiKey?: string;
}

// 楽器カテゴリの型定義
export interface InstrumentCategory {
  id: string;
  name: string;
  instruments: Instrument[];
}

// ユーザーが選択している楽器情報を取得
// 表示用の名前とIDの両方を提供
export interface InstrumentInfo {
  // カテゴリ情報
  categoryId: string;
  categoryName: string;
  // 楽器情報
  instrumentId: string;
  instrumentName: string;
  // モデル情報
  modelId: string;
  modelName: string;
  isArtistModel: boolean;
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

// 楽器情報のキャッシュ
let cachedInstrumentInfo: InstrumentInfo | null = null;

/**
 * キャッシュされた楽器情報をクリア
 */
export const clearInstrumentInfoCache = (): void => {
  cachedInstrumentInfo = null;
  console.log('楽器情報キャッシュをクリアしました');
};

// 初期化時にキャッシュをクリア
clearInstrumentInfoCache();

// 楽器カテゴリの定義
export const instrumentCategories: InstrumentCategory[] = [
  // ボーカルカテゴリ
  {
    id: 'vocal',
    name: 'ボーカル',
    instruments: [
      {
        id: 'vocal',
        name: 'ボーカル',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ]
      }
    ]
  },
  // ピアノカテゴリ
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
            isArtist: false
          }
        ],
        difyAppId: process.env.EXPO_PUBLIC_DIFY_PIANO_APP_ID || '',
        difyApiKey: process.env.EXPO_PUBLIC_DIFY_PIANO_API_KEY || ''
      }
    ]
  },
  // 弦楽器カテゴリ
  {
    id: 'strings',
    name: '弦楽器',
    instruments: [
      {
        id: 'violin',
        name: 'ヴァイオリン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ],
        difyAppId: process.env.EXPO_PUBLIC_DIFY_VIOLIN_APP_ID || '',
        difyApiKey: process.env.EXPO_PUBLIC_DIFY_VIOLIN_API_KEY || ''
      },
      {
        id: 'viola',
        name: 'ヴィオラ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
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
            isArtist: false
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
            isArtist: false
          }
        ]
      }
    ]
  },
  // 管楽器カテゴリ
  {
    id: 'woodwind',
    name: '管楽器',
    instruments: [
      {
        id: 'flute',
        name: 'フルート',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
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
            isArtist: false
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
            isArtist: false
          }
        ]
      },
      {
        id: 'fagotto',
        name: 'ファゴット',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ]
      },
      {
        id: 'saxophone',
        name: 'サクソフォン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          },
          {
            id: 'ueno',
            name: '上野耕平モデル(BETA)',
            isArtist: true,
            description: '上野耕平氏監修の特別モデルです。クラシックサックスの専門家によるアドバイスが得られます。'
          },
          {
            id: 'tsuzuki',
            name: '都築惇モデル(BETA)',
            isArtist: true,
            description: '都築惇氏監修の特別モデルです。ジャズサックスの専門家によるアドバイスが得られます。'
          },
          {
            id: 'tanaka',
            name: '田中奏一朗モデル(BETA)',
            isArtist: true,
            description: '田中奏一朗氏監修の特別モデルです。ポップスサックスの専門家によるアドバイスが得られます。'
          }
        ],
        difyAppId: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_APP_ID || '',
        difyApiKey: process.env.EXPO_PUBLIC_DIFY_SAXOPHONE_API_KEY || ''
      },
      {
        id: 'horn',
        name: 'ホルン',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ]
      },
      {
        id: 'trumpet',
        name: 'トランペット',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
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
            isArtist: false
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
            isArtist: false
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
            isArtist: false
          }
        ]
      }
    ]
  }
];

// デフォルト値
const DEFAULT_CATEGORY = 'piano';
const DEFAULT_INSTRUMENT = 'piano';
const DEFAULT_MODEL = 'standard';

// ユーザープロファイルの作成
export const createUserProfile = async (user: User) => {
  // プロファイルデータを作成
  const defaultProfile: UserProfile = {
    id: user.uid,
    name: user.displayName || '',
    email: user.email || '',
    selectedCategory: DEFAULT_CATEGORY,
    selectedInstrument: DEFAULT_INSTRUMENT,
    selectedModel: DEFAULT_MODEL,
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
    console.log('=== データベースから取得したプロファイル ===', data);
    
    return {
      id: user.uid,
      name: data.name || user.displayName || '',
      email: data.email || user.email || '',
      selectedCategory: data.selectedCategory || DEFAULT_CATEGORY,
      selectedInstrument: data.selectedInstrument || DEFAULT_INSTRUMENT,
      selectedModel: data.selectedModel || DEFAULT_MODEL,
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
 * 選択したカテゴリーを保存
 */
export const saveSelectedCategory = async (categoryId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーがログインしていません');
      return false;
    }

    // プロファイルを更新
    await updateDoc(doc(db, `users/${user.uid}/profile`, 'main'), {
      selectedCategory: categoryId,
      updatedAt: new Date()
    });
    
    // キャッシュをクリア
    clearInstrumentInfoCache();
    
    return true;
  } catch (error) {
    console.error('カテゴリ選択の保存エラー:', error);
    return false;
  }
};

/**
 * 選択した楽器を保存
 */
export const saveSelectedInstrument = async (categoryId: string, instrumentId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーがログインしていません');
      return false;
    }

    // プロファイルを更新
    await updateDoc(doc(db, `users/${user.uid}/profile`, 'main'), {
      selectedCategory: categoryId,
      selectedInstrument: instrumentId,
      updatedAt: new Date()
    });
    
    // キャッシュをクリア
    clearInstrumentInfoCache();
    
    return true;
  } catch (error) {
    console.error('楽器選択の保存エラー:', error);
    return false;
  }
};

/**
 * 選択したモデルを保存
 */
export const saveSelectedModel = async (categoryId: string, instrumentId: string, modelId: string): Promise<boolean> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error('ユーザーがログインしていません');
      return false;
    }

    // プロファイルを更新
    await updateDoc(doc(db, `users/${user.uid}/profile`, 'main'), {
      selectedCategory: categoryId,
      selectedInstrument: instrumentId,
      selectedModel: modelId,
      updatedAt: new Date()
    });
    
    // キャッシュをクリア
    clearInstrumentInfoCache();
    
    return true;
  } catch (error) {
    console.error('モデル選択の保存エラー:', error);
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

// completeOnboardingとしてエクスポート（別名）
export const completeOnboarding = saveOnboardingCompletion;

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
    const category = instrumentCategories.find(c => c.id === profile.selectedCategory);
    if (!category) {
      return { appId: '', apiKey: '' };
    }
    
    const instrument = category.instruments.find(i => i.id === profile.selectedInstrument);
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

/**
 * ユーザーが選択している楽器情報を取得
 * @param forceRefresh キャッシュを無視して再取得する場合はtrue
 * @returns 楽器情報オブジェクト
 */
export const getUserInstrumentInfo = async (forceRefresh: boolean = false): Promise<InstrumentInfo | null> => {
  try {
    console.log(`=== getUserInstrumentInfo 開始 (forceRefresh: ${forceRefresh}) ===`);
    
    // 強制リフレッシュの場合はキャッシュをクリア
    if (forceRefresh) {
      console.log('キャッシュをクリアしています');
      cachedInstrumentInfo = null;
    }
    
    // キャッシュがある場合はキャッシュを返す
    if (cachedInstrumentInfo) {
      console.log('キャッシュから楽器情報を返します', cachedInstrumentInfo);
      return cachedInstrumentInfo;
    }
    
    const profile = await getCurrentUserProfile();
    console.log('取得したユーザープロファイル:', profile);
    
    if (!profile) {
      console.log('プロファイルが取得できませんでした');
      return null;
    }
    
    // デフォルト値を設定
    const result: InstrumentInfo = {
      categoryId: profile.selectedCategory || DEFAULT_CATEGORY,
      categoryName: '不明なカテゴリ',
      instrumentId: profile.selectedInstrument || DEFAULT_INSTRUMENT,
      instrumentName: '不明な楽器',
      modelId: profile.selectedModel || DEFAULT_MODEL,
      modelName: 'スタンダードモデル',
      isArtistModel: false
    };
    
    console.log('プロファイルから取得した楽器ID:', {
      categoryId: result.categoryId,
      instrumentId: result.instrumentId,
      modelId: result.modelId
    });
    
    // 楽器IDから正しいカテゴリを見つける（カテゴリと楽器の整合性を確保）
    let instrumentFound = false;
    let correctCategory = null;
    
    // すべてのカテゴリから指定された楽器IDを検索
    for (const category of instrumentCategories) {
      const instrument = category.instruments.find(i => i.id === result.instrumentId);
      if (instrument) {
        // 楽器が見つかった場合、そのカテゴリが正しい
        correctCategory = category;
        result.categoryId = category.id;
        result.categoryName = category.name;
        result.instrumentName = instrument.name;
        instrumentFound = true;
        
        // モデル情報を取得
        const model = instrument.models.find(m => m.id === result.modelId);
        if (model) {
          result.modelName = model.name;
          result.isArtistModel = model.isArtist;
        }
        break;
      }
    }
    
    if (!instrumentFound) {
      // 楽器が見つからない場合は、プロファイルのカテゴリで探す
      const category = instrumentCategories.find(c => c.id === result.categoryId);
      console.log('見つかったカテゴリ:', category ? category.name : '見つかりませんでした');
      
      if (category) {
        result.categoryName = category.name;
        
        // 楽器情報を取得
        const instrument = category.instruments.find(i => i.id === result.instrumentId);
        console.log('見つかった楽器:', instrument ? instrument.name : '見つかりませんでした');
        
        if (instrument) {
          result.instrumentName = instrument.name;
          
          // モデル情報を取得
          const model = instrument.models.find(m => m.id === result.modelId);
          console.log('見つかったモデル:', model ? model.name : '見つかりませんでした');
          
          if (model) {
            result.modelName = model.name;
            result.isArtistModel = model.isArtist;
          }
        }
      }
    } else {
      console.log('正しいカテゴリで楽器を見つけました:', correctCategory?.name);
    }
    
    // プロファイルを自動修正（カテゴリと楽器の整合性を維持）
    if (instrumentFound && profile.selectedCategory !== result.categoryId) {
      console.log('プロファイルのカテゴリを修正します:', {
        old: profile.selectedCategory,
        new: result.categoryId
      });
      
      // 非同期で更新（結果を待たない）
      const user = auth.currentUser;
      if (user) {
        updateDoc(doc(db, `users/${user.uid}/profile`, 'main'), {
          selectedCategory: result.categoryId,
          updatedAt: new Date()
        }).catch(err => console.error('プロファイル自動更新エラー:', err));
      }
    }
    
    // 結果をキャッシュする
    console.log('最終的な楽器情報:', result);
    cachedInstrumentInfo = result;
    
    return result;
  } catch (error) {
    console.error('楽器情報取得エラー:', error);
    return null;
  }
}; 