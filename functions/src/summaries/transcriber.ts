/**
 * 音声ファイルの文字起こし処理
 * 
 * OpenAI Whisper APIを使用して音声ファイルをテキストに変換します。
 * 複数の音声ファイルを連続して処理し、結合された文字起こし結果を返します。
 */

// 標準ライブラリ
import * as fs from "fs";
import * as path from "path";

// サードパーティライブラリ
import axios from "axios";
import FormData from "form-data";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

// プロジェクト内のモジュール
import {createError, ErrorType} from "../common/errors";
import {WHISPER_API_ENDPOINT, OPENAI_API_KEY_SECRET, PROJECT_ID} from "../config";

// 定数
const MAX_RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

/**
 * 文字起こし結果の型定義
 */
export interface TranscriptionResult {
  success: boolean;
  text: string;
  error?: string;
}

/**
 * 進捗コールバックの型
 */
export type ProgressCallback = (
  progress: number,
  currentFile: number,
  totalFiles: number
) => Promise<void>;

/**
 * 複数の音声ファイルを文字起こし
 * 
 * @param filePaths 文字起こし対象の音声ファイルパスの配列
 * @param progressCallback 進捗報告用のコールバック関数（オプション）
 * @returns 文字起こし結果
 */
export async function transcribeAudio(
  filePaths: string[],
  progressCallback?: ProgressCallback
): Promise<TranscriptionResult> {
  try {
    logger.info(`${filePaths.length}個のファイルの文字起こしを開始`, {
      fileCount: filePaths.length,
      firstFile: filePaths.length > 0 ? path.basename(filePaths[0]) : "なし",
    });

    // 入力の検証
    validateFilePaths(filePaths);

    // OpenAI APIキーの取得
    const apiKey = await getSecret(OPENAI_API_KEY_SECRET);

    // 全ファイルの文字起こし
    const transcriptions = await processAllFiles(filePaths, apiKey, progressCallback);

    // 文字起こし結果を結合
    const fullText = transcriptions.join("\n\n");
    logger.info("すべてのファイルの文字起こしが完了", {
      totalTextLength: fullText.length,
      fileCount: filePaths.length,
    });

    return {
      success: true,
      text: fullText,
    };
  } catch (error) {
    logger.error("文字起こし処理中のエラー:", error);
    return {
      success: false,
      text: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * ファイルパスの配列を検証
 */
function validateFilePaths(filePaths: string[]): void {
  // 空の配列チェック
  if (!filePaths || filePaths.length === 0) {
    throw createError(
      ErrorType.INVALID_ARGUMENT,
      "ファイルパスが指定されていません"
    );
  }

  // 各ファイルの存在チェック
  for (const filePath of filePaths) {
    if (!fs.existsSync(filePath)) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        `ファイルが見つかりません: ${filePath}`
      );
    }
  }
}

/**
 * すべてのファイルを順番に処理
 */
async function processAllFiles(
  filePaths: string[],
  apiKey: string,
  progressCallback?: ProgressCallback
): Promise<string[]> {
  const transcriptions: string[] = [];

  for (let i = 0; i < filePaths.length; i++) {
    // 進捗コールバック
    if (progressCallback) {
      await progressCallback(
        (i / filePaths.length) * 100,
        i + 1,
        filePaths.length
      );
    }

    // 単一ファイルの文字起こし（リトライロジック付き）
    const text = await transcribeWithRetry(filePaths[i], apiKey);
    transcriptions.push(text);

    logger.info(`ファイル ${i + 1}/${filePaths.length} の文字起こし完了`, {
      fileName: path.basename(filePaths[i]),
      textLength: text.length,
    });
  }

  // 最終進捗コールバック
  if (progressCallback) {
    await progressCallback(100, filePaths.length, filePaths.length);
  }

  return transcriptions;
}

/**
 * リトライロジック付きの単一ファイル文字起こし
 */
async function transcribeWithRetry(filePath: string, apiKey: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
    try {
      return await transcribeSingleFile(filePath, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // リトライ不可能なエラータイプはすぐに失敗
      if (error instanceof Error && 
          (error.message.includes("ファイルサイズが大きすぎます") || 
           error.message.includes("API認証エラー"))) {
        logger.warn(`リトライ不可能なエラーが発生: ${error.message}`);
        throw error;
      }
      
      // 最後の試行でなければリトライ
      if (attempt < MAX_RETRY_COUNT) {
        const delay = RETRY_DELAY_MS * attempt;
        logger.warn(`文字起こし失敗、${delay}ms後に再試行 (${attempt}/${MAX_RETRY_COUNT}): ${path.basename(filePath)}`, 
          {error: lastError.message});
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // すべてのリトライが失敗
  throw lastError || new Error("未知のエラーにより文字起こしに失敗");
}

/**
 * 単一の音声ファイルを文字起こし
 */
async function transcribeSingleFile(
  filePath: string,
  apiKey: string
): Promise<string> {
  try {
    logger.info(`ファイルを文字起こし: ${path.basename(filePath)}`, {
      fileSize: fs.statSync(filePath).size,
    });

    // FormDataを作成
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));
    formData.append("model", "whisper-1");
    formData.append("language", "ja");
    formData.append("response_format", "json");

    // Whisper APIにリクエスト
    const response = await axios.post(
      WHISPER_API_ENDPOINT,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "Authorization": `Bearer ${apiKey}`,
        },
        timeout: 300000, // 5分のタイムアウト
      }
    );

    // レスポンスをチェック
    if (!response.data || !response.data.text) {
      throw createError(
        ErrorType.INTERNAL,
        "Whisper APIからの応答が無効です"
      );
    }

    return response.data.text;
  } catch (error) {
    // Axiosエラーの詳細なハンドリング
    if (axios.isAxiosError(error)) {
      handleAxiosError(error, filePath);
    }

    // その他のエラー
    throw createError(
      ErrorType.INTERNAL,
      `文字起こし処理中のエラー: ${error instanceof Error ? error.message : String(error)}`,
      {filePath: path.basename(filePath)}
    );
  }
}

/**
 * Axiosエラーを適切なタイプのエラーに変換
 */
function handleAxiosError(error: any, filePath: string): never {
  const status = error.response?.status;
  const detail = error.response?.data?.error?.message || error.message;

  logger.error(`Whisper API エラー: ${status} - ${detail}`, {
    filePath: path.basename(filePath),
    status,
    responseData: error.response?.data,
  });

  // エラータイプの判定
  if (status === 401) {
    throw createError(ErrorType.UNAUTHENTICATED, `API認証エラー: ${detail}`);
  } else if (status === 429) {
    throw createError(ErrorType.RESOURCE_EXHAUSTED, `レート制限エラー: ${detail}`);
  } else if (status === 413) {
    throw createError(ErrorType.INVALID_ARGUMENT, `ファイルサイズが大きすぎます: ${detail}`);
  } else if (status && status >= 400 && status < 500) {
    throw createError(ErrorType.INVALID_ARGUMENT, `API呼び出しエラー: ${detail}`);
  } else {
    throw createError(ErrorType.UNAVAILABLE, `APIサービスエラー: ${detail}`);
  }
}

/**
 * Secret Managerからシークレットを取得
 */
async function getSecret(secretName: string): Promise<string> {
  try {
    logger.info(`Secret Managerからシークレットを取得: ${secretName}`);
    
    const client = new SecretManagerServiceClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({name});

    if (!version.payload || !version.payload.data) {
      throw new Error(`シークレット ${secretName} が見つからないか、データがありません`);
    }

    logger.info(`シークレット ${secretName} の取得に成功`);
    return version.payload.data.toString();
  } catch (error) {
    logger.error(`Secret Managerでのエラー: ${secretName}`, error);
    throw createError(
      ErrorType.INTERNAL,
      `シークレットの取得に失敗: ${secretName}`,
      {secretName}
    );
  }
}
