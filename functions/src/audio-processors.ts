/**
 * 音声処理パイプライン
 * 
 * 1. オーディオ分割
 * 2. Whisper文字起こし
 * 3. 要約およびタグ生成（OpenAI/Gemini）
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

import { transcribeAudioWithWhisper, transcribeAudioChunks } from './whisper';
import { generateSummaryWithKnowledgeBase } from './genkit';
import { generateSummaryWithDify } from './dify-client';

// Promiseベースの関数
const fsPromises = fs.promises;
const storage = new Storage();

// チャンクサイズ設定
const CHUNK_DURATION = 600;  // 10分 = 600秒
const CHUNK_OVERLAP = 20;    // 20秒オーバーラップ

/**
 * 音声ファイルを処理するメイン関数
 * 分割→文字起こし→要約のパイプラインを実行
 */
export async function processAudio(data: any, contextOrRequest?: functions.https.CallableContext | CallableRequest) {
  try {
    const { audioUrl, lessonId, userId, instrumentName } = data;
    
    if (!audioUrl || !lessonId || !userId) {
      throw new Error('必須パラメータが不足しています');
    }
    
    console.log(`音声ファイル処理開始: ${lessonId}`);
    
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
    const tmpDir = path.join(os.tmpdir(), `audio-process-${lessonId}-${Date.now()}`);
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
      
      // 文字起こし処理開始
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
      
      // ---------- ステップ3: 要約とタグ生成 ----------
      
      console.log(`要約とタグの生成開始`);
      await lessonRef.update({
        status: 'summarizing',
        progress: 80,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      try {
        // レッスンデータからレッスン曲情報を取得
        const lessonDoc = await lessonRef.get();
        const lessonData = lessonDoc.data();
        const pieces = lessonData?.pieces || [];
        const aiInstructions = lessonData?.aiInstructions;
        
        console.log(`レッスン曲情報を取得: ${pieces.length}曲`, pieces);
        if (aiInstructions) {
          console.log(`AI指示を取得: ${aiInstructions}`);
        }
        
        // OpenAI/Geminiによる要約とタグの生成
        const { summary, tags } = await generateSummaryWithDify(
          transcription,
          instrumentName || 'general',
          lessonId,
          pieces,
          aiInstructions
        );
        
        console.log(`要約生成成功: summary=${summary.length}文字, tags=${JSON.stringify(tags)}`);
        
        // 処理完了
        await lessonRef.update({
          summary: summary,
          tags: tags,
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
        console.error(`要約生成エラー:`, error);
        
        // エラー状態に更新
        await lessonRef.update({
          error: "要約の生成中にエラーが発生しました。",
          errorDetails: error instanceof Error ? error.message : JSON.stringify(error),
          status: 'processing-error',
          progress: 90,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
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
    console.error(`音声処理エラー:`, error);
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
    
    // チャンク分割処理
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
      
      // 進捗更新（20%〜50%の範囲で分割処理の進捗を表示）
      const chunkProgress = 20 + Math.floor((i + 1) / numChunks * 30);
      await lessonRef.update({ 
        progress: chunkProgress,
        updatedAt: admin.firestore.FieldValue.serverTimestamp() 
      });
    }
    
    // 各チャンクを文字起こし
    console.log(`チャンク分割完了、文字起こし開始: ${chunkPaths.length}チャンク`);
    
    // 進捗コールバック関数
    const updateTranscriptionProgress = async (progress: number, current: number, total: number) => {
      // 50%〜70%の範囲で文字起こし処理の進捗を表示
      const transcriptionProgress = 50 + Math.floor(progress * 20);
      await lessonRef.update({ 
        progress: transcriptionProgress,
        status: `transcribing ${current}/${total}`,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    };
    
    // 文字起こし実行
    const transcription = await transcribeAudioChunks(chunkPaths, updateTranscriptionProgress);
    
    console.log(`全チャンクの文字起こし完了: ${transcription.length}文字`);
    return transcription;
    
  } catch (error) {
    console.error(`長い音声ファイル処理エラー:`, error);
    throw error;
  }
}

/**
 * URLからファイルをダウンロード
 */
async function downloadFileFromUrl(url: string, destination: string): Promise<void> {
  console.log(`ファイルダウンロード: ${url} -> ${destination}`);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000 // 30秒タイムアウト
    });
    
    const writer = fs.createWriteStream(destination);
    
    return new Promise<void>((resolve, reject) => {
      response.data.pipe(writer);
      
      writer.on('finish', () => {
        console.log(`ファイルダウンロード完了: ${destination}`);
        resolve();
      });
      
      writer.on('error', (err: any) => {
        console.error(`ファイル書き込みエラー:`, err);
        reject(err);
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
  return new Promise<{ duration: number; sizeInMB: number }>((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        console.error(`音声情報取得エラー:`, err);
        reject(err);
        return;
      }
      
      const fileSizeInBytes = fs.statSync(filepath).size;
      const sizeInMB = fileSizeInBytes / (1024 * 1024);
      
      resolve({
        duration: metadata.format.duration || 0,
        sizeInMB: sizeInMB
      });
    });
  });
} 