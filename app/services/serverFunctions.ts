import { db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/**
 * Firebase Functionsを使用して音声ファイルの処理を行うサービス
 * このファイルでは、OpenAI APIは直接呼び出さず、Firebase Functions側で処理します
 */

// Firebase Functionsを呼び出して音声ファイルを処理する
export const processAudioServerSide = async (lessonId: string, audioPath: string) => {
  try {
    // Update lesson status to processing
    await updateLessonStatus(lessonId, 'processing');
    
    // Firebase Functionsを呼び出す（v2 API版）
    const processAudio = httpsCallable(functions, 'processAudioV3FuncV2');
    const result = await processAudio({
      filePath: audioPath,
      userId: 'current-user-id', // 実際のユーザーIDに置き換える必要があります
      lessonId: lessonId
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

// Update lesson with transcription, summary, and tags in Firestore
const updateLessonWithAIResults = async (lessonId: string, transcription: string, summary: string, tags: string[]) => {
  try {
    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, {
      transcription,
      summary,
      tags,
      status: 'completed',
      updated_at: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating lesson with AI results:', error);
    return { success: false, error };
  }
};

// Update lesson status (e.g., "processing", "error")
const updateLessonStatus = async (lessonId: string, status: string, errorMessage?: string) => {
  try {
    const updateData: any = {
      status,
      updated_at: serverTimestamp(),
    };

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const lessonRef = doc(db, 'lessons', lessonId);
    await updateDoc(lessonRef, updateData);

    return { success: true };
  } catch (error) {
    console.error('Error updating lesson status:', error);
    return { success: false, error };
  }
};

// Create a webhook handler for Firebase Storage events
// This would be implemented as a Firebase Cloud Function in production
export const handleStorageWebhook = async (event: any) => {
  try {
    // Firebase Storage event format:
    // {
    //   "bucket": "lesson-manager.appspot.com",
    //   "name": "audio/user-id/filename.m4a",
    //   "contentType": "audio/m4a",
    //   "metadata": {
    //     "lesson_id": "lesson-id"
    //   }
    // }

    const audioPath = event.name;
    const lessonId = event.metadata?.lesson_id;

    if (!lessonId) {
      return { success: false, error: 'No lesson ID in metadata' };
    }

    // Process the audio file
    return await processAudioServerSide(lessonId, audioPath);
  } catch (error) {
    console.error('Error in handleStorageWebhook:', error);
    return { success: false, error };
  }
};