import { uploadAudioFile } from './storage';
import { useLessonStore } from '../store/lessons';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";

// Process audio file: upload, transcribe, summarize, and save to Firestore
export const processAudioFile = async (
  lessonId: string, 
  fileUri: string, 
  fileName: string,
  processingId: string
): Promise<{ success: boolean; lessonId: string; transcription?: string; summary?: string; tags?: string[]; error?: any }> => {
  try {
    console.log(`音声処理開始: レッスンID=${lessonId}, 処理ID=${processingId || 'なし'}`);
    
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    // Get the lesson document reference
    const lessonRef = doc(db, "lessons", lessonId);

    // Update the lesson status to 'processing'
    await updateDoc(lessonRef, {
      status: 'processing',
      audioPath: `audio/${auth.currentUser?.uid}/${fileName}`,
      processingId: processingId,
    });

    // Upload the audio file to Firebase Storage
    const uploadResult = await uploadAudioFile(fileUri, fileName);

    if (!uploadResult.success) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    // Storage Triggerが自動的に処理を行うため、APIエンドポイントの呼び出しは不要
    console.log(`音声ファイルをアップロードしました。Storage Triggerが処理を開始します。`);
    
    // レッスンのステータスを更新して、処理中であることを示す
    await updateDoc(lessonRef, {
      status: 'processing',
      message: 'Storage Triggerによる処理を待機中...',
    });
    
    return { 
      success: true, 
      lessonId: lessonId,
    };
  } catch (error) {
    console.error('音声処理エラー:', error);
    
    try {
      // エラーが発生した場合はステータスを更新
      await updateLessonStatus(
        lessonId, 
        'error', 
        error instanceof Error ? error.message : '不明なエラー'
      );
    } catch (updateError) {
      console.error('エラーステータス更新失敗:', updateError);
    }
    
    return { 
      success: false, 
      lessonId,
      error
    };
  }
};

// Update lesson with transcription and summary in Firestore
const updateLessonWithAIResults = async (
  lessonId: string, 
  transcription: string, 
  summary: string, 
  tags: string[],
  processingId?: string
) => {
  try {
    const lessonRef = doc(db, "lessons", lessonId);
    await updateDoc(lessonRef, {
      transcription,
      summary,
      tags,
      status: 'completed',
      updated_at: serverTimestamp(),
      ...(processingId ? { processingId } : {}),
    });

    // Update local store
    const { lessons, setLessons } = useLessonStore.getState();
    const updatedLessons = lessons.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          transcription,
          summary,
          tags,
          status: 'completed',
          ...(processingId ? { processingId } : {}),
        };
      }
      return lesson;
    });
    
    setLessons(updatedLessons);
    
    return { success: true };
  } catch (error) {
    console.error('レッスン更新エラー:', error);
    return { success: false, error };
  }
};

// Update lesson status (e.g., to 'error' if processing fails)
const updateLessonStatus = async (
  lessonId: string, 
  status: string, 
  errorMessage: string | null = null
) => {
  try {
    const lessonRef = doc(db, "lessons", lessonId);
    const updateData: any = {
      status,
      updated_at: serverTimestamp(),
    };
    
    if (errorMessage) {
      updateData.error = errorMessage;
    }
    
    await updateDoc(lessonRef, updateData);
    
    // Update local store
    const { lessons, setLessons } = useLessonStore.getState();
    const updatedLessons = lessons.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          status,
          error: errorMessage || undefined,
        };
      }
      return lesson;
    });
    
    setLessons(updatedLessons);
    
    return { success: true };
  } catch (error) {
    console.error('レッスンステータス更新エラー:', error);
    return { success: false, error };
  }
};

// 録音ファイルを処理する関数
export const processRecordingFile = async (recordingUri: string): Promise<{ success: boolean; lessonId?: string; error?: any }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    // Generate a unique processing ID
    const processingId = `recording_${user.uid}_${Date.now()}`;
    
    // Create a new lesson document for this recording
    const lessonRef = await addDoc(collection(db, 'lessons'), {
      teacher: 'レコーダーから',
      date: new Date().toLocaleDateString('ja-JP'),
      user_id: user.uid,
      status: 'uploading',
      created_at: serverTimestamp(),
      processingId: processingId, // Add processing ID
    });

    // Process the audio file
    const fileName = `lesson_${new Date().getTime()}.m4a`;
    const result = await processAudioFile(lessonRef.id, recordingUri, fileName, processingId);
    return { 
      success: result.success, 
      lessonId: lessonRef.id,
      error: result.error
    };
  } catch (error) {
    console.error('録音処理エラー:', error);
    return { success: false, error };
  }
};