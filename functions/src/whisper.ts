import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { defineString } from 'firebase-functions/params';
import { openaiApiKey } from './index';

// OpenAI API Keyのパラメータ定義
const openaiApiKeyParam = defineString('OPENAI_API_KEY');

// 単一音声ファイルの文字起こし
/**
 * OpenAI Whisper APIを使用した音声文字起こし
 */

/**
 * Whisper APIを使用して音声ファイルを文字起こしする
 * @param audioFilePath 音声ファイルのパス
 * @returns 文字起こしテキスト
 */
export async function transcribeAudioWithWhisper(audioFilePath: string): Promise<string> {
  // APIキーを取得
  const apiKey = process.env.OPENAI_API_KEY || openaiApiKeyParam.value();
  
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません');
  }

  console.log(`Whisper APIを使用して文字起こし開始: ${audioFilePath}`);
  
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
        timeout: 180000 // 3分タイムアウト
      }
    );
    
    console.log(`Whisper APIレスポンス成功: ${audioFilePath}`);
    return response.data;
  } catch (error: any) {
    console.error(`Whisper API呼び出しエラー:`, error);
    
    // エラーレスポンスの詳細をログに出力
    if (error.response) {
      console.error(`APIエラーステータス: ${error.response.status}`);
      console.error(`APIエラーデータ:`, error.response.data);
    }
    
    throw new Error(`文字起こし中にエラーが発生しました: ${error.message}`);
  }
}

// 複数のチャンクを順次処理して結合
/**
 * 複数の音声チャンクを文字起こしする
 * @param chunkPaths 音声チャンクファイルのパス配列
 * @param progressCallback 進捗コールバック関数
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
    console.log(`チャンク ${i+1}/${chunkPaths.length} の文字起こしを開始: ${chunkPath}`);
    
    try {
      // Whisper APIを呼び出して文字起こし
      const chunkTranscription = await transcribeAudioWithWhisper(chunkPath);
      transcriptions.push(chunkTranscription);
      
      console.log(`チャンク ${i+1}/${chunkPaths.length} の文字起こし完了: ${chunkTranscription.length} 文字`);
      
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
  
  // すべての文字起こし結果を結合
  const fullTranscription = transcriptions.join(' ');
  console.log(`文字起こし完了: 合計 ${fullTranscription.length} 文字`);
  
  return fullTranscription;
}

// 文字起こし結果を結合する関数
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

// 重複部分を見つける関数
function findOverlap(str1: string, str2: string): number {
  let maxOverlap = 0;
  
  for (let i = 1; i <= Math.min(str1.length, str2.length); i++) {
    if (str1.slice(-i) === str2.slice(0, i)) {
      maxOverlap = i;
    }
  }
  
  return maxOverlap;
} 