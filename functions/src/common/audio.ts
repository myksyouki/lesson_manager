/**
 * 音声ファイル処理のユーティリティ
 */

import * as admin from "firebase-admin";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import * as logger from "firebase-functions/logger";
import {createError, ErrorType} from "./errors";
import {
  MAX_CHUNK_SIZE_MB,
} from "../config";

// Firebase Storageのファイルパスパターン
const FIREBASE_STORAGE_URL_REGEX = /^gs:\/\/([^\/]+)\/(.+)$/;

/**
 * 音声分割結果の型定義
 */
export interface SplitAudioResult {
  originalFile: string;
  outputFiles: string[];
  totalDuration: number;
  fileCount: number;
}

/**
 * URLからファイル拡張子を推測
 */
export function guessFileExtension(url: string): string {
  // URLからファイル名を抽出
  try {
    let fileName = "";

    if (url.startsWith("gs://")) {
      // Firebase Storage URLの場合
      fileName = path.basename(url);
    } else {
      // HTTP(S) URLの場合
      const urlObj = new URL(url);
      fileName = path.basename(urlObj.pathname);
    }

    // 拡張子を抽出
    const ext = path.extname(fileName);
    if (ext) {
      return ext;
    }

    // Content-Typeから拡張子を推測
    if (url.includes("audio/mp3") || url.includes("audio/mpeg")) {
      return ".mp3";
    } else if (url.includes("audio/wav") || url.includes("audio/x-wav")) {
      return ".wav";
    } else if (url.includes("audio/ogg")) {
      return ".ogg";
    } else if (url.includes("audio/m4a") || url.includes("audio/x-m4a")) {
      return ".m4a";
    }

    // デフォルト拡張子
    return ".mp3";
  } catch (error) {
    logger.warn("ファイル拡張子の推測に失敗:", error);
    return ".mp3"; // デフォルト拡張子
  }
}

/**
 * FirebaseストレージURLをパースしてパスとバケットを抽出
 */
export function tryParseFirebaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    // FirebaseストレージのURLパターンをチェック
    // 例: https://firebasestorage.googleapis.com/v0/b/bucket-name.appspot.com/o/path%2Fto%2Ffile.mp3?alt=media&token=...
    const regex = /firebasestorage\.googleapis\.com\/v0\/b\/([^\/]+)\/o\/([^?]+)/;
    const match = url.match(regex);

    if (match && match.length >= 3) {
      const bucket = match[1];
      // URLデコードしてパスを取得
      const path = decodeURIComponent(match[2]);
      return {bucket, path};
    }

    return null;
  } catch (error) {
    logger.error("Firebase Storage URLのパースに失敗:", error);
    return null;
  }
}

/**
 * Firebase Storage URLを解析
 */
export function parseFirebaseStorageUrl(url: string): { bucket: string; path: string } | null {
  const match = url.match(FIREBASE_STORAGE_URL_REGEX);
  if (!match) {
    return null;
  }

  return {
    bucket: match[1],
    path: match[2],
  };
}

/**
 * Firebase Storageからファイルをダウンロード
 */
async function downloadFromFirebaseStorage(url: string, destPath: string): Promise<void> {
  try {
    logger.info(`Firebase Storageからファイルをダウンロード: ${url} -> ${destPath}`);

    // 初期化チェック
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }

    // gsのURLをパース
    const parsedUrl = parseFirebaseStorageUrl(url);
    if (!parsedUrl) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        `Invalid Firebase Storage URL: ${url}`
      );
    }

    const {bucket: bucketName, path: storagePath} = parsedUrl;

    // バケット参照
    const bucket = admin.storage().bucket(bucketName);
    
    // ファイルが存在するか確認
    const [exists] = await bucket.file(storagePath).exists();
    if (!exists) {
      throw createError(
        ErrorType.NOT_FOUND,
        `File not found in Firebase Storage: ${storagePath}`,
        {url, bucket: bucketName}
      );
    }

    // ファイルのダウンロード - リトライロジック追加
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        await bucket.file(storagePath).download({
          destination: destPath,
        });
        logger.info(`Firebase Storageからファイルをダウンロードしました: ${destPath} (${attempts}回目の試行で成功)`);
        return; // 成功したら終了
      } catch (err) {
        lastError = err;
        logger.warn(`Firebase Storageダウンロード試行失敗 (${attempts}/${maxAttempts}): ${storagePath}`, err);
        
        if (attempts < maxAttempts) {
          // 次の試行前に少し待機
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    }
    
    // すべての試行が失敗した場合
    throw createError(
      ErrorType.INTERNAL,
      `Failed to download file from Firebase Storage after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
      {url, bucket: bucketName, path: storagePath}
    );
  } catch (error) {
    logger.error(`Firebase Storageダウンロードエラー: ${url}`, error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to download file from Firebase Storage: ${error instanceof Error ? error.message : String(error)}`,
      {url}
    );
  }
}

/**
 * HTTPからファイルをダウンロード
 */
async function downloadFromHttp(url: string, destPath: string): Promise<void> {
  try {
    // ストリームでダウンロード
    const response = await axios({
      method: "GET",
      url: url,
      responseType: "stream",
      timeout: 60000, // 60秒タイムアウト
      headers: {
        "Accept": "audio/*",
        "User-Agent": "LessonManager/1.0",
      },
    });

    // ステータスコードをチェック
    if (response.status !== 200) {
      throw new Error(`HTTPエラー: ${response.status}`);
    }

    // Content-Typeをチェック
    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.startsWith("audio/")) {
      logger.warn(`警告: コンテンツタイプが音声ではありません: ${contentType}`);
    }

    // ファイルに書き込み
    const writer = fs.createWriteStream(destPath);

    return new Promise((resolve, reject) => {
      response.data.pipe(writer);

      let error: Error | null = null;
      writer.on("error", (err) => {
        error = err;
        writer.close();
        reject(err);
      });

      writer.on("close", () => {
        if (!error) {
          logger.info(`ファイルをダウンロードしました: ${destPath}`);
          resolve();
        }
      });
    });
  } catch (error) {
    logger.error(`HTTPダウンロードエラー: ${url}`, error);
    throw createError(
      ErrorType.UNAVAILABLE,
      `ファイルのダウンロードに失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * URLからファイルをダウンロード（FirebaseストレージまたはHTTP）
 */
export async function downloadFileFromUrl(
  url: string,
  destinationDir: string
): Promise<string> {
  try {
    logger.info("ファイルのダウンロードを開始:", url);

    // 一時ディレクトリの存在確認
    if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, {recursive: true});
    }

    // URLの種類を判定
    const isFirebaseStorage = url.startsWith("gs://");
    const isHttpUrl = url.startsWith("http://") || url.startsWith("https://");

    if (!isFirebaseStorage && !isHttpUrl) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "Invalid URL format. Must be a gs:// or http(s):// URL",
        {url}
      );
    }

    // ファイル名の決定
    const fileName = isFirebaseStorage ?
      path.basename(url) :
      `download-${crypto.randomBytes(8).toString("hex")}${guessFileExtension(url)}`;

    const outputPath = path.join(destinationDir, fileName);

    // Firebase Storageからのダウンロード
    if (isFirebaseStorage) {
      await downloadFromFirebaseStorage(url, outputPath);
    } else {
      // HTTP(S)からのダウンロード
      await downloadFromHttp(url, outputPath);
    }

    // ファイルサイズのチェック
    const stats = fs.statSync(outputPath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > MAX_CHUNK_SIZE_MB * 5) { // 最大チャンクサイズの5倍まで許容
      fs.unlinkSync(outputPath);
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        `File size (${fileSizeMB.toFixed(2)}MB) exceeds the maximum allowed size (${MAX_CHUNK_SIZE_MB * 5}MB)`,
        {url, fileSizeMB}
      );
    }

    logger.info(`ファイルをダウンロードしました: ${outputPath} (${fileSizeMB.toFixed(2)}MB)`);
    return outputPath;
  } catch (error) {
    logger.error("ファイルダウンロード中のエラー:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;

      throw createError(
        ErrorType.UNAVAILABLE,
        `Failed to download file: HTTP error ${status} - ${message}`,
        {url, status, message}
      );
    }

    throw error; // 元のエラーを再スロー
  }
}

/**
 * 音声ファイルを分割
 */
export async function splitAudio(
  inputFilePath: string,
  outputDir: string
): Promise<SplitAudioResult> {
  try {
    logger.info(`音声ファイルの分割を開始: ${inputFilePath}`);

    // 入力ファイルと出力ディレクトリのチェック
    if (!fs.existsSync(inputFilePath)) {
      throw createError(
        ErrorType.NOT_FOUND,
        "Input audio file not found",
        {inputFilePath}
      );
    }

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, {recursive: true});
    }

    // ファイル情報を取得
    const fileInfo = await getAudioFileInfo(inputFilePath);
    const {durationSeconds, format} = fileInfo;

    logger.info(`音声情報: ${format}, ${durationSeconds}秒`);

    // 単一チャンクで処理できる場合
    const fileSizeMB = fs.statSync(inputFilePath).size / (1024 * 1024);
    if (fileSizeMB <= MAX_CHUNK_SIZE_MB) {
      logger.info(`ファイルは分割せずに処理: ${fileSizeMB.toFixed(2)}MB <= ${MAX_CHUNK_SIZE_MB}MB`);
      return {
        originalFile: inputFilePath,
        outputFiles: [inputFilePath],
        totalDuration: durationSeconds,
        fileCount: 1,
      };
    }

    // 分割が必要な場合
    const chunkSizeSeconds = Math.floor((MAX_CHUNK_SIZE_MB / fileSizeMB) * durationSeconds);
    const chunkCount = Math.ceil(durationSeconds / chunkSizeSeconds);

    logger.info(`ファイルを${chunkCount}個に分割: ${chunkSizeSeconds}秒 x ${chunkCount} チャンク`);

    const outputFiles: string[] = [];
    const baseFileName = path.basename(inputFilePath, path.extname(inputFilePath));

    // ファイルを分割
    for (let i = 0; i < chunkCount; i++) {
      const startTime = i * chunkSizeSeconds;
      const outputFileName = `${baseFileName}-${(i + 1).toString().padStart(3, "0")}${path.extname(inputFilePath)}`;
      const outputFilePath = path.join(outputDir, outputFileName);

      await new Promise<void>((resolve, reject) => {
        ffmpeg(inputFilePath)
          .setStartTime(startTime)
          .duration(chunkSizeSeconds)
          .output(outputFilePath)
          .on("end", () => {
            outputFiles.push(outputFilePath);
            resolve();
          })
          .on("error", (err: Error) => {
            logger.error(`FFmpeg分割エラー: ${err.message}`);
            reject(createError(
              ErrorType.INTERNAL,
              `Failed to split audio: ${err.message}`,
              {inputFilePath, startTime, chunkSizeSeconds}
            ));
          })
          .run();
      });

      logger.info(`チャンク ${i + 1}/${chunkCount} を生成: ${outputFilePath}`);
    }

    logger.info(`音声分割が完了: ${outputFiles.length}ファイル`);

    return {
      originalFile: inputFilePath,
      outputFiles,
      totalDuration: durationSeconds,
      fileCount: outputFiles.length,
    };
  } catch (error) {
    logger.error("音声分割中のエラー:", error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to split audio: ${error instanceof Error ? error.message : String(error)}`,
      {inputFilePath}
    );
  }
}

/**
 * 音声ファイル情報を取得
 */
interface AudioFileInfo {
  durationSeconds: number;
  format: string;
  codec: string;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
}

async function getAudioFileInfo(filePath: string): Promise<AudioFileInfo> {
  return new Promise<AudioFileInfo>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(createError(
          ErrorType.INTERNAL,
          `Failed to probe audio file: ${err.message}`,
          {filePath}
        ));
        return;
      }

      const audioStream = metadata.streams.find((s) => s.codec_type === "audio");

      if (!audioStream) {
        reject(createError(
          ErrorType.INVALID_ARGUMENT,
          "No audio stream found in file",
          {filePath}
        ));
        return;
      }

      const durationSeconds = metadata.format.duration ?
        parseFloat(metadata.format.duration.toString()) : 0;

      resolve({
        durationSeconds,
        format: metadata.format.format_name || "unknown",
        codec: audioStream.codec_name || "unknown",
        sampleRate: audioStream.sample_rate ? parseInt(audioStream.sample_rate.toString()) : undefined,
        channels: audioStream.channels,
        bitRate: metadata.format.bit_rate ? parseInt(metadata.format.bit_rate.toString()) : undefined,
      });
    });
  });
}
