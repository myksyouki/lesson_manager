import { auth, db } from '../config/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// DifyのAPI設定
const DIFY_API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_API_BASE_URL || 'https://api.dify.ai/v1';
const DIFY_STANDARD_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_STANDARD_API_KEY || 'app-lqUus21WWzbWnovfHyGXQWiH';
const DIFY_STANDARD_APP_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_STANDARD_APP_ID || 'aded5d31-163c-47f8-b07e-e381e73cfc64';

// サマリー作成用のDify API設定
const DIFY_SUMMARY_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_SUMMARY_API_KEY || 'app-4Nv36yDVODLohmEyzr7wCMqt';
const DIFY_SUMMARY_APP_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_SUMMARY_APP_ID || 'b5b22025-63e0-484c-9f3c-2b7e7117d083';

// サマリー作成用のレスポンス型
export interface LessonSummaryResponse {
  success: boolean;
  transcription?: string;
  summary?: string;
  tags?: string[];
  error?: string;
  message?: string;
  timestamp?: string;
}

// 楽器ごとのサマリー作成用のプロンプト設定
const INSTRUMENT_PROMPTS: { [key: string]: string } = {
  clarinet: "クラリネットのレッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 音色の特徴\n" +
    "2. タンギングの技術\n" +
    "3. 運指の正確さ\n" +
    "4. 呼吸法\n" +
    "5. 表現力",
  flute: "フルートのレッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 音色の特徴\n" +
    "2. タンギングの技術\n" +
    "3. 運指の正確さ\n" +
    "4. 呼吸法\n" +
    "5. 表現力",
  saxophone: "サックス（アルト/テナー）のレッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 音色の特徴\n" +
    "2. タンギングの技術\n" +
    "3. 運指の正確さ\n" +
    "4. 呼吸法\n" +
    "5. 表現力",
  trumpet: "トランペットのレッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 音色の特徴\n" +
    "2. タンギングの技術\n" +
    "3. 運指の正確さ\n" +
    "4. 呼吸法\n" +
    "5. 表現力",
  trombone: "トロンボーンのレッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 音色の特徴\n" +
    "2. タンギングの技術\n" +
    "3. スライドの操作\n" +
    "4. 呼吸法\n" +
    "5. 表現力",
  standard: "レッスン内容を分析し、以下の点に注意してサマリーを作成してください：\n" +
    "1. 技術的な改善点\n" +
    "2. 音楽的な表現\n" +
    "3. 練習のポイント\n" +
    "4. 課題と目標\n" +
    "5. 全体的な評価"
};

/**
 * Firebase Functionsの疎通確認を行う関数
 * @returns ヘルスチェック結果
 */
export const testFunctionsConnection = async (): Promise<any> => {
  try {
    console.log('Firebase Functionsの疎通確認を開始します');
    
    const functions = getFunctions(undefined, 'asia-northeast1');
    const echoFunction = httpsCallable(functions, 'httpEcho');
    
    console.log('httpEcho関数を呼び出します');
    const result = await echoFunction({ test: true, timestamp: new Date().toISOString() });
    
    console.log('httpEcho関数からの応答:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('Firebase Functions疎通確認エラー:', error);
    console.error('エラー詳細:', {
      name: error.name,
      code: error.code,
      message: error.message,
      details: error.details
    });
    
    throw error;
  }
};

/**
 * シンプルなレッスンサマリー作成関数（テスト用）
 * @param audioFile 音声ファイル（Blobまたはファイル）
 * @param modelType モデルタイプ
 * @param lessonId レッスンID
 * @returns レッスンサマリーレスポンス
 * 
 * 注意：この関数は不要になりました。代わりに processAudioFile 関数を使用してください。
 * 重複アップロードを防ぐため、この関数は無効化されています。
 */
/*
export const createLessonSummary = async (
  audioFile: Blob | File,
  modelType: string,
  lessonId: string
): Promise<LessonSummaryResponse> => {
  try {
    console.log('レッスンサマリー作成開始:', { lessonId, modelType });
    
    const storage = getStorage();
    const userId = auth.currentUser?.uid;
    
    if (!userId) {
      throw new Error('ユーザーが認証されていません');
    }

    if (!audioFile) {
      throw new Error('音声ファイルが提供されていません');
    }

    // Firestoreにレコードを作成/更新
    const lessonRef = doc(db, `users/${userId}/lessons/${lessonId}`);
    
    // ドキュメントを作成/更新
    await setDoc(lessonRef, {
      modelType,
      status: 'uploading',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('レッスンドキュメントを作成/更新しました:', { lessonId });

    // 音声ファイルをStorageにアップロード
    const audioPath = `audio/${userId}/${lessonId}/audio.mp3`;
    const audioRef = ref(storage, audioPath);
    
    console.log('音声ファイルをアップロード中...', { audioPath });
    await uploadBytes(audioRef, audioFile);
    const audioUrl = await getDownloadURL(audioRef);
    console.log('音声ファイルのアップロード完了:', { audioUrl: audioUrl.substring(0, 20) + '...' });
    
    // レッスンのステータスを更新
    await updateDoc(lessonRef, { 
      status: 'processing',
      audioUrl
    });
    
    // 新しいprocessAudio関数を呼び出す
    const functions = getFunctions(undefined, 'asia-northeast1');
    const processAudioFunction = httpsCallable<any, any>(functions, 'processAudio');
    
    // modelTypeから楽器名を抽出 (例: woodwind-clarinet-standard → clarinet)
    let instrumentName = 'standard';
    if (modelType) {
      const parts = modelType.split('-');
      if (parts.length > 1) {
        instrumentName = parts[1];
      }
    }
    
    console.log('processAudio関数を呼び出します', { lessonId, instrumentName, modelType });
    const result = await processAudioFunction({
      lessonId,
      audioUrl,
      userId,
      modelType,
      instrumentName
    });
    
    console.log('processAudio関数からの応答:', result.data);
    
    // 結果を返す
    return {
      success: true,
      summary: (result.data as any).summaryLength ? '要約が生成されました' : '処理中...',
      message: (result.data as any).message || '音声処理が開始されました',
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('レッスンサマリー作成エラー:', error);
    console.error('エラー詳細:', {
      name: error.name,
      code: error.code,
      message: error.message,
      details: error.details
    });
    
    // エラーの場合はFirestoreのステータスを更新
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        const lessonRef = doc(db, `users/${userId}/lessons/${lessonId}`);
        await updateDoc(lessonRef, {
          status: 'error',
          error: error.message,
          updatedAt: new Date()
        });
      }
    } catch (e) {
      console.error('エラー状態の更新に失敗:', e);
    }
    
    return {
      success: false,
      error: error.message || 'サマリー作成中にエラーが発生しました'
    };
  }
};
*/

/**
 * レッスンのステータスを監視する
 * @param lessonId レッスンID
 * @param callback ステータス変更時のコールバック
 * @returns unsubscribe関数
 */
export const watchLessonStatus = (
  lessonId: string,
  callback: (status: string, data?: any) => void
) => {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const lessonRef = doc(db, `users/${userId}/lessons/${lessonId}`);
  
  return onSnapshot(lessonRef, (doc) => {
    const data = doc.data();
    if (data) {
      callback(data.status, data);
    }
  });
}; 