/**
 * Firebase Storageトリガーによる音声処理の実装
 * 
 * 音声ファイルがFirebase Storageにアップロードされると、このモジュールが
 * 自動的に音声処理（文字起こし、要約、タグ生成）を実行します。
 */

// Firebase Functions
import {onObjectFinalized, StorageEvent} from "firebase-functions/v2/storage";
import * as logger from "firebase-functions/logger";
import * as path from "path";

// プロジェクト内のモジュール
import {handleError} from "../common/errors";
import {processAudio, ProcessAudioRequest, ProcessAudioResult} from "./processor";
import {summarizeText, SummaryResult} from "./summarizer";
import {generateTags, TagResult} from "./tagger"; 
import {transcribeAudio, TranscriptionResult} from "./transcriber";
import {
  FUNCTION_REGION,
  DEFAULT_TIMEOUT,
  MIN_INSTANCES,
  MAX_INSTANCES,
  STORAGE_BUCKET,
  AUDIO_PATH_PREFIX,
  VALID_AUDIO_EXTENSIONS,
} from "../config";

// 公開するトリガー関数と型のエクスポート
export {processAudio, ProcessAudioRequest, ProcessAudioResult};
export {summarizeText, SummaryResult};
export {generateTags, TagResult};
export {transcribeAudio, TranscriptionResult};

/**
 * Firebase Storageに音声ファイルがアップロードされたときに実行されるトリガー関数
 * パス形式: audio/{userId}/{lessonId}/{filename}
 */
export const processAudioOnUpload = onObjectFinalized({
  region: FUNCTION_REGION,
  memory: "4GiB",
  timeoutSeconds: Number(DEFAULT_TIMEOUT),
  minInstances: MIN_INSTANCES,
  maxInstances: MAX_INSTANCES,
  bucket: STORAGE_BUCKET,
}, async (event: StorageEvent) => {
  try {
    // ファイルパスの取得と検証
    const filePath = validateAndExtractFilePath(event);
    if (!filePath) return;

    // ユーザーIDとレッスンIDの抽出
    const {userId, lessonId} = extractIdsFromPath(filePath);
    if (!userId || !lessonId) {
      logger.warn(`無効なユーザーIDまたはレッスンID: ${filePath}`);
      return;
    }

    // レッスンIDの正規化 (lesson_プレフィックス付きに統一)
    const normalizedLessonId = normalizeId(lessonId);

    // Firebase Storage URL作成
    const audioUrl = `gs://${STORAGE_BUCKET}/${filePath}`;
    logger.info(`音声処理を開始: ${audioUrl}`, {userId, lessonId: normalizedLessonId});

    // メタデータの取得と処理
    const {instrument, pieces, userPrompt} = extractMetadata(event);
    
    // 音声処理の実行
    const result = await processAudio({
      audioUrl,
      lessonId: normalizedLessonId,
      userId,
      instrument,
      pieces,
      userPrompt,
    });

    // 処理結果のログ出力
    logProcessingResult(result, normalizedLessonId);
  } catch (error) {
    const errorDetails = handleError(error);
    logger.error("Storage Triggerでエラーが発生しました", errorDetails);
  }
});

/**
 * ファイルパスの検証と抽出
 */
function validateAndExtractFilePath(event: StorageEvent): string | null {
  const filePath = event.data.name;

  // 対象外のファイルは処理しない
  if (!filePath) {
    logger.warn("ファイルパスが存在しません");
    return null;
  }

  // audio/PREFIXが含まれるか確認
  if (!filePath.startsWith(`${AUDIO_PATH_PREFIX}/`)) {
    logger.info(`対象外のパス: ${filePath} (プレフィックス '${AUDIO_PATH_PREFIX}/' が必要)`);
    return null;
  }

  // ファイル拡張子の検証
  const fileExt = path.extname(filePath).toLowerCase();
  if (!VALID_AUDIO_EXTENSIONS.includes(fileExt)) {
    logger.info(`対象外のファイル形式: ${fileExt} (${VALID_AUDIO_EXTENSIONS.join(", ")} のみ対応)`);
    return null;
  }

  // パスの各部分を取得 (audio/{userId}/{lessonId}/{filename})
  const pathParts = filePath.split("/");
  if (pathParts.length < 4) {
    logger.warn(`無効なパス形式: ${filePath} (必要な形式: ${AUDIO_PATH_PREFIX}/{userId}/{lessonId}/{filename})`);
    return null;
  }

  return filePath;
}

/**
 * パスからユーザーIDとレッスンIDを抽出
 */
function extractIdsFromPath(filePath: string): {userId: string; lessonId: string} {
  const pathParts = filePath.split("/");
  return {
    userId: pathParts[1],
    lessonId: pathParts[2],
  };
}

/**
 * レッスンIDを正規化する (lesson_プレフィックスを追加)
 */
function normalizeId(lessonId: string): string {
  return lessonId.startsWith("lesson_") ? lessonId : `lesson_${lessonId}`;
}

/**
 * イベントメタデータから処理に必要な情報を抽出
 */
function extractMetadata(event: StorageEvent): {
  instrument: string; 
  pieces: string; 
  userPrompt: string
} {
  const metadata = event.data.metadata || {};
  // customMetadataをany型にキャストしてアクセスできるようにする
  const customMetadata = (metadata.customMetadata || {}) as any;
  
  const instrument = customMetadata.instrument || "";
  const pieces = customMetadata.pieces || "[]";
  const userPrompt = customMetadata.userPrompt || "";
  
  // メタデータの詳細をログに記録（デバッグ用）
  logger.info("受信したメタデータ:", {
    metadata: metadata,
    customMetadata: customMetadata,
  });
  
  // userPromptをログに記録（デバッグ用）
  logger.info(`メタデータから取得したuserPrompt: "${userPrompt}"`, {
    isEmpty: !userPrompt || userPrompt.length === 0,
    type: typeof userPrompt,
  });

  return {instrument, pieces, userPrompt};
}

/**
 * 処理結果をログに出力
 */
function logProcessingResult(result: ProcessAudioResult, lessonId: string): void {
  if (result.success) {
    logger.info(`音声処理が完了しました: ${lessonId}`, {
      processingTime: result.processingTimeSeconds,
      transcriptionLength: result.transcription.length,
      summaryLength: result.summary.length,
      tagCount: result.tags.length,
    });
  } else {
    logger.error(`音声処理に失敗しました: ${lessonId}`, {error: result.error});
  }
}
