import { apiService } from './apiService';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc, updateDoc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Lesson } from '../../types/lesson';

/**
 * レッスン関連のAPI操作を行うサービスクラス
 */
class LessonService {
  /**
   * アプリ設定（常にユーザーベース構造を使用）
   */
  private useNewStructure = true;
  
  /**
   * 新しいデータ構造を使用するかどうかを設定する
   * 常にtrueを返すように修正
   * @param useNew 新しい構造を使用する場合はtrue
   */
  setUseNewStructure(useNew: boolean): void {
    // 常にtrueを設定（引数は無視）
    this.useNewStructure = true;
  }

  /**
   * レッスンデータを取得する
   * @param lessonId レッスンID
   * @param userId ユーザーID
   * @returns レッスンデータ
   */
  async getLesson(lessonId: string, userId: string): Promise<Lesson> {
    try {
      return this.getLessonNewStructure(userId, lessonId);
    } catch (error) {
      console.error('レッスンの取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ユーザーベース構造でのレッスン取得
   * @param userId ユーザーID
   * @param lessonId レッスンID
   * @returns レッスンデータ
   */
  async getLessonNewStructure(userId: string, lessonId: string): Promise<Lesson> {
    const lessonDoc = await getDoc(doc(db, `users/${userId}/lessons`, lessonId));
    
    if (!lessonDoc.exists()) {
      throw new Error('レッスンが見つかりません');
    }
    
    return {
      id: lessonDoc.id,
      ...lessonDoc.data(),
    } as Lesson;
  }

  /**
   * ユーザーのレッスン一覧を取得する
   * @param userId ユーザーID
   * @returns レッスン一覧
   */
  async getUserLessons(userId: string): Promise<Lesson[]> {
    try {
      return this.getUserLessonsNewStructure(userId);
    } catch (error) {
      console.error('レッスン一覧の取得に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * ユーザーベース構造でのレッスン一覧取得
   * @param userId ユーザーID
   * @returns レッスン一覧
   */
  async getUserLessonsNewStructure(userId: string): Promise<Lesson[]> {
    const lessonsRef = collection(db, `users/${userId}/lessons`);
    const lessonsSnapshot = await getDocs(query(lessonsRef, orderBy('created_at', 'desc')));
    
    return lessonsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Lesson[];
  }

  /**
   * 新しいレッスンを作成する
   * @param lessonData レッスンデータ
   * @returns 作成されたレッスンのID
   */
  async createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
    try {
      const userId = lessonData.user_id;
      if (!userId) {
        throw new Error('ユーザーIDが指定されていません');
      }
      
      const processingId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      return this.createLessonNewStructure(lessonData, userId, processingId);
    } catch (error) {
      console.error('レッスンの作成に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * ユーザーベース構造でのレッスン作成
   * @param lessonData レッスンデータ
   * @param userId ユーザーID
   * @param processingId 処理ID
   * @returns 作成されたレッスンのID
   */
  async createLessonNewStructure(
    lessonData: Omit<Lesson, 'id'>, 
    userId: string, 
    processingId: string
  ): Promise<string> {
    const newLessonRef = doc(collection(db, `users/${userId}/lessons`));
    
    await setDoc(newLessonRef, {
      ...lessonData,
      created_at: new Date(),
      updated_at: new Date(),
      status: 'pending',
      processingId: processingId,
    });
    
    return newLessonRef.id;
  }

  /**
   * レッスンを更新する
   * @param lessonId レッスンID
   * @param lessonData 更新するレッスンデータ
   * @param userId ユーザーID
   */
  async updateLesson(lessonId: string, lessonData: Partial<Lesson>, userId: string): Promise<void> {
    try {
      if (!userId) {
        throw new Error('ユーザーIDが指定されていません');
      }
      
      return this.updateLessonNewStructure(lessonId, lessonData, userId);
    } catch (error) {
      console.error('レッスンの更新に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * ユーザーベース構造でのレッスン更新
   * @param lessonId レッスンID
   * @param lessonData 更新するレッスンデータ
   * @param userId ユーザーID
   */
  async updateLessonNewStructure(
    lessonId: string, 
    lessonData: Partial<Lesson>, 
    userId: string
  ): Promise<void> {
    await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), {
      ...lessonData,
      updated_at: new Date(),
    });
  }

  /**
   * 音声ファイルをアップロードし、レッスンと関連付ける
   * @param lessonId レッスンID
   * @param audioFile 音声ファイル
   * @param userId ユーザーID
   * @returns アップロードされたファイルのURL
   */
  async uploadAudioFile(lessonId: string, audioFile: Blob, userId: string): Promise<string> {
    try {
      // レッスンデータを取得
      const lessonDoc = await getDoc(doc(db, `users/${userId}/lessons`, lessonId));
      if (!lessonDoc.exists()) {
        throw new Error('レッスンが見つかりません');
      }
      
      const lessonData = lessonDoc.data();
      const processingId = lessonData.processingId || `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const storage = getStorage();
      const timestamp = new Date().getTime();
      const fileExtension = 'mp3'; // または適切な拡張子を取得
      const fileName = `${lessonId}.${fileExtension}`;
      const filePath = `audio/${userId}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      // ファイルをアップロード
      await uploadBytes(storageRef, audioFile);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);
      
      // レッスンデータを更新
      const updateData = {
        audioUrl: downloadURL,
        audioPath: filePath,
        status: 'processing',
        updated_at: new Date(),
        processingId: processingId,
      };
      
      await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), updateData);
      
      // Firebase Functionsに処理を依頼
      await this.processAudio(lessonId, filePath, userId, processingId);
      
      return downloadURL;
    } catch (error) {
      console.error('音声ファイルのアップロードに失敗しました:', error);
      throw error;
    }
  }

  /**
   * 音声ファイルの処理をリクエスト
   * @param lessonId レッスンID
   * @param filePath ストレージ内のファイルパス
   * @param userId ユーザーID
   * @param processingId 処理ID
   */
  private async processAudio(lessonId: string, filePath: string, userId: string, processingId: string): Promise<void> {
    try {
      await apiService.post('/process-audio', {
        lessonId,
        filePath,
        userId,
        processingId,
        useNewStructure: this.useNewStructure, // 新構造を使用するかどうかを伝える
      });
    } catch (error) {
      console.error('音声処理のリクエストに失敗しました:', error);
      // エラーが発生しても、アップロード自体は成功しているのでスローしない
      // 代わりにレッスンのステータスを更新
      const errorData = {
        status: 'error',
        error: '音声処理の開始に失敗しました',
      };
      
      await updateDoc(doc(db, `users/${userId}/lessons`, lessonId), errorData);
    }
  }

  /**
   * 直近の期間内のレッスンを取得する
   * @param userId ユーザーID
   * @param months 取得する期間（月数）
   * @returns レッスン一覧
   */
  async getRecentLessons(userId: string, months: number = 3): Promise<Lesson[]> {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);
      
      return this.getRecentLessonsNewStructure(userId, startDate);
    } catch (error) {
      console.error(`最近${months}ヶ月のレッスン取得に失敗しました:`, error);
      throw error;
    }
  }
  
  /**
   * 新構造での直近レッスン取得
   * @param userId ユーザーID
   * @param startDate 開始日
   * @returns レッスン一覧
   */
  async getRecentLessonsNewStructure(userId: string, startDate: Date): Promise<Lesson[]> {
    const lessonsRef = collection(db, `users/${userId}/lessons`);
    const lessonsQuery = query(
      lessonsRef,
      where('created_at', '>=', startDate),
      orderBy('created_at', 'desc')
    );
    
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    return lessonsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Lesson[];
  }
}

// シングルトンインスタンスをエクスポート
export const lessonService = new LessonService();

// インスタンスのメソッドを直接エクスポート
export const setUseNewStructure = (useNew: boolean): void => {
  lessonService.setUseNewStructure(useNew);
};
