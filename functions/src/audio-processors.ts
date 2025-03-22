/**
 * 音声処理パイプライン
 * 
 * 1. オーディオ分割
 * 2. Whisper文字起こし
 * 3. Dify送信→要約とタグ生成
 */

import { CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

import { transcribeAudioWithWhisper } from './whisper';
import { generateSummaryWithDify } from './dify-client';

// Promiseベースの関数
const fsPromises = fs.promises;
const storage = new Storage();

// チャンクサイズ設定（10分 = 600秒）
const CHUNK_DURATION = 600;
const CHUNK_OVERLAP = 20;

/**
 * 音声ファイルを3段階処理（分割→文字起こし→Dify要約）で処理
 * v1とv2のAPIの両方に対応
 */
export async function processAudio(data: any, contextOrRequest?: functions.https.CallableContext | CallableRequest) {
  try {
    const { audioUrl, lessonId, userId, instrumentName } = data;
    
    if (!audioUrl || !lessonId || !userId) {
      throw new Error('必須パラメータが不足しています');
    }
    
    console.log(`音声ファイル処理開始 (V3): ${lessonId}`);
    
    // Firestoreのデータベース参照を取得
    const db = admin.firestore();
    const lessonRef = db.collection('users').doc(userId).collection('lessons').doc(lessonId);
    
    // レッスンの処理状態を更新
    await lessonRef.update({
      status: 'processing',
      processingId: uuidv4(),
      progress: 0,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // ---------- ステップ1: 音声ファイルダウンロードと分割準備 ----------
    
    // 一時ディレクトリを作成
    const tmpDir = path.join(os.tmpdir(), `audio-v3-${lessonId}-${Date.now()}`);
    await fsPromises.mkdir(tmpDir, { recursive: true });
    
    try {
      // 音声ファイルをダウンロード
      const tempAudioPath = path.join(tmpDir, 'input.mp3');
      await downloadFileFromUrl(audioUrl, tempAudioPath);
      
      // 進捗更新
      await lessonRef.update({ 
        status: 'downloading',
        progress: 10,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // 音声ファイルの情報を取得
      const { duration, sizeInMB } = await getAudioInfo(tempAudioPath);
      console.log(`音声情報: ${duration}秒, ${sizeInMB}MB`);
      
      // 進捗状況更新
      await lessonRef.update({
        audioDuration: Math.round(duration),
        audioSize: Math.round(sizeInMB * 100) / 100,
        progress: 15,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'analyzing'
      });
      
      // ---------- ステップ2: 音声分割とWhisper文字起こし ----------
      
      // 音声ファイルが長い場合は分割処理
      let transcription = '';
      await lessonRef.update({ 
        status: 'transcribing',
        progress: 20
      });
      
      if (duration > CHUNK_DURATION) {
        // 長い音声を分割して文字起こし
        console.log(`長い音声ファイルを分割処理: ${duration}秒`);
        transcription = await processLongAudio(tempAudioPath, tmpDir, lessonRef);
      } else {
        // 短い音声は直接文字起こし
        console.log(`短い音声ファイルを直接処理: ${duration}秒`);
        transcription = await transcribeAudioWithWhisper(tempAudioPath);
      }
      
      // 文字起こし完了
      console.log(`文字起こし完了: ${transcription.length}文字`);
      await lessonRef.update({
        transcription: transcription,
        progress: 70,
        status: 'transcribed',
        transcriptionId: crypto.randomBytes(16).toString('hex'),
        transcriptionCompleteTime: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // ---------- ステップ3: Difyで要約とタグ生成 ----------
      
      console.log(`Difyで要約とタグの生成開始`);
      await lessonRef.update({
        status: 'summarizing',
        progress: 80,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Dify API呼び出し前のデバッグログ
      console.log(`[DEBUG] Dify API呼び出し開始: instrumentName=${instrumentName || 'general'}, transcription=${transcription.length}文字`);
      try {
        // Difyによる要約とタグの生成
        const { summary, tags, lessonId: returnedLessonId } = await generateSummaryWithDify(
          transcription,
          instrumentName || 'general',
          lessonId
        );
        
        console.log(`[DEBUG] Dify API呼び出し成功: summary=${summary.length}文字, tags=${JSON.stringify(tags)}, returnedLessonId=${returnedLessonId}`);
        
        // 処理完了
        await lessonRef.update({
          summary: summary,
          tags: tags,
          lessonId: lessonId, // 一貫性のためにオリジナルのlessonIdを使用
          status: 'completed',
          progress: 100,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`音声処理完了: ${lessonId}`);
        return { 
          success: true, 
          lessonId, 
          transcriptionLength: transcription.length,
          summaryLength: summary.length,
          tags
        };
      } catch (error: any) {
        console.error(`[DEBUG] Dify API呼び出しエラー:`, error);
        
        // エラー詳細をログに出力
        if (error.response) {
          console.error(`[DEBUG] Dify APIレスポンスエラー:`, {
            status: error.response.status,
            data: JSON.stringify(error.response.data || {})
          });
        }
        
        // エラー状態に更新するが、完了状態には設定しない
        await lessonRef.update({
          error: "要約の生成中にエラーが発生しました。",
          errorDetails: error instanceof Error ? error.message : JSON.stringify(error),
          status: 'processing-error', // エラー状態を明示
          progress: 90, // 完了ではなく中断状態を示す
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        // エラーを上位に伝播させる
        throw error;
      }
      
    } finally {
      // 一時ファイルの削除
      try {
        await fsPromises.rm(tmpDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.error(`一時ファイル削除エラー: ${cleanupError}`);
      }
    }
    
  } catch (error) {
    console.error(`音声処理エラー (V3):`, error);
    throw new HttpsError(
      'internal',
      '音声処理中にエラーが発生しました',
      error instanceof Error ? error.message : 'unknown error'
    );
  }
}

/**
 * 長い音声ファイルを分割して処理
 */
async function processLongAudio(
  filepath: string, 
  tmpDir: string, 
  lessonRef: admin.firestore.DocumentReference
): Promise<string> {
  try {
    console.log(`長い音声ファイルの分割処理開始: ${filepath}`);
    
    // 音声の長さを取得
    const { duration } = await getAudioInfo(filepath);
    
    // チャンク数を計算（オーバーラップあり）
    const effectiveChunkDuration = CHUNK_DURATION - CHUNK_OVERLAP;
    const numChunks = Math.ceil(duration / effectiveChunkDuration);
    
    console.log(`音声分割: ${duration}秒を${numChunks}チャンクに分割`);
    
    // チャンク出力先ディレクトリ
    const chunksDir = path.join(tmpDir, 'chunks');
    await fsPromises.mkdir(chunksDir, { recursive: true });
    
    // ステップ1: チャンク分割処理
    console.log(`ステップ1: 音声分割開始`);
    const chunkPaths: string[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * effectiveChunkDuration;
      const chunkPath = path.join(chunksDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
      chunkPaths.push(chunkPath);
      
      // FFmpegでチャンクを切り出し
      await new Promise<void>((resolve, reject) => {
        ffmpeg(filepath)
          .setStartTime(startTime)
          .setDuration(CHUNK_DURATION)
          .output(chunkPath)
          .on('end', () => {
            console.log(`チャンク ${i+1}/${numChunks} 作成完了`);
            resolve();
          })
          .on('error', (err) => {
            console.error(`チャンク作成エラー:`, err);
            reject(err);
          })
          .run();
      });
      
      // 進捗更新: 20%→30%
      const progress = 20 + Math.floor((i / numChunks) * 10);
      await lessonRef.update({ progress });
    }
    
    console.log(`ステップ1: 音声分割完了 (${chunkPaths.length}チャンク)`);
    // 分割完了
    await lessonRef.update({
      status: 'chunked',
      progress: 30,
      chunks: chunkPaths.length
    });
    
    // ステップ2: 各チャンクを文字起こし
    console.log(`ステップ2: チャンク文字起こし開始`);
    const transcriptions: string[] = [];
    
    for (let i = 0; i < chunkPaths.length; i++) {
      console.log(`チャンク ${i+1}/${chunkPaths.length} の文字起こし開始`);
      const chunkTranscription = await transcribeAudioWithWhisper(chunkPaths[i]);
      transcriptions.push(chunkTranscription);
      
      // 進捗更新: 30%→70%
      const progress = 30 + Math.floor((i / chunkPaths.length) * 40);
      await lessonRef.update({ 
        progress,
        currentChunk: i + 1,
        totalChunks: chunkPaths.length
      });
    }
    
    console.log(`ステップ2: チャンク文字起こし完了`);
    
    // 結果を結合
    return transcriptions.join('\n');
    
  } catch (error) {
    console.error(`長い音声処理エラー:`, error);
    throw error;
  }
}

/**
 * URLからファイルをダウンロード
 */
async function downloadFileFromUrl(url: string, destination: string): Promise<void> {
  try {
    console.log(`ファイルダウンロード開始: ${url}`);
    
    // ダウンロード用のaxiosを使用
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 60000, // 60秒タイムアウト
    });
    
    // 宛先ディレクトリを作成
    const destDir = path.dirname(destination);
    await fsPromises.mkdir(destDir, { recursive: true });
    
    // ストリームとしてファイルに書き込み
    const writer = fs.createWriteStream(destination);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      
      writer.on('error', (err: Error) => {
        writer.close();
        reject(err);
      });
      
      writer.on('finish', () => {
        resolve();
      });
    });
  } catch (error) {
    console.error(`ファイルダウンロードエラー:`, error);
    throw error;
  }
}

/**
 * 音声ファイルの情報を取得
 */
async function getAudioInfo(filepath: string): Promise<{ duration: number; sizeInMB: number }> {
  try {
    // ファイルサイズを取得
    const stats = await fsPromises.stat(filepath);
    const sizeInMB = stats.size / (1024 * 1024);
    
    // ffmpegで音声の長さを取得
    const duration = await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(filepath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        
        resolve(metadata.format.duration || 0);
      });
    });
    
    return { duration, sizeInMB };
  } catch (error) {
    console.error(`音声情報取得エラー:`, error);
    throw error;
  }
} 