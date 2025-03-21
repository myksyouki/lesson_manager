import * as fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { defineString } from 'firebase-functions/params';

// OpenAI API Keyのパラメータ定義
const openaiApiKey = defineString('OPENAI_API_KEY');

// 単一音声ファイルの文字起こし
/**
 * Whisper APIを使用して音声ファイルを文字起こしする
 * @param audioFilePath 音声ファイルのパス
 * @returns 文字起こし結果
 */
export async function transcribeAudio(audioFilePath: string): Promise<string> {
  // OpenAI APIキーを取得（実行時に取得）
  const apiKey = openaiApiKey.value();
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。firebase functions:config:set openai.api_key="YOUR_KEY"で設定してください。');
  }

  try {
    // ファイルの存在確認
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`ファイルが存在しません: ${audioFilePath}`);
    }

    // ファイルサイズを確認 (Whisper APIの上限は25MB)
    const stats = fs.statSync(audioFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    if (fileSizeInMB > 25) {
      throw new Error(`ファイルサイズが大きすぎます: ${fileSizeInMB.toFixed(2)}MB (上限: 25MB)`);
    }

    console.log(`文字起こし開始: ${audioFilePath} (${fileSizeInMB.toFixed(2)}MB)`);

    // FormDataの準備
    const formData = new FormData();
    formData.append('file', fs.createReadStream(audioFilePath));
    formData.append('model', 'whisper-1');
    formData.append('language', 'ja');
    formData.append('response_format', 'text');

    // Whisper APIにリクエスト
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${apiKey}`,
      },
      maxBodyLength: Infinity,
    });

    console.log(`文字起こし完了: ${audioFilePath}`);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Whisper API エラー:', error.response.status, error.response.data);
      throw new Error(`Whisper API エラー: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    console.error('文字起こしエラー:', error);
    throw error;
  }
}

// 複数のチャンクを順次処理して結合
export async function transcribeAudioChunks(
  chunkPaths: string[],
  progressCallback?: (progress: number, current: number, total: number) => Promise<void>
): Promise<string> {
  const transcriptions: string[] = [];
  const total = chunkPaths.length;

  for (let i = 0; i < total; i++) {
    try {
      console.log(`チャンク ${i + 1}/${total} の文字起こしを開始`);
      const transcription = await transcribeAudio(chunkPaths[i]);
      transcriptions.push(transcription);
      
      // 進捗をコールバックで報告
      if (progressCallback) {
        const progress = (i + 1) / total;
        await progressCallback(progress, i + 1, total);
      }
      
      console.log(`チャンク ${i + 1}/${total} の文字起こし完了`);
    } catch (error) {
      console.error(`チャンク ${i + 1}/${total} の文字起こしエラー:`, error);
      throw error;
    }
  }

  // 文字起こし結果をマージ
  return transcriptions.join(' ');
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