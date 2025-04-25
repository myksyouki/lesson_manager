import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PracticeMenu {
  id: string;
  userId: string;
  title: string;
  description: string;
  instrumentId: string;
  duration: number; // 分単位
  sections: PracticeSection[];
  createdAt: string;
  updatedAt: string;
}

export interface PracticeSection {
  id: string;
  title: string;
  duration: number; // 分単位
  description?: string;
}

/**
 * 練習メニュー一覧を取得する
 * デモモードの場合はローカルストレージから、それ以外の場合はFirestoreから取得
 */
export const getPracticeMenus = async (): Promise<PracticeMenu[]> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      let practiceMenus: PracticeMenu[] = [];
      
      if (Platform.OS === 'web') {
        const practiceMenusData = localStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      } else {
        const practiceMenusData = await AsyncStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      }
      
      return practiceMenus;
    } catch (error) {
      console.error('デモ練習メニューの取得に失敗しました:', error);
      throw new Error('デモ練習メニューの取得に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const practiceMenus: PracticeMenu[] = [];
    
    // 対応する楽器のコレクションを取得
    // Firestoreの構造: /practiceMenus/{楽器名}/categories/{カテゴリ名}/menus/{メニューID}
    const instrumentTypes = ['saxophone', 'piano', 'violin', 'clarinet', 'flute']; // 対応する楽器一覧
    
    // 各楽器タイプに対して処理を実行
    for (const instrumentType of instrumentTypes) {
      console.log(`${instrumentType}の練習メニューを検索中...`);
      
      // カテゴリコレクションを取得
      const categoriesSnapshot = await getDocs(collection(db, `practiceMenus/${instrumentType}/categories`));
      
      // 各カテゴリに対して処理を実行
      for (const categoryDoc of categoriesSnapshot.docs) {
        const categoryId = categoryDoc.id;
        
        // メニューコレクションを取得
        const menusSnapshot = await getDocs(
          collection(db, `practiceMenus/${instrumentType}/categories/${categoryId}/menus`)
        );
        
        // 各メニューを処理
        menusSnapshot.forEach((menuDoc) => {
          const data = menuDoc.data();
          // データ形式を変換して配列に追加
          practiceMenus.push({
            id: menuDoc.id,
            userId: data.userId || user.uid, // ユーザーIDが存在しない場合は現在のユーザーIDを設定
            title: data.title || '',
            description: data.description || '',
            instrumentId: instrumentType, // 楽器タイプを設定
            duration: data.duration || 0,
            sections: data.steps?.map(step => ({
              id: step.id || `step-${Date.now()}-${Math.random()}`,
              title: step.title || '',
              duration: step.duration || 0,
              description: step.description || ''
            })) || [], // stepsを正しいフォーマットでsectionsにマッピング
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            // 追加のデータをany型で保存して、表示時に利用できるようにする
            ...(data.key && { key: data.key }),
            ...(data.keyDe && { keyDe: data.keyDe }),
            ...(data.keyEn && { keyEn: data.keyEn }),
            ...(data.keyJp && { keyJp: data.keyJp }),
            ...(data.scaleType && { scaleType: data.scaleType }),
            ...(data.tags && { tags: data.tags }),
            ...(data.instrument && { instrument: data.instrument }),
          } as any);
          
          console.log(`メニュー読み込み: ${menuDoc.id}, タイトル: ${data.title}, ステップ数: ${data.steps?.length || 0}`);
        });
      }
    }
    
    console.log(`合計${practiceMenus.length}件の練習メニューを取得しました`);
    return practiceMenus;
  } catch (error) {
    console.error('練習メニューの取得に失敗しました:', error);
    throw new Error('練習メニューの取得に失敗しました');
  }
};

/**
 * 特定の練習メニューを取得する
 */
export const getPracticeMenu = async (menuId: string): Promise<PracticeMenu> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      let practiceMenus: PracticeMenu[] = [];
      
      if (Platform.OS === 'web') {
        const practiceMenusData = localStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      } else {
        const practiceMenusData = await AsyncStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      }
      
      const practiceMenu = practiceMenus.find(menu => menu.id === menuId);
      
      if (!practiceMenu) {
        throw new Error('練習メニューが見つかりませんでした');
      }
      
      return practiceMenu;
    } catch (error) {
      console.error('デモ練習メニューの取得に失敗しました:', error);
      throw new Error('デモ練習メニューの取得に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    // メニューIDからパスを抽出する
    // 例: menu_A_major_1744958787663_512
    const parts = menuId.split('_');
    if (parts.length < 3) {
      throw new Error('無効なメニューIDフォーマットです');
    }
    
    // 対応する楽器のコレクションを取得
    // Firestoreの構造: /practiceMenus/{楽器名}/categories/{カテゴリ名}/menus/{メニューID}
    const instrumentTypes = ['saxophone', 'piano', 'violin', 'clarinet', 'flute']; // 対応する楽器一覧
    
    let menuData = null;
    
    // 各楽器タイプでメニューを検索
    for (const instrumentType of instrumentTypes) {
      if (menuData) break; // 既に見つかった場合はスキップ
      
      // カテゴリコレクションを取得
      const categoriesSnapshot = await getDocs(collection(db, `practiceMenus/${instrumentType}/categories`));
      
      // 各カテゴリに対して処理を実行
      for (const categoryDoc of categoriesSnapshot.docs) {
        if (menuData) break; // 既に見つかった場合はスキップ
        
        const categoryId = categoryDoc.id;
        const menuRef = doc(db, `practiceMenus/${instrumentType}/categories/${categoryId}/menus`, menuId);
        const menuSnapshot = await getDoc(menuRef);
        
        if (menuSnapshot.exists()) {
          const data = menuSnapshot.data();
          menuData = {
            id: menuSnapshot.id,
            userId: data.userId || user.uid,
            title: data.title || '',
            description: data.description || '',
            instrumentId: instrumentType,
            duration: data.duration || 0,
            sections: data.steps?.map((step: any) => ({
              id: step.id || `step-${Date.now()}-${Math.random()}`,
              title: step.title || '',
              duration: step.duration || 0,
              description: step.description || ''
            })) || [],
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString(),
            // 追加のデータをany型で保存して、表示時に利用できるようにする
            ...(data.key && { key: data.key }),
            ...(data.keyDe && { keyDe: data.keyDe }),
            ...(data.keyEn && { keyEn: data.keyEn }),
            ...(data.keyJp && { keyJp: data.keyJp }),
            ...(data.scaleType && { scaleType: data.scaleType }),
            ...(data.tags && { tags: data.tags }),
            ...(data.instrument && { instrument: data.instrument }),
          } as any;
          break;
        }
      }
    }
    
    if (!menuData) {
      throw new Error('練習メニューが見つかりませんでした');
    }
    
    return menuData as PracticeMenu;
  } catch (error) {
    console.error('練習メニューの取得に失敗しました:', error);
    throw new Error('練習メニューの取得に失敗しました');
  }
};

/**
 * 練習メニューを作成する
 */
export const createPracticeMenu = async (
  menuData: Omit<PracticeMenu, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<PracticeMenu> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const now = new Date().toISOString();
  const newMenu: Omit<PracticeMenu, 'id'> = {
    ...menuData,
    userId: user.uid,
    createdAt: now,
    updatedAt: now,
  };
  
  // デモモードの場合
  if (isDemo) {
    try {
      let practiceMenus: PracticeMenu[] = [];
      
      if (Platform.OS === 'web') {
        const practiceMenusData = localStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      } else {
        const practiceMenusData = await AsyncStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      }
      
      const createdMenu: PracticeMenu = {
        ...newMenu as any,
        id: `demo-practice-${Date.now()}`,
      };
      
      practiceMenus.push(createdMenu);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      }
      
      return createdMenu;
    } catch (error) {
      console.error('デモ練習メニューの作成に失敗しました:', error);
      throw new Error('デモ練習メニューの作成に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const docRef = await addDoc(collection(db, 'practiceMenus'), newMenu);
    
    return {
      ...newMenu,
      id: docRef.id,
    };
  } catch (error) {
    console.error('練習メニューの作成に失敗しました:', error);
    throw new Error('練習メニューの作成に失敗しました');
  }
};

/**
 * 練習メニューを更新する
 */
export const updatePracticeMenu = async (
  menuId: string,
  menuData: Partial<PracticeMenu>
): Promise<PracticeMenu> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const updateData = {
    ...menuData,
    updatedAt: new Date().toISOString(),
  };
  
  // デモモードの場合
  if (isDemo) {
    try {
      let practiceMenus: PracticeMenu[] = [];
      
      if (Platform.OS === 'web') {
        const practiceMenusData = localStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      } else {
        const practiceMenusData = await AsyncStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      }
      
      const menuIndex = practiceMenus.findIndex(menu => menu.id === menuId);
      
      if (menuIndex === -1) {
        throw new Error('練習メニューが見つかりませんでした');
      }
      
      const updatedMenu = {
        ...practiceMenus[menuIndex],
        ...updateData,
      };
      
      practiceMenus[menuIndex] = updatedMenu;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      }
      
      return updatedMenu;
    } catch (error) {
      console.error('デモ練習メニューの更新に失敗しました:', error);
      throw new Error('デモ練習メニューの更新に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const menuRef = doc(db, 'practiceMenus', menuId);
    await updateDoc(menuRef, updateData);
    
    // 更新後のデータを取得
    const updatedDoc = await getDoc(menuRef);
    const data = updatedDoc.data();
    
    return {
      id: menuId,
      userId: data?.userId,
      title: data?.title,
      description: data?.description,
      instrumentId: data?.instrumentId,
      duration: data?.duration,
      sections: data?.sections || [],
      createdAt: data?.createdAt,
      updatedAt: data?.updatedAt,
    } as PracticeMenu;
  } catch (error) {
    console.error('練習メニューの更新に失敗しました:', error);
    throw new Error('練習メニューの更新に失敗しました');
  }
};

/**
 * 練習メニューを削除する
 */
export const deletePracticeMenu = async (menuId: string): Promise<void> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      let practiceMenus: PracticeMenu[] = [];
      
      if (Platform.OS === 'web') {
        const practiceMenusData = localStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      } else {
        const practiceMenusData = await AsyncStorage.getItem('demoPracticeMenus');
        if (practiceMenusData) {
          practiceMenus = JSON.parse(practiceMenusData);
        }
      }
      
      const filteredMenus = practiceMenus.filter(menu => menu.id !== menuId);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(filteredMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(filteredMenus));
      }
      
      return;
    } catch (error) {
      console.error('デモ練習メニューの削除に失敗しました:', error);
      throw new Error('デモ練習メニューの削除に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    await deleteDoc(doc(db, 'practiceMenus', menuId));
  } catch (error) {
    console.error('練習メニューの削除に失敗しました:', error);
    throw new Error('練習メニューの削除に失敗しました');
  }
};