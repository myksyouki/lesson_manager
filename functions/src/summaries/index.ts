/**
 * Firebase Storageトリガーによる音声処理の実装
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
import {transcribeAudio} from "./transcriber";
import {
  FUNCTION_REGION,
  DEFAULT_TIMEOUT,
  MIN_INSTANCES,
  MAX_INSTANCES,
  STORAGE_BUCKET,
  AUDIO_PATH_PREFIX,
  VALID_AUDIO_EXTENSIONS,
} from "../config";

// 公開するトリガー関数
export {processAudio, ProcessAudioRequest, ProcessAudioResult};
export {summarizeText, SummaryResult};
export {generateTags, TagResult};
export {transcribeAudio};

/**
 * Firebase Storageに音声ファイルがアップロードされたときに実行されるトリガー関数
 * パス: audio/{userId}/{lessonId}/{filename}
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
    // メタデータとファイル情報を取得
    const filePath = event.data.name;

    // 対象外のファイルは処理しない
    if (!filePath) {
      logger.warn("ファイルパスが存在しません");
      return;
    }

    // 下記パターンにマッチするか検証: audio/{userId}/{lessonId}/{filename}
    // audio/PREFIX確認
    if (!filePath.startsWith(`${AUDIO_PATH_PREFIX}/`)) {
      logger.info(`対象外のパス: ${filePath} (プレフィックス '${AUDIO_PATH_PREFIX}/' が必要)`);
      return;
    }

    // ファイル拡張子の検証
    const fileExt = path.extname(filePath).toLowerCase();
    if (!VALID_AUDIO_EXTENSIONS.includes(fileExt)) {
      logger.info(`対象外のファイル形式: ${fileExt} (${VALID_AUDIO_EXTENSIONS.join(", ")} のみ対応)`);
      return;
    }

    // パスの各部分を取得
    // audio/{userId}/{lessonId}/{filename}
    const pathParts = filePath.split("/");
    if (pathParts.length < 4) {
      logger.warn(`無効なパス形式: ${filePath} (必要な形式: ${AUDIO_PATH_PREFIX}/{userId}/{lessonId}/{filename})`);
      return;
    }

    const userId = pathParts[1];
    const lessonId = pathParts[2]; // ファイルパスからのレッスンID

    if (!userId || !lessonId) {
      logger.warn(`無効なユーザーIDまたはレッスンID: ${filePath}`);
      return;
    }

    // レッスンIDの正規化 (lesson_プレフィックス付きに統一)
    const normalizedLessonId = lessonId.startsWith("lesson_") ? lessonId : `lesson_${lessonId}`;

    // Firebase Storage URL作成
    const audioUrl = `gs://${STORAGE_BUCKET}/${filePath}`;

    logger.info(`音声処理を開始: ${audioUrl}`, {userId, lessonId: normalizedLessonId});

    // メタデータから楽器情報とカスタム指示を取得
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

    // 音声処理の実行
    const result = await processAudio({
      audioUrl,
      lessonId: normalizedLessonId, // 正規化されたlessonIdを渡す
      userId,
      instrument,
      pieces,
      userPrompt,
    });

    if (result.success) {
      logger.info(`音声処理が完了しました: ${normalizedLessonId}`, {
        processingTime: result.processingTimeSeconds,
        transcriptionLength: result.transcription.length,
        summaryLength: result.summary.length,
        tagCount: result.tags.length,
      });
    } else {
      logger.error(`音声処理に失敗しました: ${normalizedLessonId}`, {error: result.error});
    }
  } catch (error) {
    const errorDetails = handleError(error);
    logger.error("Storage Triggerでエラーが発生しました", errorDetails);
  }
});
