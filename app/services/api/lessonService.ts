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
   * レッスンデータを取得する
   * @param lessonId レッスンID
   * @returns レッスンデータ
   */
  async getLesson(lessonId: string): Promise<Lesson> {
    try {
      // Firestoreから直接取得
      const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
      
      if (!lessonDoc.exists()) {
        throw new Error('レッスンが見つかりません');
      }
      
      return {
        id: lessonDoc.id,
        ...lessonDoc.data(),
      } as Lesson;
    } catch (error) {
      console.error('レッスンの取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ユーザーのレッスン一覧を取得する
   * @param userId ユーザーID
   * @returns レッスン一覧
   */
  async getUserLessons(userId: string): Promise<Lesson[]> {
    try {
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc')
      );
      
      const lessonsSnapshot = await getDocs(lessonsQuery);
      
      return lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Lesson[];
    } catch (error) {
      console.error('レッスン一覧の取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 新しいレッスンを作成する
   * @param lessonData レッスンデータ
   * @returns 作成されたレッスンのID
   */
  async createLesson(lessonData: Omit<Lesson, 'id'>): Promise<string> {
    try {
      const newLessonRef = doc(collection(db, 'lessons'));
      const processingId = `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      await setDoc(newLessonRef, {
        ...lessonData,
        created_at: new Date(),
        updated_at: new Date(),
        status: 'pending',
        processingId: processingId, // 処理IDを追加
      });
      
      return newLessonRef.id;
    } catch (error) {
      console.error('レッスンの作成に失敗しました:', error);
      throw error;
    }
  }

  /**
   * レッスンを更新する
   * @param lessonId レッスンID
   * @param lessonData 更新するレッスンデータ
   */
  async updateLesson(lessonId: string, lessonData: Partial<Lesson>): Promise<void> {
    try {
      await updateDoc(doc(db, 'lessons', lessonId), {
        ...lessonData,
        updated_at: new Date(),
      });
    } catch (error) {
      console.error('レッスンの更新に失敗しました:', error);
      throw error;
    }
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
      // まずレッスンデータを取得して処理IDを確認
      const lessonDoc = await getDoc(doc(db, 'lessons', lessonId));
      if (!lessonDoc.exists()) {
        throw new Error('レッスンが見つかりません');
      }
      
      const lessonData = lessonDoc.data();
      const processingId = lessonData.processingId || `proc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const storage = getStorage();
      const timestamp = new Date().getTime();
      const fileExtension = 'mp3'; // または適切な拡張子を取得
      const fileName = `${timestamp}_${lessonId.substring(0, 8)}.${fileExtension}`;
      const filePath = `audio/${userId}/${fileName}`;
      const storageRef = ref(storage, filePath);
      
      // ファイルをアップロード
      await uploadBytes(storageRef, audioFile);
      
      // ダウンロードURLを取得
      const downloadURL = await getDownloadURL(storageRef);
      
      // レッスンデータを更新
      await updateDoc(doc(db, 'lessons', lessonId), {
        audioUrl: downloadURL,
        audioPath: filePath,
        status: 'processing',
        updated_at: new Date(),
        processingId: processingId, // 処理IDを確実に設定
      });
      
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
        processingId, // 処理IDを追加
      });
    } catch (error) {
      console.error('音声処理のリクエストに失敗しました:', error);
      // エラーが発生しても、アップロード自体は成功しているのでスローしない
      // 代わりにレッスンのステータスを更新
      await updateDoc(doc(db, 'lessons', lessonId), {
        status: 'error',
        error: '音声処理の開始に失敗しました',
      });
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
      
      const lessonsQuery = query(
        collection(db, 'lessons'),
        where('user_id', '==', userId),
        where('created_at', '>=', startDate),
        orderBy('created_at', 'desc')
      );
      
      const lessonsSnapshot = await getDocs(lessonsQuery);
      
      return lessonsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Lesson[];
    } catch (error) {
      console.error(`最近${months}ヶ月のレッスン取得に失敗しました:`, error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const lessonService = new LessonService();
