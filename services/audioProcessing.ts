import { uploadAudioFile } from './storage';
import { useLessonStore } from '../store/lessons';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { auth, db, functions } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDoc, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { firebaseApp } from '../config/firebase';

// アップロード中のレッスンIDを追跡して重複処理を防止
const processingLessons = new Map<string, number>();

// 処理結果の型を定義
interface ProcessAudioResult {
  success: boolean;
  lessonId: string;
  lessonUniqId?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
  error?: any;
  errorDetails?: any; // エラー詳細情報用のプロパティを追加
  message?: string; // クライアントへのメッセージ用フィールドを追加
  shouldRedirect: boolean;
}

// Firebase httpsCallableヘルパー関数
export const callCloudFunction = async <T, R>(functionName: string, data: T): Promise<R> => {
  try {
    console.log(`[${new Date().toISOString()}] Cloud Function呼び出し開始:`, {
      functionName,
      data
    });

    const functions = getFunctions(firebaseApp, 'asia-northeast1');
    const callable = httpsCallable(functions, functionName);

    console.log(`[${new Date().toISOString()}] Cloud Function実行中...`);
    const result = await callable(data);
    
    console.log(`[${new Date().toISOString()}] Cloud Function実行完了:`, {
      functionName,
      result: result.data
    });

    return result.data as R;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Cloud Function実行エラー:`, {
      functionName,
      error,
      errorMessage: error instanceof Error ? error.message : '不明なエラー'
    });
    throw error;
  }
};

/**
 * オーディオファイルを処理する
 * Storage Triggerベースの実装に変更
 */
export const processAudioFile = async (
  lessonId: string, 
  fileUri: string, 
  fileName: string,
  instrumentName?: string // 楽器名を追加
): Promise<ProcessAudioResult> => {
  try {
    console.log('オーディオファイル処理開始:', { lessonId, fileUri: fileUri.substring(0, 30) + '...', fileName, instrumentName });

    // ユーザー認証確認
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    const userId = user.uid;
    console.log(`認証済みユーザー: ${userId}`);

    // レッスンデータの取得
    const lessonRef = doc(db, 'users', userId, 'lessons', lessonId);
    const lessonDoc = await getDoc(lessonRef);
    
    if (!lessonDoc.exists()) {
      throw new Error('レッスンが見つかりません');
    }

    // レッスンデータから楽器情報を取得（引数で提供されていない場合）
    const lessonData = lessonDoc.data();
    const instrument = instrumentName || lessonData.instrument || 'standard';
    
    console.log(`レッスン情報: ID=${lessonId}, 楽器=${instrument}`);

    // userPromptの値をログに記録
    console.log(`レッスンのuserPrompt: "${lessonData.userPrompt || ''}"`);

    // ステータスを処理中に更新
    await updateDoc(lessonRef, {
      status: 'uploading',
      instrumentName: instrument, // 楽器情報を追加
      updatedAt: serverTimestamp()
    });

    // Storageにファイルをアップロード
    // 新しいパス形式: audio/{userId}/{lessonId}/{fileName}
    const storagePath = `audio/${userId}/${lessonId}/${fileName}`;
    console.log(`ファイルアップロード先: ${storagePath}`);
    
    // アップロード時にレッスンデータも渡す
    const uploadResult = await uploadAudioFile(fileUri, storagePath, lessonData);

    if (!uploadResult.success) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    console.log(`ファイルアップロード成功: ${uploadResult.url}`);

    // アップロード完了後のステータス更新
    await updateDoc(lessonRef, {
      status: 'processing',
      audioUrl: uploadResult.url,
      userId: userId, // ユーザーIDを明示的に保存
      instrumentName: instrument, // 楽器情報を保存
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      lessonId,
      message: 'ファイルのアップロードが完了しました。Cloud Functionsによる処理を開始します。',
      shouldRedirect: true
    };

  } catch (error: any) {
    console.error('オーディオファイル処理エラー:', error);
    
    // エラー時のステータス更新
    if (auth.currentUser) {
      const lessonRef = doc(db, 'users', auth.currentUser.uid, 'lessons', lessonId);
      await updateDoc(lessonRef, {
        status: 'error',
        error: error.message,
        updatedAt: serverTimestamp()
      });
    }

    return {
      success: false,
      lessonId,
      error: error.message,
      shouldRedirect: false
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

// レッスンのステータスを定期的に監視する関数
const startStatusMonitoring = (lessonId: string, userId: string, fileName: string) => {
  console.log(`レッスン ${lessonId} のステータス監視を開始します`);
  
  // 処理状況の確認をスケジュール（5秒ごと）
  let checkCount = 0;
  const maxChecks = 60; // 最大5分間（60回 × 5秒）監視
  
  const checkInterval = setInterval(async () => {
    try {
      checkCount++;
      
      // レッスンドキュメントを取得
      const lessonRef = doc(db, `users/${userId}/lessons`, lessonId);
      const lessonDoc = await getDoc(lessonRef);
      
      if (!lessonDoc.exists()) {
        console.log(`レッスン ${lessonId} が見つかりません。監視を停止します。`);
        clearInterval(checkInterval);
        return;
      }
      
      const lessonData = lessonDoc.data();
      const status = lessonData.status;
      
      console.log(`レッスン ${lessonId} の現在のステータス: ${status}`);
      
      // 処理が完了した場合（completed または error）
      if (status === 'completed' || status === 'error') {
        console.log(`レッスン ${lessonId} の処理が完了しました。ステータス: ${status}`);
        clearInterval(checkInterval);
        
        // 直接レッスンストアは使用せず、更新完了ログのみ出力
        console.log('処理が完了しました。レッスン一覧を更新してください。');
        
        return;
      }
      
      // queued状態の場合、処理をトリガーするためにHTTPSリクエストを送信
      if (status === 'queued') {
        console.log(`レッスン ${lessonId} が処理キューに登録されています。処理を促します。`);
        
        // レッスンのステータスを更新して手動トリガー
        if (checkCount % 3 === 0) { // 15秒ごとに更新を促す
          await updateDoc(lessonRef, {
            message: `処理キューで待機中...（${checkCount}回目の確認）`,
            updatedAt: new Date()
          });
        }
      }
      
      // 最大チェック回数に達したら監視を終了
      if (checkCount >= maxChecks) {
        console.log(`レッスン ${lessonId} の監視がタイムアウトしました。処理は続行中の可能性があります。`);
        clearInterval(checkInterval);
        
        // ステータスを更新してユーザーに通知
        await updateDoc(lessonRef, {
          message: '処理が長時間完了していません。画面を再読み込みして確認してください。',
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error(`ステータス監視エラー（レッスン ${lessonId}）:`, error);
      
      // エラーが続く場合は監視を停止
      if (checkCount > 10) { // 10回以上エラーが続いたら停止
        clearInterval(checkInterval);
      }
    }
  }, 5000); // 5秒ごとにチェック
};