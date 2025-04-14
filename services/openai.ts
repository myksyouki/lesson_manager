import OpenAI from 'openai';
import { db } from '../config/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

// 注意: クライアントサイドではOpenAI APIキーを使用しません
// OpenAI APIキーはFirebase Functions側で安全に管理されます

// Firebase Functionsを呼び出して音声ファイルを処理する
export const processAudioWithFirebaseFunctions = async (lessonId: string, audioPath: string) => {
  try {
    // ステータスを処理中に更新
    await updateLessonStatus(lessonId, 'processing');
    
    // Firebase Functionsを呼び出す（v2 API版）
    const processAudio = httpsCallable(functions, 'processAudio');
    const result = await processAudio({
      lessonId,
      filePath: audioPath,
      userId: 'current-user-id', // 実際のユーザーIDに置き換える
    });
    
    console.log('Firebase Functions処理結果:', result.data);
    
    return { success: true };
  } catch (error) {
    console.error('Firebase Functions呼び出しエラー:', error);
    await updateLessonStatus(lessonId, 'error', '処理に失敗しました');
    return { success: false, error };
  }
};

// レッスンの処理状態を確認する
export const checkLessonProcessingStatus = async (lessonId: string) => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef);
    
    if (!lessonDoc.exists()) {
      return { success: false, error: 'レッスンが見つかりません' };
    }
    
    const lessonData = lessonDoc.data();
    return { 
      success: true, 
      status: lessonData.status,
      transcription: lessonData.transcription || null,
      summary: lessonData.summary || null,
      tags: lessonData.tags || [],
      error: lessonData.error_message || null
    };
  } catch (error) {
    console.error('レッスン状態確認エラー:', error);
    return { success: false, error };
  }
};

// レッスンのステータスを更新する
const updateLessonStatus = async (lessonId: string, status: string, errorMessage?: string) => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('レッスンステータス更新エラー:', error);
    return { success: false, error };
  }
};
