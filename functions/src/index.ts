/**
 * レッスンマネージャー Cloud Functions
 * 基本機能
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

// AI処理サービスをインポート
import {
  splitAudioFile,
  transcribeWithWhisper,
  generateSummaryWithDifyService,
  generateTagsWithGemini
} from './ai-services';

// Dify APIクライアントをインポート
import { sendMessageToDify } from './dify-chat-client';

// Firebase初期化（admin.apps.lengthのチェックを追加）
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Hello World関数（動作確認用）
 * シンプルな応答を返す関数
 */
export const helloWorld = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 60,
  memory: '256MiB',
  minInstances: 0,
  maxInstances: 10,
  invoker: 'public',
}, async (request) => {
  console.log('Hello World関数が呼び出されました');
  
  const { data } = request;
  console.log('受信データ:', data);
  
  return {
    message: 'Hello from Firebase Functions!',
    timestamp: new Date().toISOString(),
    receivedData: data
  };
});

/**
 * 基本的なオーディオファイル処理関数
 * ファイルURLを受け取り、ファイルが存在することを確認して情報を返す
 */
export const processAudioBasic = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 300,
  memory: '1GiB',
  minInstances: 0,
  maxInstances: 10,
  invoker: 'public',
}, async (request) => {
  try {
    console.log('processAudioBasic関数が呼び出されました');
    
    const { data } = request;
    console.log('受信データ:', data);
    
    const { audioUrl, lessonId, userId } = data;
    
    if (!audioUrl || !lessonId) {
      console.error('必須パラメータ不足:', { audioUrl: !!audioUrl, lessonId: !!lessonId });
      return {
        success: false,
        error: 'オーディオURLとレッスンIDは必須です'
      };
    }
    
    console.log(`オーディオ処理開始: レッスンID=${lessonId}`);
    
    // Firestoreのデータベース参照を取得
    const db = admin.firestore();
    const actualUserId = userId || request.auth?.uid || 'anonymous';
    
    // レッスンドキュメントの参照を取得
    const lessonRef = db.collection('users').doc(actualUserId).collection('lessons').doc(lessonId);
    
    // レッスンドキュメントを更新
    await lessonRef.update({
      status: 'processing',
      processingStartTime: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // 処理成功として返す（実際の音声処理ロジックは段階的に追加）
    await lessonRef.update({
      status: 'completed',
      processingEndTime: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: 'テスト用のサマリー: 音声ファイルのURLを確認しました。実際の処理はまだ実装されていません。',
      transcription: 'テスト用の文字起こし: これはサンプルテキストです。'
    });
    
    return {
      success: true,
      message: 'オーディオファイルの基本処理が完了しました',
      lessonId,
      timestamp: new Date().toISOString()
    };
    
  } catch (error: any) {
    console.error('オーディオ処理エラー:', error);
    
    return {
      success: false,
      error: error.message || 'オーディオ処理中にエラーが発生しました',
      timestamp: new Date().toISOString()
    };
  }
});

/**
 * 音声処理関数 v2
 * 音声ファイル処理の完全なパイプラインを実行
 * 分割→文字起こし→要約→タグ生成のフローを実行
 */
export const processAudio = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 3600, // 60分
  memory: '8GiB',  // 4GiBから8GiBに変更
  minInstances: 0,
  maxInstances: 50, // 同時処理能力を向上
  invoker: 'public',
}, async (request) => {
  try {
    const { data } = request;
    console.log('音声処理開始: 受信データ', data);
    
    const { audioUrl, lessonId, userId, modelType, instrumentName } = data;
    
    // パラメータ検証
    if (!audioUrl || !lessonId) {
      console.error('必須パラメータ不足:', { audioUrl: !!audioUrl, lessonId: !!lessonId });
      throw new HttpsError('invalid-argument', 'オーディオURLとレッスンIDは必須です');
    }
    
    // 楽器情報を抽出
    // 1. instrumentNameパラメータがあればそれを使用
    // 2. なければmodelTypeから抽出（modelTypeはwoodwind-clarinet-standardなどの形式）
    let instrument = 'standard';
    if (instrumentName) {
      instrument = instrumentName;
    } else if (modelType) {
      const instrumentParts = modelType.split('-');
      if (instrumentParts.length > 1) {
        instrument = instrumentParts[1];
      }
    }
    
    console.log(`音声処理開始: レッスンID=${lessonId}, 楽器=${instrument}`);
    
    // 一時作業ディレクトリを作成
    const tmpDir = path.join(os.tmpdir(), `audio-process-${lessonId}-${Date.now()}`);
    await fs.promises.mkdir(tmpDir, { recursive: true });
    
    try {
      // Firestoreのデータベース参照を取得
      const db = admin.firestore();
      const actualUserId = userId || request.auth?.uid || 'anonymous';
      
      // レッスンドキュメントの参照を取得
      const lessonRef = db.collection('users').doc(actualUserId).collection('lessons').doc(lessonId);
      
      // レッスン処理のステータス更新関数
      const updateLessonStatus = async (status: string, progress: number, additionalData?: Record<string, any>) => {
        await lessonRef.update({
          status,
          progress,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          ...additionalData
        });
      };
      
      // 処理開始ステータスに更新
      await updateLessonStatus('processing', 0, {
        processingStartTime: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // ---------- ステップ1: 音声ファイル分割 ----------
      console.log(`ステップ1: 音声ファイル分割開始`);
      await updateLessonStatus('splitting', 10);
      
      const { chunkPaths, duration, sizeInMB } = await splitAudioFile(audioUrl, lessonId, tmpDir);
      
      console.log(`音声分割完了: ${chunkPaths.length}チャンク, ${duration}秒, ${sizeInMB}MB`);
      await updateLessonStatus('transcribing', 20, {
        audioDuration: Math.round(duration),
        audioSize: Math.round(sizeInMB * 100) / 100
      });
      
      // ---------- ステップ2: Whisper文字起こし ----------
      console.log(`ステップ2: Whisper文字起こし開始`);
      
      const transcription = await transcribeWithWhisper(
        chunkPaths,
        async (progress) => {
          // 文字起こし進捗は20%〜70%の範囲で設定
          const scaledProgress = 20 + Math.floor(progress * 0.5);
          await updateLessonStatus('transcribing', scaledProgress);
        }
      );
      
      console.log(`文字起こし完了: ${transcription.length}文字`);
      await updateLessonStatus('transcribed', 70, {
        transcription: transcription,
        transcriptionCompleteTime: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // ---------- ステップ3: Dify要約生成 ----------
      console.log(`ステップ3: Dify要約生成開始`);
      await updateLessonStatus('summarizing', 80);
      
      // レッスンデータからAI指示を取得
      const lessonDoc = await lessonRef.get();
      const lessonData = lessonDoc.data();
      const aiInstructions = lessonData?.aiInstructions;
      
      if (aiInstructions) {
        console.log(`カスタムAI指示を使用: ${aiInstructions}`);
      }
      
      const summary = await generateSummaryWithDifyService(
        transcription,
        lessonId,
        instrument,
        aiInstructions
      );
      
      console.log(`要約生成完了: ${summary.length}文字`);
      await updateLessonStatus('tagging', 90, {
        summary: summary
      });
      
      // ---------- ステップ4: Geminiタグ生成 ----------
      console.log(`ステップ4: タグ生成開始`);
      
      const tags = await generateTagsWithGemini(summary, instrument);
      
      console.log(`タグ生成完了: ${tags.join(', ')}`);
      
      // ---------- ステップ5: 処理完了 ----------
      // 処理完了ステータスに更新
      await updateLessonStatus('completed', 100, {
        tags: tags,
        processingEndTime: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return {
        success: true,
        lessonId,
        transcriptionLength: transcription.length,
        summaryLength: summary.length,
        tags: tags,
        duration: duration,
        processingTime: Date.now() - new Date(lessonData?.processingStartTime?.toDate() || Date.now()).getTime()
      };
      
    } finally {
      // 一時ファイルの削除
      try {
        await fs.promises.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`一時ファイル削除エラー: ${cleanupError}`);
      }
    }
  } catch (error: any) {
    console.error('音声処理エラー:', error);
    
    // エラーの詳細情報をログに出力
    console.error('エラー詳細:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Firestoreのステータスを更新（可能であれば）
    try {
      if (error.lessonId && error.userId) {
        const db = admin.firestore();
        const lessonRef = db.collection('users').doc(error.userId).collection('lessons').doc(error.lessonId);
        
        await lessonRef.update({
          status: 'error',
          error: error.message,
          errorDetails: error.stack,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (updateError) {
      console.error('エラーステータス更新エラー:', updateError);
    }
    
    // エラーレスポンスを返す
    throw new HttpsError(
      'internal',
      '音声処理中にエラーが発生しました: ' + (error.message || 'unknown error'),
      {
        lessonId: error.lessonId,
        originalError: error.message
      }
    );
  }
});

/**
 * チャットメッセージを送信するCloud Function
 * クライアントからのメッセージをDify APIに送信し、応答を返す
 */
export const sendChatMessage = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 300, // 5分
  memory: '1GiB',
  minInstances: 0,
  maxInstances: 100, // 同時処理能力を向上
  invoker: 'public',
}, async (request) => {
  try {
    // リクエストデータを検証
    const { data } = request;
    const { message, modelType, conversationId, roomId, inputs } = data;
    
    // ユーザー認証を確認
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証されていません');
    }
    
    const userId = request.auth.uid;
    
    // メッセージの存在を確認
    if (!message || typeof message !== 'string') {
      throw new HttpsError('invalid-argument', 'メッセージは必須で文字列である必要があります');
    }
    
    console.log('チャットメッセージ処理開始:', {
      userId,
      messageLength: message.length,
      modelType: modelType || 'standard',
      conversationId: conversationId || 'なし',
      roomId: roomId || 'なし'
    });
    
    // DifyにAPIリクエストを送信
    const response = await sendMessageToDify(
      message,
      userId,
      modelType || 'standard',
      conversationId,
      inputs || {}
    );
    
    console.log('チャットメッセージ処理完了', {
      success: response.success,
      answerLength: response.answer.length,
      conversationId: response.conversationId || 'なし'
    });
    
    // 応答をクライアントに返す
    return {
      success: true,
      answer: response.answer,
      conversationId: response.conversationId,
      metadata: response.metadata
    };
  } catch (error: any) {
    console.error('チャットメッセージ処理エラー:', error);
    
    throw new HttpsError(
      'internal',
      `チャットメッセージの処理中にエラーが発生しました: ${error.message}`,
      { originalError: error.message }
    );
  }
});
