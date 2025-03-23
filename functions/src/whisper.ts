/**
 * Whisper API連携モジュール
 * 
 * OpenAI Whisper APIを使用して音声ファイルの文字起こしを行います
 */

import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import * as functions from 'firebase-functions/v1';
import { openaiApiKey } from './config';

// タイムアウト設定
const API_TIMEOUT_MS = 180000; // 3分

/**
 * Whisper APIを使用して単一の音声ファイルを文字起こし
 * @param audioFilePath 文字起こし対象の音声ファイルパス
 * @returns 文字起こしテキスト
 */
export async function transcribeAudioWithWhisper(audioFilePath: string): Promise<string> {
  // APIキーを取得
  const apiKey = process.env.OPENAI_API_KEY || openaiApiKey.value();
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません');
  }

  console.log(`Whisper APIでの文字起こし開始: ${audioFilePath}`);
  
  // ファイルが存在することを確認
  if (!fs.existsSync(audioFilePath)) {
    throw new Error(`ファイルが存在しません: ${audioFilePath}`);
  }
  
  // FormDataを作成
  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioFilePath));
  formData.append('model', 'whisper-1');
  formData.append('language', 'ja');
  formData.append('response_format', 'text');
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        timeout: API_TIMEOUT_MS
      }
    );
    
    console.log(`Whisper API文字起こし完了: ${audioFilePath} (${response.data.length}文字)`);
    return response.data;
  } catch (error: any) {
    // エラー情報の詳細ログ
    console.error(`Whisper API呼び出しエラー:`, error);
    
    if (error.response) {
      console.error(`APIエラーステータス: ${error.response.status}`);
      console.error(`APIエラーデータ:`, error.response.data);
    }
    
    // エラー内容に基づいたメッセージ
    let errorMessage = 'Whisper APIでの文字起こしに失敗しました';
    
    if (error.response && error.response.status === 413) {
      errorMessage = 'ファイルサイズが大きすぎます。ファイルを分割してください';
    } else if (error.code === 'ECONNABORTED') {
      errorMessage = 'APIリクエストがタイムアウトしました';
    } else if (error.message) {
      errorMessage = `文字起こしエラー: ${error.message}`;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * 複数の音声チャンクを順次文字起こしして結合
 * @param chunkPaths 音声チャンクファイルのパス配列
 * @param progressCallback 処理進捗通知コールバック
 * @returns 結合された文字起こしテキスト
 */
export async function transcribeAudioChunks(
  chunkPaths: string[],
  progressCallback?: (progress: number, current: number, total: number) => Promise<void>
): Promise<string> {
  if (chunkPaths.length === 0) {
    throw new Error('文字起こすべき音声チャンクがありません');
  }
  
  console.log(`${chunkPaths.length}チャンクの文字起こしを開始`);
  
  const transcriptions: string[] = [];
  
  for (let i = 0; i < chunkPaths.length; i++) {
    const chunkPath = chunkPaths[i];
    console.log(`チャンク ${i+1}/${chunkPaths.length} の文字起こしを開始`);
    
    try {
      // Whisper APIを呼び出して文字起こし
      const chunkTranscription = await transcribeAudioWithWhisper(chunkPath);
      transcriptions.push(chunkTranscription);
      
      console.log(`チャンク ${i+1}/${chunkPaths.length} の文字起こし完了: ${chunkTranscription.length}文字`);
      
      // 進捗コールバックがあれば呼び出す
      if (progressCallback) {
        const progress = (i + 1) / chunkPaths.length;
        await progressCallback(progress, i + 1, chunkPaths.length);
      }
    } catch (error) {
      console.error(`チャンク ${i+1}/${chunkPaths.length} の文字起こし中にエラーが発生:`, error);
      throw error;
    }
  }
  
  // すべての文字起こし結果を結合（重複を考慮）
  const fullTranscription = combineTranscriptions(transcriptions);
  console.log(`文字起こし完了: 合計 ${fullTranscription.length}文字`);
  
  return fullTranscription;
}

/**
 * 文字起こし結果を結合する関数（チャンク間の重複部分を考慮）
 * @param transcriptions 文字起こし結果の配列
 * @returns 重複を除去して結合したテキスト
 */
export function combineTranscriptions(transcriptions: string[]): string {
  if (transcriptions.length === 0) return '';
  if (transcriptions.length === 1) return transcriptions[0];
  
  // 結合（重複を考慮）
  let result = transcriptions[0];
  
  for (let i = 1; i < transcriptions.length; i++) {
    // 前後の重複を検出して結合
    const prevText = result.slice(-200);
    const currText = transcriptions[i].slice(0, 200);
    
    // 重複部分を見つける
    const overlapLength = findOverlap(prevText, currText);
    
    // 重複を除いて追加
    result += transcriptions[i].slice(overlapLength);
  }
  
  return result;
}

/**
 * 二つの文字列間の重複部分の長さを見つける
 * @param str1 前の文字列
 * @param str2 後の文字列
 * @returns 重複する文字数
 */
function findOverlap(str1: string, str2: string): number {
  let maxOverlap = 0;
  
  // 最大200文字までの重複部分をチェック
  const maxLength = Math.min(str1.length, str2.length, 200);
  
  for (let i = 1; i <= maxLength; i++) {
    if (str1.slice(-i) === str2.slice(0, i)) {
      maxOverlap = i;
    }
  }
  
  console.log(`文字重複検出: ${maxOverlap}文字の重複を検出`);
  return maxOverlap;
} 