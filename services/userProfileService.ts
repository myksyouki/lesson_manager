import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  displayName?: string;
  photoURL?: string;
  instrument?: string;
  skillLevel?: string;
  practiceGoal?: string;
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
  // 利用可能なモデル一覧
  models: InstrumentModel[];
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
        id: 'classic',
        name: 'クラシック',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ]
      },
      {
        id: 'jazz',
        name: 'ジャズ',
        models: [
          {
            id: 'standard',
            name: 'スタンダードモデル',
            isArtist: false
          }
        ]
      },
      {
        id: 'pops',
        name: 'ポップス',
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
        id: 'classic',
        name: 'クラシック',
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
            isArtist: false,
            description: '基本的なサックスの練習に適したモデルです。'
          },
          {
            id: 'ueno',
            name: '上野耕平モデル',
            isArtist: true,
            description: '上野耕平氏によるサックス演奏のアドバイスを提供します。'
          },
          {
            id: 'saito',
            name: '齊藤健太モデル',
            isArtist: true,
            description: '齊藤健太氏によるサックス演奏のアドバイスを提供します。'
          },
          {
            id: 'sumiya',
            name: '住谷美帆モデル',
            isArtist: true,
            description: '住谷美帆氏によるサックス演奏のアドバイスを提供します。'
          },
          {
            id: 'tanaka',
            name: '田中奏一朗モデル',
            isArtist: true,
            description: '田中奏一朗氏によるサックス演奏のアドバイスを提供します。'
          },
          {
            id: 'tsuzuki',
            name: '都築惇モデル',
            isArtist: true,
            description: '都築惇氏によるサックス演奏のアドバイスを提供します。'
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
export const createUserProfile = async (profileData: Partial<UserProfile>): Promise<UserProfile> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが見つかりません');

    const userRef = doc(db, 'users', user.uid);
    const profileRef = doc(userRef, 'profile', 'main');

    const updatedData = {
      ...profileData,
      updatedAt: serverTimestamp(),
    };

    await setDoc(profileRef, updatedData, { merge: true });

    // 更新後のプロフィールを返す
    return {
      ...profileData,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as UserProfile;
  } catch (error) {
    console.error('プロフィール更新エラー:', error);
    throw error;
  }
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
      return await createUserProfile({
        id: user.uid,
        name: user.displayName || '',
        email: user.email || '',
        selectedCategory: DEFAULT_CATEGORY,
        selectedInstrument: DEFAULT_INSTRUMENT,
        selectedModel: DEFAULT_MODEL,
        isPremium: true, // 開発段階のため常にプレミアム権限を持つように設定
        isOnboardingCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
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
      isPremium: true, // 開発段階のため常にプレミアム権限を持つように設定
      isOnboardingCompleted: !!data.isOnboardingCompleted,
      createdAt: data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt.seconds * 1000) : new Date(),
      displayName: data.displayName || user.displayName || '',
      photoURL: data.photoURL || user.photoURL || '',
      instrument: data.instrument || '',
      skillLevel: data.skillLevel || '',
      practiceGoal: data.practiceGoal || '',
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
    // キャッシュされている場合はそれを返す
    if (cachedInstrumentInfo && !forceRefresh) {
      return cachedInstrumentInfo;
    }
    
    // 現在のユーザープロファイルを取得
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return null;
    }
    
    // 対応するカテゴリを取得
    const category = instrumentCategories.find(c => c.id === profile.selectedCategory);
    if (!category) {
      return null;
    }
    
    // 対応する楽器を取得
    const instrument = category.instruments.find(i => i.id === profile.selectedInstrument);
    if (!instrument) {
      return null;
    }
    
    // 結果の初期値（使用できるモデルがない場合）
    const result: InstrumentInfo = {
      categoryId: category.id,
      categoryName: category.name,
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      modelId: profile.selectedModel || DEFAULT_MODEL,
      modelName: 'スタンダードモデル',
      isArtistModel: false,
      models: instrument.models // モデル一覧を追加
    };
    
    // モデル情報を取得
    const model = instrument.models.find(m => m.id === result.modelId);
    if (model) {
      result.modelName = model.name;
      result.isArtistModel = model.isArtist;
    }
    
    // キャッシュを更新
    cachedInstrumentInfo = result;
    
    return result;
  } catch (error) {
    console.error('楽器情報取得エラー:', error);
    return null;
  }
}; 