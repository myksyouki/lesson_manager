/**
 * 音声ファイルの文字起こし処理
 * OpenAI Whisper APIを使用
 */

import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import FormData from "form-data";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {createError, ErrorType} from "../common/errors";
import {WHISPER_API_ENDPOINT, OPENAI_API_KEY_SECRET, PROJECT_ID} from "../config";

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
 * Secret Managerからシークレットを取得
 */
async function getSecret(secretName: string): Promise<string> {
  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({name});

    if (!version.payload || !version.payload.data) {
      throw new Error(`Secret ${secretName} not found or has no data`);
    }

    const secret = version.payload.data.toString();
    return secret;
  } catch (error) {
    logger.error(`Secret Managerでのエラー: ${secretName}`, error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to retrieve secret: ${secretName}`,
      {secretName}
    );
  }
}

/**
 * 単一の音声ファイルを文字起こし
 */
async function transcribeSingleFile(
  filePath: string,
  apiKey: string
): Promise<string> {
  try {
    logger.info(`ファイルを文字起こし: ${path.basename(filePath)}`);

    // ファイルをチェック
    if (!fs.existsSync(filePath)) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        `File not found: ${filePath}`
      );
    }

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
        "Invalid response from Whisper API"
      );
    }

    return response.data.text;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // Axiosエラーの処理
      const status = error.response?.status;
      const detail = error.response?.data?.error?.message || error.message;

      logger.error(`Whisper API エラー: ${status} - ${detail}`, error);

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
    } else {
      // その他のエラー
      throw createError(
        ErrorType.INTERNAL,
        `文字起こし処理中のエラー: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

/**
 * 複数の音声ファイルを文字起こし
 */
export async function transcribeAudio(
  filePaths: string[],
  progressCallback?: ProgressCallback
): Promise<TranscriptionResult> {
  try {
    logger.info(`${filePaths.length}個のファイルを文字起こし`);

    // OpenAI APIキーの取得
    const apiKey = await getSecret(OPENAI_API_KEY_SECRET);

    // 全ファイルの文字起こし
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

      // 単一ファイルの文字起こし
      const text = await transcribeSingleFile(filePaths[i], apiKey);
      transcriptions.push(text);

      logger.info(`ファイル ${i + 1}/${filePaths.length} の文字起こし完了`);
    }

    // 最終進捗コールバック
    if (progressCallback) {
      await progressCallback(100, filePaths.length, filePaths.length);
    }

    // 文字起こし結果を結合
    const fullText = transcriptions.join("\n\n");

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
