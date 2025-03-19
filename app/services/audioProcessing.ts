import { uploadAudioFile } from './storage';
import { useLessonStore } from '../store/lessons';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";

// アップロード中のレッスンIDを追跡して重複処理を防止
const processingLessons = new Map<string, number>();

// Process audio file: upload, transcribe, summarize, and save to Firestore
export const processAudioFile = async (
  lessonId: string, 
  fileUri: string, 
  fileName: string,
  processingId: string
): Promise<{ 
  success: boolean; 
  lessonId: string; 
  lessonUniqId?: string;
  transcription?: string; 
  summary?: string; 
  tags?: string[]; 
  error?: any 
}> => {
  try {
    // 同じレッスンIDが処理中かチェック
    if (processingLessons.has(lessonId)) {
      const startTime = processingLessons.get(lessonId);
      const now = Date.now();
      // 5分以内に同じレッスンIDの処理があれば、重複処理と判断してスキップ
      if (startTime && now - startTime < 5 * 60 * 1000) {
        console.log(`レッスン ${lessonId} は既に処理中です（${(now - startTime) / 1000}秒前から）。重複処理を防止します。`);
        return {
          success: true,
          lessonId: lessonId,
        };
      }
    }
    
    // 処理開始をマーク
    processingLessons.set(lessonId, Date.now());
    
    console.log(`音声処理開始: レッスンID=${lessonId}, 処理ID=${processingId || 'なし'}`);
    
    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    // まず同じレッスンIDを持つ他のドキュメントをチェック
    try {
      const lessonsRef = collection(db, `users/${user.uid}/lessons`);
      const q = query(lessonsRef);
      const querySnapshot = await getDocs(q);
      
      let existingLessonCount = 0;
      querySnapshot.forEach((doc) => {
        if (doc.id === lessonId) {
          existingLessonCount++;
        }
      });
      
      console.log(`同じレッスンIDを持つドキュメント数: ${existingLessonCount}`);
      
      if (existingLessonCount > 1) {
        console.warn(`注意: 同じレッスンID ${lessonId} を持つドキュメントが複数見つかりました`);
      }
    } catch (err) {
      console.warn("レッスン重複チェックエラー:", err);
    }

    // まず既存のドキュメントをチェックして一貫性を確保
    try {
      const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const lessonSnapshot = await getDoc(lessonRef);
      
      if (lessonSnapshot.exists()) {
        const lessonData = lessonSnapshot.data();
        
        // ドキュメントからlessonUniqIdを取得（あれば）
        const lessonUniqId = lessonData.lessonUniqId;
        
        // audioFileNameとprocessingIdがあれば、それを使う
        if (lessonData.audioFileName && lessonData.processingId) {
          console.log(`既存のファイル名を使用: ${lessonData.audioFileName}`);
          console.log(`既存の処理IDを使用: ${lessonData.processingId}`);
          
          const uploadResult = await uploadAudioFile(fileUri, lessonData.audioFileName);
          
          if (!uploadResult.success) {
            throw new Error('ファイルのアップロードに失敗しました');
          }
          
          console.log(`音声ファイルをアップロードしました。Storage Triggerが処理を開始します。`);
          
          // 処理完了したら追跡から削除
          processingLessons.delete(lessonId);
          
          return { 
            success: true, 
            lessonId: lessonId,
            lessonUniqId: lessonUniqId
          };
        }
      }
    } catch (checkError) {
      console.warn("既存のレッスンデータ取得中にエラーが発生しました:", checkError);
      // エラーが発生しても続行し、新しいファイル名を生成する
    }

    // ファイル名をlessonUniqIdベースにする（もしあれば）
    let fileNameWithUniqId = `${lessonId}.${fileName.split('.').pop() || 'mp3'}`;
    
    // レッスンデータからlessonUniqIdを取得
    try {
      const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
      const lessonSnapshot = await getDoc(lessonRef);
      
      if (lessonSnapshot.exists()) {
        const lessonData = lessonSnapshot.data();
        if (lessonData.lessonUniqId) {
          // lessonUniqIdがあればそれをファイル名に使用
          const fileExt = fileName.split('.').pop() || 'mp3';
          fileNameWithUniqId = `${lessonData.lessonUniqId}.${fileExt}`;
          console.log(`lessonUniqIdを使用したファイル名: ${fileNameWithUniqId}`);
          
          // このlessonUniqIdで他のドキュメントも検索して重複チェック
          try {
            const uniqIdQuery = query(
              collection(db, `users/${user.uid}/lessons`), 
              where("lessonUniqId", "==", lessonData.lessonUniqId)
            );
            const uniqIdSnapshot = await getDocs(uniqIdQuery);
            
            if (uniqIdSnapshot.size > 1) {
              console.warn(`注意: 同じlessonUniqId ${lessonData.lessonUniqId} を持つドキュメントが複数見つかりました (${uniqIdSnapshot.size}件)`);
              
              // 処理中のもの以外は古いものとしてマーク
              for (const doc of uniqIdSnapshot.docs) {
                if (doc.id !== lessonId) {
                  console.log(`  - 重複ドキュメント: ${doc.id}, ステータス: ${doc.data().status || '不明'}`);
                }
              }
            }
          } catch (dupError) {
            console.warn("lessonUniqId重複チェック中にエラーが発生:", dupError);
          }
        }
      }
    } catch (error) {
      console.warn("lessonUniqIdの取得に失敗しました:", error);
    }
    
    console.log(`生成したファイル名: ${fileNameWithUniqId} (元のファイル名: ${fileName})`);

    // 重要：同じlessonIDを持つ処理中の複数ファイルを避けるため、
    // 同じタイムスタンプを使用
    const uniqueProcessingId = processingId || `lesson_${user.uid}_${Date.now()}`;
    console.log(`使用する処理ID: ${uniqueProcessingId}`);
    
    // ファイルパスを事前に構築して一貫性を確保
    const audioPath = `audio/${user.uid}/${fileNameWithUniqId}`;
    console.log(`設定するaudioPath: ${audioPath}`);

    // Get the lesson document reference
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);

    // Update the lesson status to 'processing'
    await updateDoc(lessonRef, {
      status: 'processing',
      audioPath: audioPath,
      processingId: uniqueProcessingId,
      // ファイル名をドキュメントに保存して追跡しやすくする
      audioFileName: fileNameWithUniqId
    });

    // Upload the audio file to Firebase Storage
    const uploadResult = await uploadAudioFile(fileUri, fileNameWithUniqId);

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
    
    // 処理完了したら追跡から削除
    processingLessons.delete(lessonId);
    
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
    } finally {
      // エラー時も追跡から削除
      processingLessons.delete(lessonId);
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
    // Get the lesson document to get the user ID
    const user = auth.currentUser;
    if (!user) {
      console.error("ユーザーがログインしていません");
      return;
    }

    // Update the lesson document with AI results
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
    await updateDoc(lessonRef, {
      transcription,
      summary,
      tags,
      status: 'completed',
      updated_at: serverTimestamp()
    });

    console.log(`レッスン ${lessonId} にAI結果を更新しました`);
  } catch (error) {
    console.error("AI結果の更新に失敗しました:", error);
    await updateLessonStatus(lessonId, 'error', '音声処理の結果更新に失敗しました');
    throw error;
  }
};

// Update lesson status (e.g., to 'error' if processing fails)
const updateLessonStatus = async (
  lessonId: string, 
  status: string, 
  errorMessage: string | null = null
) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.error("ユーザーがログインしていません");
      return;
    }
    
    // Update the lesson document status
    const lessonRef = doc(db, `users/${user.uid}/lessons`, lessonId);
    
    const updateData: any = {
      status,
      updated_at: serverTimestamp()
    };
    
    if (errorMessage) {
      updateData.error = errorMessage;
    }
    
    await updateDoc(lessonRef, updateData);
    console.log(`レッスン ${lessonId} のステータスを ${status} に更新しました`);
  } catch (error) {
    console.error("レッスンステータスの更新に失敗しました:", error);
  }
};

// 録音ファイルを処理する関数
export const processRecordingFile = async (recordingUri: string): Promise<{ success: boolean; lessonId?: string; error?: any }> => {
  try {
    // Check if user is authenticated
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'ユーザーがログインしていません' };
    }

    // Generate a unique processing ID
    const processingId = `recording_${user.uid}_${Date.now()}`;
    
    // Create a new lesson document for this recording
    const lessonRef = await addDoc(collection(db, `users/${user.uid}/lessons`), {
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
    console.error('録音ファイルの処理中にエラーが発生しました:', error);
    return { success: false, error };
  }
};