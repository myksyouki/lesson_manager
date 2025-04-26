import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { demoModeService, isDemoMode } from './demoModeService';
import { Lesson } from '../types/lesson';
import { generateId } from '../utils/id';
import { DemoModeService } from './demoModeService';

// デモモードサービスのインスタンスを作成
const demoModeServiceInstance = new DemoModeService();

/**
 * ユーザーのレッスン一覧を取得する
 * デモモードの場合はローカルストレージから、それ以外の場合はFirestoreから取得
 */
export const getLessons = async (): Promise<Lesson[]> => {
  const { user, isDemo } = useAuthStore.getState();
  const userId = user?.uid;
  
  if (!userId) {
    throw new Error('ユーザーIDが見つかりません');
  }
  
  // デモモードかどうかを確認
  const isDemoMode = isDemoMode();
  
  // デモモードの場合
  if (isDemoMode) {
    return await demoModeServiceInstance.getLessons();
  }
  
  // 通常モードの場合
  try {
    const lessonsCollection = collection(db, 'lessons');
    const q = query(lessonsCollection, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const lessons: Lesson[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      lessons.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        instrumentId: data.instrumentId,
        date: data.date.toDate(),
        duration: data.duration,
        teacher: data.teacher,
        notes: data.notes,
        transcription: data.transcription,
        isFavorite: data.isFavorite,
        isCompleted: data.isCompleted,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      });
    });
    
    return lessons;
  } catch (error) {
    console.error('レッスン一覧の取得に失敗しました:', error);
    throw new Error('レッスンの取得に失敗しました');
  }
};

/**
 * 特定のレッスン情報を取得する
 */
export const getLesson = async (lessonId: string): Promise<Lesson> => {
  const { user, isDemo } = useAuthStore.getState();
  const userId = user?.uid;
  
  if (!userId) {
    throw new Error('ユーザーIDが見つかりません');
  }
  
  // デモモードかどうかを確認
  const isDemoMode = isDemoMode();
  
  // デモモードの場合
  if (isDemoMode) {
    const lesson = await demoModeServiceInstance.getLesson(lessonId);
    if (!lesson) {
      throw new Error('レッスンが見つかりませんでした');
    }
    return lesson;
  }
  
  // 通常モードの場合
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef);
    
    if (!lessonDoc.exists()) {
      throw new Error('レッスンが見つかりませんでした');
    }
    
    const data = lessonDoc.data();
    
    return {
      id: lessonDoc.id,
      userId: data.userId,
      title: data.title,
      instrumentId: data.instrumentId,
      date: data.date.toDate(),
      duration: data.duration,
      teacher: data.teacher,
      notes: data.notes,
      transcription: data.transcription,
      isFavorite: data.isFavorite,
      isCompleted: data.isCompleted,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  } catch (error) {
    console.error('レッスンの取得に失敗しました:', error);
    throw new Error('レッスンの取得に失敗しました');
  }
};

/**
 * レッスンを作成する
 */
export const createLesson = async (lessonData: Omit<Lesson, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Lesson> => {
  const { user, isDemo } = useAuthStore.getState();
  const userId = user?.uid;
  
  if (!userId) {
    throw new Error('ユーザーIDが見つかりません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      const now = new Date();
      const newLessonId = generateId();
      
      const newLesson = {
        id: newLessonId,
        userId,
        ...lessonData,
        createdAt: now,
        updatedAt: now,
      };
      
      const success = await demoModeServiceInstance.addLesson(newLesson as Lesson);
      if (!success) {
        throw new Error('レッスンの作成に失敗しました');
      }
      return newLesson as Lesson;
    } catch (error) {
      console.error('デモレッスンの追加に失敗しました:', error);
      throw new Error('レッスンの追加に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const now = new Date();
    const lessonsCollection = collection(db, 'lessons');
    const docRef = await addDoc(lessonsCollection, {
      userId,
      ...lessonData,
      createdAt: now,
      updatedAt: now,
    });
    
    return {
      id: docRef.id,
      userId,
      ...lessonData,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('レッスンの作成に失敗しました:', error);
    throw new Error('レッスンの作成に失敗しました');
  }
};

/**
 * レッスン情報を更新する
 */
export const updateLesson = async (lessonId: string, updates: Partial<Lesson>): Promise<Lesson> => {
  const { user, isDemo } = useAuthStore.getState();
  const userId = user?.uid;
  
  if (!userId) {
    throw new Error('ユーザーIDが見つかりません');
  }
  
  // デモモードかどうかを確認
  const isDemoMode = isDemoMode();
  
  // デモモードの場合
  if (isDemoMode) {
    try {
      // 現在のレッスンを取得
      const currentLesson = await getLesson(lessonId);
      if (!currentLesson) {
        throw new Error('更新するレッスンが見つかりませんでした');
      }
      
      // 更新内容を適用
      const updatedLesson = {
        ...currentLesson,
        ...updates,
        updatedAt: new Date()
      };
      
      // デモモードのレッスンを更新
      const success = await demoModeServiceInstance.updateLesson(updatedLesson);
      if (!success) {
        throw new Error('レッスンの更新に失敗しました');
      }
      
      return updatedLesson;
    } catch (error) {
      console.error('デモレッスンの更新に失敗しました:', error);
      throw new Error('レッスンの更新に失敗しました');
    }
  }

  // 通常モードの場合
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      ...updates,
      updatedAt: new Date()
    });
    
    // 更新後のデータを取得して返す
    const updatedDoc = await getDoc(lessonRef);
    const data = updatedDoc.data();
    
    if (!data) {
      throw new Error('更新後のレッスンデータが見つかりませんでした');
    }
    
    return {
      id: updatedDoc.id,
      userId: data.userId,
      title: data.title,
      instrumentId: data.instrumentId,
      date: data.date.toDate(),
      duration: data.duration,
      teacher: data.teacher,
      notes: data.notes,
      transcription: data.transcription,
      isFavorite: data.isFavorite,
      isCompleted: data.isCompleted,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  } catch (error) {
    console.error('レッスンの更新に失敗しました:', error);
    throw new Error('レッスンの更新に失敗しました');
  }
};

/**
 * レッスンを削除する
 */
export const deleteLesson = async (lessonId: string): Promise<boolean> => {
  const { user, isDemo } = useAuthStore.getState();
  const userId = user?.uid;
  
  if (!userId) {
    throw new Error('ユーザーIDが見つかりませんでした');
  }
  
  // デモモードかどうかを確認
  const isDemoMode = isDemoMode();
  
  // デモモードの場合
  if (isDemoMode) {
    try {
      const success = await demoModeServiceInstance.deleteLesson(lessonId);
      if (!success) {
        throw new Error('レッスンの削除に失敗しました');
      }
      return true;
    } catch (error) {
      console.error('デモレッスンの削除に失敗しました:', error);
      throw new Error('レッスンの削除に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef);
    
    if (!lessonDoc.exists()) {
      throw new Error('レッスンが見つかりませんでした');
    }
    
    const data = lessonDoc.data();
    
    if (data.userId !== userId) {
      throw new Error('このレッスンを削除する権限がありません');
    }
    
    await deleteDoc(lessonRef);
    
    return true;
  } catch (error) {
    console.error('レッスンの削除に失敗しました:', error);
    throw new Error('レッスンの削除に失敗しました');
  }
};

/**
 * お気に入り状態を切り替え
 */
export const toggleFavorite = async (lessonId: string): Promise<Lesson> => {
  const { isDemo } = useAuthStore.getState();

  try {
    // 現在のレッスン情報を取得
    const lesson = await getLesson(lessonId);
    
    // お気に入り状態を反転
    const updatedLesson = await updateLesson(lessonId, {
      isFavorite: !lesson.isFavorite,
    });
    
    return updatedLesson;
  } catch (error) {
    console.error('お気に入り切り替えエラー:', error);
    throw new Error('お気に入り状態の変更に失敗しました');
  }
};

/**
 * 完了状態を切り替え
 */
export const toggleCompleted = async (lessonId: string): Promise<Lesson> => {
  try {
    // 現在のレッスン情報を取得
    const lesson = await getLesson(lessonId);
    
    // 完了状態を反転
    const updatedLesson = await updateLesson(lessonId, {
      isCompleted: !lesson.isCompleted,
    });
    
    return updatedLesson;
  } catch (error) {
    console.error('完了状態切り替えエラー:', error);
    throw new Error('完了状態の変更に失敗しました');
  }
}; 