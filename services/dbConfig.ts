import { collection, doc, getDoc, getDocs, setDoc, query, where } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { 
  setUseUserBasedStructure, 
  isUsingUserBasedStructure, 
  setUserBasedIndexesReady
} from '../config/appConfig';
import { setUseNewStructure as setLessonServiceUseNewStructure } from './api/lessonService';
import { setUseNewStructure as setTaskServiceUseNewStructure } from './taskService';
import { setUseNewStructure as setChatRoomServiceUseNewStructure } from './chatRoomService';
import { setUseNewStructure as setUserProfileServiceUseNewStructure } from './userProfileService';

const CONFIG_COLLECTION = 'appConfig';
const DB_STRUCTURE_DOC = 'dbStructure';

/**
 * データベース構造の初期化
 * アプリ起動時に呼び出される
 */
export const initializeDatabaseStructure = async (): Promise<void> => {
  try {
    console.log('データベース構造設定の初期化を開始...');
    
    // 常にユーザーベース構造を使用する
    setUseUserBasedStructure(true);
    setUserBasedIndexesReady(true);
    
    // 各サービスの設定を更新
    updateAllServicesConfig(true);
    
    console.log('データベース構造の初期化完了: ユーザーベース');
    
    // ユーザーがログインしている場合のみFirestoreにデータを保存
    const user = auth.currentUser;
    if (user) {
      // データベース設定をFirestoreに保存
      try {
        await setDoc(doc(db, CONFIG_COLLECTION, DB_STRUCTURE_DOC), {
          useUserBasedStructure: true,
          userBasedIndexesReady: true,
          updatedAt: new Date()
        });
        console.log('データベース構造設定をFirestoreに保存しました');
      } catch (createError: unknown) {
        console.warn('設定ドキュメントの保存に失敗しました:', createError);
      }
    } else {
      console.log('ユーザーがログインしていないため、設定はローカルのみに保存します');
    }
  } catch (error: unknown) {
    // エラーの詳細情報を出力
    console.error('データベース構造の初期化に失敗しました:', error);
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('エラーコード:', (error as { code: string }).code);
    }
    
    // エラー時も常にユーザーベース構造を使用
    setUseUserBasedStructure(true);
    updateAllServicesConfig(true);
  }
};

/**
 * データベース構造を変更する関数
 * この関数は残しておきますが、常にtrueを返す実装に変更
 * @param useUserBasedStructure この引数は無視され、常にtrueが使用される
 */
export const changeDatabaseStructure = async (_useUserBasedStructure: boolean): Promise<void> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      console.log('ユーザーがログインしていないため、設定はローカルのみに保存します');
      // グローバル設定を更新
      setUseUserBasedStructure(true);
      setUserBasedIndexesReady(true);
      
      // 各サービスの設定を更新
      updateAllServicesConfig(true);
      return;
    }
    
    // ユーザーがログインしている場合はFirestoreにも保存
    // 常にユーザーベース構造を使用するように設定
    await setDoc(doc(db, CONFIG_COLLECTION, DB_STRUCTURE_DOC), {
      useUserBasedStructure: true,
      userBasedIndexesReady: true,
      updatedAt: new Date()
    });
    
    // グローバル設定を更新
    setUseUserBasedStructure(true);
    setUserBasedIndexesReady(true);
    
    // 各サービスの設定を更新
    updateAllServicesConfig(true);
    
    console.log('データベース構造をユーザーベース構造に設定しました');
  } catch (error) {
    console.error('データベース構造の変更に失敗しました:', error);
    throw error;
  }
};

/**
 * 各サービスのデータベース構造設定を一括更新
 * @param useUserBasedStructure ユーザーベースの構造を使用する場合はtrue
 */
export const updateAllServicesConfig = (useUserBasedStructure: boolean): void => {
  // 各サービスのuseNewStructure設定を更新
  setLessonServiceUseNewStructure(useUserBasedStructure);
  setTaskServiceUseNewStructure(useUserBasedStructure);
  setChatRoomServiceUseNewStructure(useUserBasedStructure);
  setUserProfileServiceUseNewStructure(useUserBasedStructure);
};

/**
 * ユーザーデータの移行状況をチェック
 * @param userId ユーザーID
 * @returns 移行が完了している場合はtrue
 */
export const checkUserDataMigrated = async (userId: string): Promise<boolean> => {
  // ユーザーベース構造のみをサポートするため常にtrueを返す
  return true;
}; 