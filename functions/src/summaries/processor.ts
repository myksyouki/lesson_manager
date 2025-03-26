/**
 * 音声処理のメイン制御ロジック
 */

// 標準ライブラリ
import * as fs from "fs";
import * as path from "path";

// サードパーティライブラリ
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

// プロジェクト内のモジュール
import {createError, ErrorType, handleError} from "../common/errors";
import {updateLessonProcessingStatus, initFirestore} from "../common/firestore";
import {downloadFileFromUrl, splitAudio, SplitAudioResult} from "../common/audio";
import {transcribeAudio} from "./transcriber";
import {summarizeText} from "./summarizer";
import {generateTags} from "./tagger";
import {
  TEMP_DIR, PROJECT_ID,
} from "../config";

// 進捗状況の区切り
const PROGRESS_DOWNLOAD = 10;
const PROGRESS_SPLIT = 20;
const PROGRESS_TRANSCRIBE_START = 25;
const PROGRESS_TRANSCRIBE_END = 70;
const PROGRESS_SUMMARIZE = 80;
const PROGRESS_TAGS = 90;
const PROGRESS_COMPLETE = 100;

// 音声処理のリクエスト型
export interface ProcessAudioRequest {
  audioUrl: string;
  lessonId: string;
  userId: string;
  instrument?: string;
  pieces?: string; // 曲目情報 (JSON文字列)
  userPrompt?: string; // ユーザーからのAI指示
}

// 音声処理の結果型
export interface ProcessAudioResult {
  success: boolean;
  transcription: string;
  summary: string;
  tags: string[];
  error?: string;
  processingTimeSeconds?: number;
}

/**
 * 音声処理のメイン関数
 */
export async function processAudio(request: ProcessAudioRequest): Promise<ProcessAudioResult> {
  const {audioUrl, lessonId, userId, instrument = ""} = request;
  const startTime = Date.now();
  let tempDir = "";
  let audioFiles: string[] = [];
  let userPrompt = request.userPrompt || "";

  try {
    logger.info("音声処理を開始:", {lessonId, userId});

    // 必須パラメータのチェック
    validateRequiredParams(audioUrl, lessonId, userId);
    
    // レッスンIDの正規化 (lesson_プレフィックスの処理)
    const normalizedLessonId = lessonId.startsWith("lesson_") ? lessonId : `lesson_${lessonId}`;
    logger.info(`正規化されたレッスンID: ${normalizedLessonId}`);

    // レッスンデータから楽器情報とuserPromptを取得
    const instrumentInfo = await getInstrumentInfo(userId, normalizedLessonId, instrument, userPrompt);
    const instrumentName = instrumentInfo.instrument;
    if (instrumentInfo.userPrompt) {
      userPrompt = instrumentInfo.userPrompt;
    }

    // 一時ディレクトリの作成
    tempDir = path.join(TEMP_DIR, `lesson-${normalizedLessonId}-${Date.now()}`);
    fs.mkdirSync(tempDir, {recursive: true});
    
    // 処理開始を記録
    await updateProcessingStatus(normalizedLessonId, "processing", 5, "Processing started", audioUrl);

    // 音声ファイルのダウンロード
    let audioFilePath;
    try {
      logger.info("音声ファイルをダウンロード中:", audioUrl);
      audioFilePath = await downloadFileFromUrl(audioUrl, tempDir);
      await updateProcessingStatus(normalizedLessonId, "processing", PROGRESS_DOWNLOAD, undefined, audioUrl);
    } catch (error) {
      logger.error(`音声ファイルのダウンロードに失敗: ${audioUrl}`, error);
      throw createError(
        ErrorType.FAILED_PRECONDITION,
        `Failed to download audio file: ${error instanceof Error ? error.message : String(error)}`,
        {audioUrl, lessonId: normalizedLessonId}
      );
    }

    // 音声ファイルの分割
    try {
      logger.info("音声ファイルを分割中");
      const splitResult: SplitAudioResult = await splitAudio(audioFilePath, tempDir);
      audioFiles = splitResult.outputFiles;
      await updateProcessingStatus(normalizedLessonId, "processing", PROGRESS_SPLIT, undefined, audioUrl);
    } catch (error) {
      logger.error(`音声ファイルの分割に失敗: ${audioFilePath}`, error);
      throw createError(
        ErrorType.INTERNAL,
        `Failed to split audio file: ${error instanceof Error ? error.message : String(error)}`,
        {audioFilePath, lessonId: normalizedLessonId}
      );
    }

    // 音声ファイルの文字起こし
    logger.info(`${audioFiles.length}個のファイルを文字起こし中`);
    const transcriptionResult = await transcribeAudio(audioFiles, async (progress, current, total) => {
      // 文字起こし進捗の更新
      const transcribeProgress = PROGRESS_TRANSCRIBE_START +
        ((progress / 100) * (PROGRESS_TRANSCRIBE_END - PROGRESS_TRANSCRIBE_START));

      await updateProcessingStatus(
        normalizedLessonId, 
        "processing", 
        Math.round(transcribeProgress),
        `Transcribing ${current}/${total}`,
        audioUrl
      );
    });

    if (!transcriptionResult.success || !transcriptionResult.text) {
      throw createError(
        ErrorType.INTERNAL,
        `Transcription failed: ${transcriptionResult.error || "Unknown error"}`,
        {lessonId: normalizedLessonId}
      );
    }

    const transcription = transcriptionResult.text;
    logger.info(`文字起こし完了: ${transcription.length}文字`);

    // 文字起こし完了ステータスの更新
    await updateLessonProcessingStatus(
      normalizedLessonId,
      "processing",
      PROGRESS_TRANSCRIBE_END,
      "Transcription completed",
      {
        transcription,
        transcriptionCompleteTime: new Date().toISOString(),
        transcriptionId: generateUniqueId(),
      },
      audioUrl
    );

    // 文字起こしテキストを要約
    logger.info("要約を生成中:", {transcriptionLength: transcription.length, instrumentName});
    await updateProcessingStatus(normalizedLessonId, "processing", PROGRESS_SUMMARIZE, "Generating summary", audioUrl);
    
    // 要約の生成
    let summary = "";
    try {
      const summaryResult = await summarizeText(
        transcription, 
        instrumentName,
        userPrompt,
        request.pieces
      );
      if (!summaryResult.success) {
        throw new Error(summaryResult.error || "Unknown error during summarization");
      }
      summary = summaryResult.summary;
    } catch (error) {
      logger.error(`要約生成に失敗: ${normalizedLessonId}`, error);
      throw createError(
        ErrorType.INTERNAL,
        `Failed to generate summary: ${error instanceof Error ? error.message : String(error)}`,
        {lessonId: normalizedLessonId}
      );
    }

    // タグの生成
    logger.info("タグを生成中:", {summaryLength: summary.length, instrumentName});
    await updateProcessingStatus(normalizedLessonId, "processing", PROGRESS_TAGS, "Generating tags", audioUrl);
    
    // タグ生成
    let tags: string[] = [];
    try {
      const tagResult = await generateTags(transcription, summary, instrumentName);
      if (tagResult.success) {
        tags = tagResult.tags;
      } else {
        logger.warn(`タグ生成に失敗: ${normalizedLessonId} - ${tagResult.error}`);
        // タグが生成できなくても処理は続行
        tags = [instrumentName || "音楽", "レッスン", "練習"];
      }
    } catch (error) {
      logger.warn(`タグ生成に失敗: ${normalizedLessonId}`, error);
      // タグが生成できなくても処理は続行
      tags = [instrumentName || "音楽", "レッスン", "練習"];
    }

    // 処理完了ステータスの更新
    await updateLessonProcessingStatus(
      normalizedLessonId,
      "completed",
      PROGRESS_COMPLETE,
      "Processing completed",
      {
        summary,
        tags,
        processingCompleteTime: new Date().toISOString(),
      },
      audioUrl
    );

    // 一時ファイルのクリーンアップ
    cleanupTempFiles(tempDir);

    // 処理時間の計算と結果の返却
    const processingTimeSeconds = (Date.now() - startTime) / 1000;
    logger.info(`音声処理が完了しました: ${normalizedLessonId}`, {
      processingTimeSeconds,
      transcriptionLength: transcription.length,
      summaryLength: summary.length,
      tagCount: tags.length,
    });

    return {
      success: true,
      transcription,
      summary,
      tags,
      processingTimeSeconds,
    };
  } catch (error) {
    // エラー時のクリーンアップ
    if (tempDir) {
      cleanupTempFiles(tempDir);
    }

    // エラー詳細のログ出力
    const errorDetails = handleError(error, "processAudio");
    logger.error(`音声処理中にエラーが発生: ${lessonId}`, errorDetails);

    // エラーステータスの更新
    try {
      const normalizedLessonId = lessonId.startsWith("lesson_") ? lessonId : `lesson_${lessonId}`;
      await updateLessonProcessingStatus(
        normalizedLessonId,
        "error",
        0,
        `Error: ${errorDetails.message}`,
        {
          error: errorDetails.message,
          errorType: errorDetails.type,
          errorTime: new Date().toISOString(),
        },
        audioUrl
      );
    } catch (updateError) {
      logger.error(`エラーステータス更新に失敗: ${lessonId}`, updateError);
    }

    // エラー結果の返却
    return {
      success: false,
      transcription: "",
      summary: "",
      tags: [],
      error: errorDetails.message,
      processingTimeSeconds: (Date.now() - startTime) / 1000,
    };
  }
}

/**
 * 必須パラメータの検証
 */
function validateRequiredParams(audioUrl: string, lessonId: string, userId: string): void {
  if (!audioUrl || !audioUrl.trim()) {
    throw createError(ErrorType.INVALID_ARGUMENT, "Audio URL is required");
  }
  if (!lessonId || !lessonId.trim()) {
    throw createError(ErrorType.INVALID_ARGUMENT, "Lesson ID is required");
  }
  if (!userId || !userId.trim()) {
    throw createError(ErrorType.INVALID_ARGUMENT, "User ID is required");
  }
}

/**
 * 楽器情報とユーザープロンプトの取得
 */
async function getInstrumentInfo(
  userId: string, 
  lessonId: string, 
  defaultInstrument: string, 
  defaultPrompt: string
): Promise<{instrument: string, userPrompt?: string}> {
  let instrumentName = defaultInstrument || "";
  let userPrompt = defaultPrompt || "";
  
  try {
    const firestore = initFirestore();
    
    // レッスンドキュメントから情報を取得
    const lessonDoc = await firestore.doc(`users/${userId}/lessons/${lessonId}`).get();
    if (lessonDoc.exists) {
      const lessonData = lessonDoc.data() || {};
      
      // 楽器情報を取得
      if (lessonData.instrumentName) {
        instrumentName = lessonData.instrumentName;
        logger.info(`レッスンデータから楽器情報を取得: "${instrumentName}"`);
      }
      
      // userPromptを取得（リクエストのものが空の場合のみ）
      if (!userPrompt && lessonData.userPrompt) {
        userPrompt = lessonData.userPrompt;
        logger.info(`レッスンデータからuserPromptを取得: "${userPrompt}"`);
      }
    } else {
      // ユーザープロファイルから楽器情報を取得（レッスンで見つからない場合）
      if (!instrumentName) {
        const profileDoc = await firestore.doc(`users/${userId}/profile/main`).get();
        if (profileDoc.exists && profileDoc.data()?.selectedInstrument) {
          instrumentName = profileDoc.data()?.selectedInstrument;
          logger.info(`ユーザープロファイルから楽器情報を取得: "${instrumentName}"`);
        }
      }
    }
  } catch (error) {
    logger.warn(`Firestoreデータの取得に失敗: ${lessonId}`, error);
    // エラーは無視し、引数で渡された値を使用
  }

  // 楽器名が空の場合、デフォルト値を設定
  if (!instrumentName || instrumentName.trim() === "") {
    instrumentName = "不明";
    logger.info("楽器情報が取得できなかったためデフォルト値を使用");
  }
  
  return {instrument: instrumentName, userPrompt};
}

/**
 * 処理ステータスの更新を統一したヘルパー関数
 */
async function updateProcessingStatus(
  lessonId: string, 
  status: "pending" | "processing" | "completed" | "error", 
  progress: number, 
  message?: string, 
  audioUrl?: string
): Promise<void> {
  try {
    await updateLessonProcessingStatus(
      lessonId, 
      status, 
      progress,
      message,
      {},
      audioUrl
    );
  } catch (updateError) {
    logger.warn(`ステータス更新に失敗: ${lessonId}`, updateError);
    // エラーは無視して続行
  }
}

/**
 * 一時ファイルのクリーンアップ
 */
function cleanupTempFiles(tempDir: string): void {
  try {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, {recursive: true, force: true});
      logger.info(`一時ディレクトリをクリーンアップ: ${tempDir}`);
    }
  } catch (error) {
    logger.warn(`一時ファイルのクリーンアップに失敗: ${tempDir}`, error);
  }
}

/**
 * ユニークIDの生成
 */
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Secret Managerからシークレットを取得
 */
export async function getSecret(secretName: string): Promise<string> {
  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({name});

    if (!version.payload || !version.payload.data) {
      throw createError(
        ErrorType.NOT_FOUND, 
        `Secret ${secretName} not found or has no data`
      );
    }

    return version.payload.data.toString();
  } catch (error) {
    logger.error(`Secret ${secretName} の取得に失敗`, error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to retrieve secret: ${secretName}`,
      {secretName}
    );
  }
}
