import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest, onCall } from 'firebase-functions/v2/https';
import { defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import { createLessonSummary } from './dify';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs-extra';
import { downloadFile, splitAudioFile } from './audioProcessing';
import { transcribeAudioChunks } from './whisper';

// OpenAI API Keyのパラメータ定義
const openaiApiKey = defineString('OPENAI_API_KEY');

// Initialize Firebase Admin
admin.initializeApp();

// ヘルスチェック関数（デバッグ用）
export const healthCheck = onRequest(
  {
    region: 'asia-northeast1',
    cors: true
  },
  (request, response) => {
    // 実行時にAPIキーの存在を確認
    const apiKeyExists = !!openaiApiKey.value();
    
    response.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      openaiConfigExists: apiKeyExists
    });
  }
);

// ファイルパスからユーザーIDを抽出する関数
function extractUserIdFromPath(filePath: string): string | undefined {
  // パターン1: /users/{userId}/... というパス
  const userPathRegex = /\/users\/([^\/]+)\//;
  const userMatch = filePath.match(userPathRegex);
  if (userMatch && userMatch[1]) {
    return userMatch[1];
  }
  
  // パターン2: /{userId}/... というパス
  const directUserRegex = /^\/([^\/]+)\//;
  const directMatch = filePath.match(directUserRegex);
  if (directMatch && directMatch[1] && directMatch[1] !== 'users' && directMatch[1] !== 'audio') {
    return directMatch[1];
  }
  
  // パターン3: audio/{userId}/... というパス
  const audioPathRegex = /audio\/([^\/]+)\//;
  const audioMatch = filePath.match(audioPathRegex);
  if (audioMatch && audioMatch[1]) {
    return audioMatch[1];
  }
  
  return undefined;
}

// 最近作成されたレッスンを検索する関数
async function findRecentLesson(userId: string, fileName: string): Promise<string | null> {
  try {
    console.log(`ユーザー ${userId} の最近のレッスンを検索中...`);
    
    // 過去24時間以内に作成されたレッスンを取得
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const lessonsRef = admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('lessons')
      .where('createdAt', '>', twentyFourHoursAgo)
      .orderBy('createdAt', 'desc')
      .limit(5);
    
    const lessonsSnapshot = await lessonsRef.get();
    
    if (lessonsSnapshot.empty) {
      console.log(`ユーザー ${userId} の最近のレッスンが見つかりませんでした`);
      return null;
    }
    
    // ファイル名から情報抽出（例: piano_lesson_20220215.mp3 からpianoを抽出）
    const fileNameLower = fileName.toLowerCase();
    const possibleInstruments = ['piano', 'guitar', 'drums', 'violin', 'saxophone', 'flute', 'clarinet', 'trumpet'];
    const matchedInstrument = possibleInstruments.find(instrument => fileNameLower.includes(instrument));
    
    // 最新のレッスンから、楽器の一致するものや処理待ちのものを優先
    for (const doc of lessonsSnapshot.docs) {
      const lessonData = doc.data();
      
      // 既に音声が処理中または完了している場合はスキップ
      if (lessonData.audioPath) {
        continue;
      }
      
      // 楽器が一致するか確認
      if (matchedInstrument && lessonData.instrument && 
          lessonData.instrument.toLowerCase().includes(matchedInstrument)) {
        console.log(`一致するレッスンが見つかりました: ${doc.id}`);
        return doc.id;
      }
      
      // ステータスが新規作成(created)のレッスンを見つけた場合
      if (lessonData.status === 'created' || !lessonData.status) {
        console.log(`処理待ちのレッスンが見つかりました: ${doc.id}`);
        return doc.id;
      }
    }
    
    // 特に条件に一致するものが見つからなければ、最新のレッスンを返す
    console.log(`最新のレッスンを使用します: ${lessonsSnapshot.docs[0].id}`);
    return lessonsSnapshot.docs[0].id;
    
  } catch (error) {
    console.error('レッスン検索中にエラーが発生しました:', error);
    return null;
  }
}

// Storageトリガー関数 - オーディオファイルがアップロードされたときに発火 (v2)
export const processAudioFileV2 = onObjectFinalized(
  {
    region: 'asia-northeast1',
    timeoutSeconds: 540, // 9分 (イベントトリガーの制限)
    memory: '4GiB',      // メモリも増加
    maxInstances: 10
  },
  async (event) => {
    // ファイルのチェック
    if (!event.data.name || !event.data.contentType?.includes('audio')) {
      console.log('非音声ファイル、処理をスキップ:', event.data.name);
      return;
    }

    // メタデータからユーザーIDを取得、なければファイルパスから抽出
    let userId = event.data.metadata?.userId;
    if (!userId) {
      // ファイルパスからユーザーIDを抽出
      userId = extractUserIdFromPath(event.data.name);
      if (!userId) {
        console.error(`ユーザーIDが特定できません。ファイルパス: ${event.data.name}`);
        return; // ユーザーIDが特定できなければ処理を中止
      }
      console.log(`ファイルパスからユーザーIDを抽出しました: ${userId}`);
    }

    // メタデータまたはファイルパスからレッスンIDを取得
    let lessonId = event.data.metadata?.lessonId;
    const instrumentName = event.data.metadata?.instrument || 'standard';
    
    // ファイル名を取得
    const fileName = path.basename(event.data.name);
    
    // lessonIdがない場合は、最近作成されたレッスンを検索
    if (!lessonId) {
      console.log(`メタデータにlessonIdがありません。ユーザー ${userId} の最近のレッスンを検索します`);
      const foundLessonId = await findRecentLesson(userId, fileName);
      
      if (foundLessonId) {
        lessonId = foundLessonId;
        console.log(`既存レッスンが見つかりました: ${lessonId}`);
      } else {
        // 見つからなければ新しいIDを生成
        lessonId = `lesson-${Date.now()}`;
        console.log(`既存レッスンが見つからないため、新しいIDを生成しました: ${lessonId}`);
      }
    }

    console.log(`音声処理開始 - ユーザーID: ${userId}, レッスンID: ${lessonId}`);

    // Firestoreのレッスンドキュメントを参照
    const lessonRef = admin.firestore().collection('users').doc(userId).collection('lessons').doc(lessonId);
    
    // レッスンデータを確認
    const lessonDoc = await lessonRef.get();
    if (!lessonDoc.exists) {
      console.log(`ユーザーID: ${userId}, レッスンID: ${lessonId}のドキュメントが存在しません。新規作成します。`);
      await lessonRef.set({
        userId,
        status: 'processing',
        progress: 0,
        instrument: instrumentName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        audioPath: event.data.name
      });
    } else {
      // 既存のレッスンドキュメントを更新
      await lessonRef.update({
        status: 'processing',
        progress: 0,
        audioPath: event.data.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`既存ユーザーID: ${userId}, レッスンID: ${lessonId}のステータスを更新しました`);
    }

    // 元のファイルURLを取得
    const bucket = admin.storage().bucket(event.bucket);
    const [signedUrl] = await bucket.file(event.data.name).getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1時間
    });

    // 一時ディレクトリの準備
    const workingDir = path.join(os.tmpdir(), `audio_${lessonId}`);
    try {
      // 既存のディレクトリがあれば削除
      if (await fs.pathExists(workingDir)) {
        await fs.remove(workingDir);
        console.log(`既存の一時ディレクトリを削除: ${workingDir}`);
      }
      
      // ディレクトリを新規作成
      await fs.ensureDir(workingDir);
      console.log(`一時ディレクトリを作成: ${workingDir}`);
      
      // ディレクトリの読み書き権限を確認
      await fs.access(workingDir, fs.constants.R_OK | fs.constants.W_OK);
    } catch (error) {
      console.error(`一時ディレクトリの作成・権限設定エラー: ${error}`);
      await lessonRef.update({
        status: 'error',
        error: `一時ディレクトリエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      return;
    }
    
    // ファイルのダウンロード
    const tempFilePath = path.join(workingDir, 'input.mp3');
    
    try {
      await downloadFile(signedUrl, tempFilePath);
      console.log('音声ファイルダウンロード完了:', tempFilePath);
      
      // 進捗更新
      await lessonRef.update({
        progress: 10,
        status: 'splitting'
      });
      
      // 音声を分割
      const chunkPaths = await splitAudioFile(tempFilePath, workingDir);
      console.log(`音声を${chunkPaths.length}チャンクに分割完了`);
      
      // 進捗更新
      await lessonRef.update({
        progress: 20,
        status: 'transcribing'
      });
      
      // Whisper APIで文字起こし（進捗更新付き）
      const fullTranscription = await transcribeAudioChunks(
        chunkPaths,
        async (progress, current, total) => {
          // 20%〜70%の範囲で進捗を更新
          const overallProgress = 20 + Math.floor(progress * 0.5);
          await lessonRef.update({
            progress: overallProgress,
            status: `transcribing (${current}/${total})`
          });
        }
      );
      
      // 文字起こしをFirestoreに保存して処理終了
      await lessonRef.update({
        transcription: fullTranscription,
        status: 'transcribed',  // ステータスを 'transcribed' に設定
        progress: 70,           // 進捗を70%に設定
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`ユーザーID: ${userId}, レッスンID: ${lessonId} の文字起こしが完了し、Firestoreに保存しました`);
      
      // ここでサマリー生成処理は行わない
      
    } catch (error) {
      console.error('音声処理中にエラーが発生:', error);
      
      // エラー情報をFirestoreに保存
      await lessonRef.update({
        status: 'error',
        error: error instanceof Error ? error.message : '不明なエラー',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } finally {
      // 一時ファイルの削除
      try {
        await fs.remove(workingDir);
        console.log('一時ファイル削除完了:', workingDir);
      } catch (e) {
        console.error('一時ファイル削除エラー:', e);
      }
    }
  }
);

// Firestoreトリガー関数 - 文字起こしが完了したらサマリーを生成 (v2)
export const generateSummaryFromTranscriptionV2 = onDocumentUpdated(
  {
    region: 'asia-northeast1',
    document: 'users/{userId}/lessons/{lessonId}',
    timeoutSeconds: 540, // 9分
    memory: '1GiB'
  },
  async (event) => {
    // ドキュメントのbefore/afterデータを取得
    if (!event.data) {
      console.log('イベントデータがありません');
      return;
    }
    
    const beforeData = event.data.before?.data();
    const afterData = event.data.after?.data();
    
    // nullチェック
    if (!beforeData || !afterData) {
      console.log('ドキュメントデータが不足しています');
      return;
    }
    
    const userId = event.params?.userId;
    const lessonId = event.params?.lessonId;
    
    if (!userId || !lessonId) {
      console.error('パラメータが不足しています');
      return;
    }
    
    // 文字起こし完了時のみ処理
    if (afterData.status === 'transcribed' && beforeData.status !== 'transcribed' && afterData.transcription) {
      console.log(`レッスンID: ${lessonId} の要約生成を開始します`);
      
      try {
        // ステータス更新
        if (event.data.after && event.data.after.ref) {
          await event.data.after.ref.update({
            status: 'generating_summary',
            progress: 80
          });
          
          // レッスンから楽器情報を取得
          let instrumentName = afterData.instrument || '';
          
          // レッスンにinstrumentがない場合は、ユーザープロファイルから取得
          if (!instrumentName) {
            try {
              const userProfileRef = admin.firestore().collection('users').doc(userId).collection('profile').doc('main');
              const userProfileDoc = await userProfileRef.get();
              
              if (userProfileDoc.exists) {
                const profileData = userProfileDoc.data();
                if (profileData && profileData.selectedInstrument) {
                  instrumentName = profileData.selectedInstrument;
                  console.log(`ユーザープロファイルから楽器情報を取得: ${instrumentName}`);
                  
                  // レッスンドキュメントにinstrumentフィールドを追加
                  await event.data.after.ref.update({
                    instrument: instrumentName
                  });
                }
              }
            } catch (error) {
              console.error('プロファイル取得エラー:', error);
              instrumentName = 'standard'; // エラー時はデフォルト値
            }
          }
          
          // デフォルト値の設定
          if (!instrumentName) {
            instrumentName = 'standard';
          }
          
          console.log(`楽器情報: ${instrumentName} でサマリー生成を実行します`);
          
          // Difyにデータを送信してサマリー生成
          const summaryResult = await createLessonSummary(
            afterData.transcription,
            userId,
            lessonId,
            instrumentName
          );
          
          // 結果をFirestoreに保存
          await event.data.after.ref.update({
            summary: summaryResult.summary,
            tags: summaryResult.tags,
            status: 'completed',
            progress: 100,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`Difyサマリー生成完了: { lessonId: '${lessonId}' }`);
        }
      } catch (error) {
        console.error('サマリー生成エラー:', error);
        if (event.data.after && event.data.after.ref) {
          await event.data.after.ref.update({
            status: 'summary_error',
            error: error instanceof Error ? error.message : '不明なエラー',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
  }
);

// サマリー生成テスト関数（デバッグ用）
export const createLessonSummaryTestV2 = onCall(
  {
    region: 'us-central1',
  },
  async (request) => {
    try {
      const data = request.data;
      const { transcription, userId, lessonId, instrument } = data;

      if (!transcription || !userId || !lessonId) {
        return {
          success: false,
          error: '必須パラメータが不足しています (transcription, userId, lessonId)'
        };
      }

      const instrumentName = instrument || 'standard';
      const result = await createLessonSummary(transcription, userId, lessonId, instrumentName);

      return {
        success: true,
        result
      };
    } catch (error) {
      console.error('サマリーテストエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }
);
