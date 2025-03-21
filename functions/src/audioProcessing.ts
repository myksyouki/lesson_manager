import * as path from 'path';
import * as fs from 'fs-extra';
import ffmpeg from 'fluent-ffmpeg';
import axios from 'axios';

// FFmpegのパスを設定
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

// 音声の長さを取得する関数
export async function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

// ファイルをダウンロードする関数
export async function downloadFile(url: string, destination: string): Promise<void> {
  const response = await axios({
    method: 'GET',
    url: url,
    responseType: 'stream',
  });
  
  const writer = fs.createWriteStream(destination);
  
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on('finish', async () => {
      // ファイルの存在確認を行う
      try {
        const fileExists = await fs.pathExists(destination);
        if (!fileExists) {
          reject(new Error(`ファイルダウンロード後の確認に失敗: ${destination}が存在しません`));
          return;
        }
        
        // ファイルサイズの確認
        const stats = await fs.stat(destination);
        if (stats.size === 0) {
          reject(new Error(`ダウンロードしたファイルのサイズが0です: ${destination}`));
          return;
        }
        
        console.log(`ファイルが正常にダウンロードされました: ${destination} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
    writer.on('error', reject);
  });
}

// 音声を分割する関数
export async function splitAudioFile(
  inputFile: string, 
  outputDir: string, 
  chunkDuration: number = 10 * 60, // 10分
  overlap: number = 5 // 5秒
): Promise<string[]> {
  // 出力ディレクトリを作成
  await fs.ensureDir(outputDir);
  
  // 入力ファイルの存在確認
  const fileExists = await fs.pathExists(inputFile);
  if (!fileExists) {
    throw new Error(`入力ファイルが存在しません: ${inputFile}`);
  }
  
  // ファイルサイズの確認
  const stats = await fs.stat(inputFile);
  if (stats.size === 0) {
    throw new Error(`入力ファイルのサイズが0です: ${inputFile}`);
  }
  
  console.log(`入力ファイル確認OK: ${inputFile} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
  
  // 音声の長さを取得
  const duration = await getAudioDuration(inputFile);
  console.log(`音声の長さ: ${duration}秒`);
  
  // チャンク数を計算
  const chunksCount = Math.ceil(duration / (chunkDuration - overlap));
  const chunkPaths: string[] = [];
  
  // 各チャンクを生成
  for (let i = 0; i < chunksCount; i++) {
    const startTime = Math.max(0, i * (chunkDuration - overlap));
    const chunkDur = Math.min(chunkDuration, duration - startTime);
    
    // チャンクの出力パス
    const chunkPath = path.join(outputDir, `chunk_${i}.mp3`);
    chunkPaths.push(chunkPath);
    
    // FFmpegでチャンクを抽出＆圧縮（Whisper用に最適化）
    try {
      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputFile)
          .seekInput(startTime)
          .duration(chunkDur)
          .outputOptions([
            '-vn',                // 動画を除去
            '-map_metadata', '-1', // メタデータを除去
            '-ac', '1',           // モノラル
            '-ar', '16000',       // サンプルレート16kHz（Whisper推奨）
            '-b:a', '64k'         // ビットレート
          ])
          .on('start', (commandLine) => {
            console.log(`FFmpegコマンド開始: ${commandLine}`);
          })
          .on('end', async () => {
            // チャンクファイルの存在確認
            const chunkExists = await fs.pathExists(chunkPath);
            if (!chunkExists) {
              reject(new Error(`チャンクファイルの生成に失敗: ${chunkPath}`));
              return;
            }
            resolve();
          })
          .on('error', (err: Error) => reject(err))
          .save(chunkPath);
      });
      
      console.log(`チャンク ${i+1}/${chunksCount} 生成完了: ${chunkPath}`);
    } catch (error) {
      console.error(`チャンク ${i+1}/${chunksCount} 生成エラー:`, error);
      throw error;
    }
  }
  
  return chunkPaths;
} 