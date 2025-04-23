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
  duration: number;
  exercises: {
    id: string;
    title: string;
    description?: string;
    duration: number;
  }[];
  isCompleted: boolean;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
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
    const practiceMenusQuery = query(
      collection(db, 'practiceMenus'),
      where('userId', '==', user.uid)
    );
    
    const querySnapshot = await getDocs(practiceMenusQuery);
    const practiceMenus: PracticeMenu[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      practiceMenus.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        description: data.description,
        instrumentId: data.instrumentId,
        duration: data.duration,
        exercises: data.exercises || [],
        isCompleted: data.isCompleted,
        isFavorite: data.isFavorite || false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });
    
    return practiceMenus;
  } catch (error) {
    console.error('練習メニューの取得に失敗しました:', error);
    throw new Error('練習メニューの取得に失敗しました');
  }
};

/**
 * 特定の練習メニューを取得する
 */
export const getPracticeMenu = async (practiceMenuId: string): Promise<PracticeMenu> => {
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
      
      const practiceMenu = practiceMenus.find(menu => menu.id === practiceMenuId);
      
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
    const practiceMenuDoc = await getDoc(doc(db, 'practiceMenus', practiceMenuId));
    
    if (!practiceMenuDoc.exists()) {
      throw new Error('練習メニューが見つかりませんでした');
    }
    
    const data = practiceMenuDoc.data();
    
    return {
      id: practiceMenuDoc.id,
      userId: data.userId,
      title: data.title,
      description: data.description,
      instrumentId: data.instrumentId,
      duration: data.duration,
      exercises: data.exercises || [],
      isCompleted: data.isCompleted,
      isFavorite: data.isFavorite || false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error('練習メニューの取得に失敗しました:', error);
    throw new Error('練習メニューの取得に失敗しました');
  }
};

/**
 * 練習メニューを作成する
 */
export const createPracticeMenu = async (
  practiceMenuData: Omit<PracticeMenu, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<PracticeMenu> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const now = new Date().toISOString();
  const newPracticeMenu: Omit<PracticeMenu, 'id'> = {
    ...practiceMenuData,
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
      
      const createdPracticeMenu: PracticeMenu = {
        ...newPracticeMenu as any,
        id: `demo-practice-menu-${Date.now()}`,
      };
      
      practiceMenus.push(createdPracticeMenu);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      }
      
      return createdPracticeMenu;
    } catch (error) {
      console.error('デモ練習メニューの作成に失敗しました:', error);
      throw new Error('デモ練習メニューの作成に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const docRef = await addDoc(collection(db, 'practiceMenus'), newPracticeMenu);
    
    return {
      ...newPracticeMenu,
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
  practiceMenuId: string,
  practiceMenuData: Partial<PracticeMenu>
): Promise<PracticeMenu> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const updateData = {
    ...practiceMenuData,
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
      
      const practiceMenuIndex = practiceMenus.findIndex(menu => menu.id === practiceMenuId);
      
      if (practiceMenuIndex === -1) {
        throw new Error('練習メニューが見つかりませんでした');
      }
      
      const updatedPracticeMenu = {
        ...practiceMenus[practiceMenuIndex],
        ...updateData,
      };
      
      practiceMenus[practiceMenuIndex] = updatedPracticeMenu;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(practiceMenus));
      }
      
      return updatedPracticeMenu;
    } catch (error) {
      console.error('デモ練習メニューの更新に失敗しました:', error);
      throw new Error('デモ練習メニューの更新に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const practiceMenuRef = doc(db, 'practiceMenus', practiceMenuId);
    await updateDoc(practiceMenuRef, updateData);
    
    // 更新後のデータを取得
    const updatedDoc = await getDoc(practiceMenuRef);
    const data = updatedDoc.data();
    
    return {
      id: practiceMenuId,
      userId: data?.userId,
      title: data?.title,
      description: data?.description,
      instrumentId: data?.instrumentId,
      duration: data?.duration,
      exercises: data?.exercises || [],
      isCompleted: data?.isCompleted,
      isFavorite: data?.isFavorite || false,
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
export const deletePracticeMenu = async (practiceMenuId: string): Promise<void> => {
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
      
      const filteredPracticeMenus = practiceMenus.filter(menu => menu.id !== practiceMenuId);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoPracticeMenus', JSON.stringify(filteredPracticeMenus));
      } else {
        await AsyncStorage.setItem('demoPracticeMenus', JSON.stringify(filteredPracticeMenus));
      }
      
      return;
    } catch (error) {
      console.error('デモ練習メニューの削除に失敗しました:', error);
      throw new Error('デモ練習メニューの削除に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    await deleteDoc(doc(db, 'practiceMenus', practiceMenuId));
  } catch (error) {
    console.error('練習メニューの削除に失敗しました:', error);
    throw new Error('練習メニューの削除に失敗しました');
  }
}; 