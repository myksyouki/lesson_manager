/**
 * AI処理サービス
 * Whisper文字起こし、Difyサマリー生成、Geminiタグ生成を担当
 */

import * as admin from 'firebase-admin';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';
import { Storage } from '@google-cloud/storage';
import { transcribeAudioWithWhisper, transcribeAudioChunks } from './whisper';
import { generateSummaryWithDify } from './dify-client';
import { geminiApiKey } from './config';

// ファイル操作のPromiseベースAPI
const fsPromises = fs.promises;

// チャンクサイズ設定
const CHUNK_DURATION = 600;  // 10分 = 600秒
const CHUNK_OVERLAP = 20;    // 20秒オーバーラップ

/**
 * 音声ファイルを分割
 * @param audioUrl 音声ファイルURL
 * @param lessonId レッスンID
 * @param tmpDir 一時ディレクトリパス
 * @return 分割されたオーディオファイルのパスの配列
 */
export const splitAudioFile = async (
  audioUrl: string,
  lessonId: string,
  tmpDir?: string
): Promise<{
  chunkPaths: string[],
  duration: number,
  sizeInMB: number
}> => {
  // 一時ディレクトリの準備
  const workDir = tmpDir || path.join(os.tmpdir(), `audio-process-${lessonId}-${Date.now()}`);
  await fsPromises.mkdir(workDir, { recursive: true });
  
  try {
    // 音声ファイルをダウンロード
    const tempAudioPath = path.join(workDir, 'input.mp3');
    await downloadFileFromUrl(audioUrl, tempAudioPath);
    
    // 音声ファイルの情報を取得
    const { duration, sizeInMB } = await getAudioInfo(tempAudioPath);
    console.log(`音声情報: ${duration}秒, ${sizeInMB}MB`);
    
    // 短い音声の場合は分割せずにそのまま返す
    if (duration <= CHUNK_DURATION) {
      return {
        chunkPaths: [tempAudioPath],
        duration,
        sizeInMB
      };
    }
    
    // チャンク数を計算（オーバーラップあり）
    const effectiveChunkDuration = CHUNK_DURATION - CHUNK_OVERLAP;
    const numChunks = Math.ceil(duration / effectiveChunkDuration);
    
    console.log(`音声分割: ${duration}秒を${numChunks}チャンクに分割`);
    
    // チャンク出力先ディレクトリ
    const chunksDir = path.join(workDir, 'chunks');
    await fsPromises.mkdir(chunksDir, { recursive: true });
    
    // チャンク分割処理
    const chunkPaths: string[] = [];
    
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * effectiveChunkDuration;
      const chunkPath = path.join(chunksDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
      chunkPaths.push(chunkPath);
      
      // FFmpegでチャンクを切り出し
      await new Promise<void>((resolve, reject) => {
        ffmpeg(tempAudioPath)
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
    }
    
    return {
      chunkPaths,
      duration,
      sizeInMB
    };
  } catch (error) {
    console.error('音声分割エラー:', error);
    throw error;
  }
};

/**
 * Whisper APIで文字起こしを行う
 * @param audioChunks 音声チャンクのパス配列
 * @param progressCallback 進捗コールバック関数（オプション）
 * @return 文字起こしテキスト
 */
export const transcribeWithWhisper = async (
  audioChunks: string[], 
  progressCallback?: (progress: number) => Promise<void>
): Promise<string> => {
  console.log(`Whisper文字起こし開始: ${audioChunks.length}チャンク`);
  
  if (audioChunks.length === 1) {
    // 単一ファイルの場合は直接文字起こし
    const transcription = await transcribeAudioWithWhisper(audioChunks[0]);
    
    if (progressCallback) {
      await progressCallback(100);
    }
    
    return transcription;
  } else {
    // 複数チャンクを順次処理
    const transcription = await transcribeAudioChunks(
      audioChunks,
      async (progress, current, total) => {
        if (progressCallback) {
          const normalizedProgress = Math.floor((current / total) * 100);
          await progressCallback(normalizedProgress);
        }
      }
    );
    
    // transcribeAudioChunksはすでに結合された文字起こし結果(string)を返す
    return transcription;
  }
};

/**
 * Dify APIでサマリーを生成
 * @param transcription 文字起こしテキスト
 * @param lessonId レッスンID
 * @param instrument 楽器名
 * @param aiInstructions カスタムAI指示
 * @return サマリーテキスト
 */
export const generateSummaryWithDifyService = async (
  transcription: string,
  lessonId: string,
  instrument: string,
  aiInstructions?: string
): Promise<string> => {
  console.log(`Difyサマリー生成開始: lessonId=${lessonId}, instrument=${instrument}`);
  
  try {
    const summary = await generateSummaryWithDify(
      transcription,
      instrument,
      lessonId,
      [], // pieces配列（現在は空）
      aiInstructions
    );
    
    return summary.summary;
  } catch (error) {
    console.error('Difyサマリー生成エラー:', error);
    throw error;
  }
};

/**
 * Geminiでタグを生成
 * @param summary サマリーテキスト
 * @param instrument 楽器名
 * @return タグの配列
 */
export const generateTagsWithGemini = async (
  summary: string,
  instrument: string
): Promise<string[]> => {
  try {
    console.log(`Geminiタグ生成開始: 楽器=${instrument}`);
    
    // gemini.tsのgenerateTags関数を使用
    const { generateTags } = require('./gemini');
    
    const result = await generateTags(summary, instrument);
    
    if (result.success && result.tags.length > 0) {
      // 最大3つのタグを返す
      return result.tags.slice(0, 3);
    }
    
    // タグが生成できなかった場合はデフォルトタグを返す
    return [instrument, 'lesson', 'music'];
  } catch (error) {
    console.error('Geminiタグ生成エラー:', error);
    // エラー時はデフォルトタグを返す
    return [instrument, 'lesson', 'music'];
  }
};

/**
 * Secret Managerからシークレット値を取得
 * @param secretName シークレット名
 * @return シークレット値
 */
export const getSecretValue = async (secretName: string): Promise<string> => {
  const client = new SecretManagerServiceClient();
  const name = `projects/lesson-manager-99ab9/secrets/${secretName}/versions/latest`;
  
  try {
    const [version] = await client.accessSecretVersion({ name });
    return version.payload?.data?.toString() || '';
  } catch (error) {
    console.error(`シークレット取得エラー (${secretName}):`, error);
    // 環境変数からのフォールバック
    return process.env[secretName.toUpperCase()] || '';
  }
};

/**
 * URLから音声ファイルをダウンロード
 * @param url ダウンロードURL
 * @param destination 保存先パス
 */
async function downloadFileFromUrl(url: string, destination: string): Promise<void> {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream'
  });

  const writer = fs.createWriteStream(destination);
  
  response.data.pipe(writer);
  
  return new Promise<void>((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

/**
 * 音声ファイルの情報を取得
 * @param filepath 音声ファイルパス
 * @return 音声ファイル情報（長さ、サイズ）
 */
async function getAudioInfo(filepath: string): Promise<{ duration: number; sizeInMB: number }> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const stats = fs.statSync(filepath);
      const fileSizeInBytes = stats.size;
      const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
      
      resolve({
        duration: metadata.format.duration || 0,
        sizeInMB: fileSizeInMB
      });
    });
  });
} 