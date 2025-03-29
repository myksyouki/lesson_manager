/**
 * 文字起こしテキストの要約処理
 * 
 * Dify APIを使用して音声の文字起こしテキストからレッスン内容の要約を生成します。
 * 楽器の種類や追加のユーザー指示に応じた要約を生成します。
 */

// サードパーティライブラリ
import axios from "axios";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

// プロジェクト内のモジュール
import {createError, ErrorType} from "../common/errors";
import {
  DIFY_API_ENDPOINT, 
  DIFY_API_KEY_SECRET, 
  PROJECT_ID, 
  DIFY_APP_ID_SECRET
} from "../config";

// 定数
const MAX_RETRY_COUNT = 2;
const RETRY_DELAY_MS = 2000;
const DEFAULT_TIMEOUT_MS = 60000; // 1分のタイムアウト

/**
 * 要約結果の型定義
 */
export interface SummaryResult {
  success: boolean;
  summary: string;
  error?: string;
}

/**
 * Dify API認証情報
 */
interface DifyCredentials {
  apiKey: string;
  appId: string;
}

/**
 * 文字起こしテキストを要約
 * 
 * @param text 要約する文字起こしテキスト
 * @param instrument 楽器名
 * @param userPrompt ユーザーからの追加指示（オプション）
 * @param pieces 演奏した曲目情報（JSON文字列、オプション）
 * @returns 要約結果
 */
export async function summarizeText(
  text: string,
  instrument: string,
  userPrompt?: string,
  pieces?: string
): Promise<SummaryResult> {
  try {
    logger.info("テキスト要約を開始", {
      textLength: text.length,
      instrument,
      hasUserPrompt: !!userPrompt,
      hasPieces: !!pieces
    });

    // 入力の検証
    validateInputText(text);

    // APIキーとアプリIDの取得
    const credentials = await getDifyCredentials();

    // プロンプトの生成
    const prompt = buildSummaryPrompt(instrument, userPrompt);

    // リクエストデータの準備
    const requestData = buildRequestData(
      credentials.appId, 
      text, 
      instrument, 
      prompt, 
      userPrompt, 
      pieces
    );

    // Dify APIへのリクエスト（リトライロジック付き）
    const summary = await callDifyWithRetry(requestData, credentials.apiKey);

    logger.info("テキスト要約完了", {
      summaryLength: summary.length,
      instrument
    });

    return {
      success: true,
      summary,
    };
  } catch (error) {
    logger.error("テキスト要約中のエラー:", error);
    return {
      success: false,
      summary: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 入力テキストの検証
 */
function validateInputText(text: string): void {
  if (!text || text.trim().length === 0) {
    throw createError(
      ErrorType.INVALID_ARGUMENT,
      "要約対象のテキストが空です"
    );
  }
  
  // あまりに短すぎる場合も警告
  if (text.length < 20) {
    logger.warn("入力テキストが非常に短いです", {textLength: text.length});
  }
}

/**
 * Dify API認証情報の取得
 */
async function getDifyCredentials(): Promise<DifyCredentials> {
  try {
    logger.info("Dify API認証情報を取得中...");
    
    // APIキーとアプリIDの並行取得
    const [apiKey, appId] = await Promise.all([
      getSecret(DIFY_API_KEY_SECRET),
      getSecret(DIFY_APP_ID_SECRET)
    ]);
    
    logger.info("Dify API認証情報の取得に成功");
    return { apiKey, appId };
  } catch (error) {
    logger.error("Dify API認証情報の取得に失敗:", error);
    throw createError(
      ErrorType.INTERNAL,
      "Dify API認証情報の取得に失敗しました",
      { errorDetails: error instanceof Error ? error.message : String(error) }
    );
  }
}

/**
 * 要約用プロンプトの構築
 */
function buildSummaryPrompt(instrument: string, userPrompt?: string): string {
  // 基本プロンプト
  let prompt = "以下は音楽レッスンの文字起こしです。レッスンの重要なポイントを箇条書きで5-7つにまとめてください。";

  // 楽器情報があれば追加
  if (instrument && instrument.trim().length > 0) {
    prompt += ` このレッスンは${instrument}に関するものです。`;
  }

  // ユーザープロンプトがある場合は追加
  if (userPrompt && userPrompt.trim().length > 0) {
    prompt += ` 追加の指示: ${userPrompt}`;
    logger.info(`ユーザープロンプトを追加: "${userPrompt}"`);
  }

  return prompt;
}

/**
 * Dify APIリクエストデータの構築
 */
function buildRequestData(
  appId: string,
  text: string,
  instrument: string,
  prompt: string,
  userPrompt?: string,
  pieces?: string
): any {
  const requestData = {
    app_id: appId,
    inputs: {
      transcription: text,
      instrument: instrument || "不明",
      userPrompt: userPrompt || "",
      pieces: pieces || "",
    },
    query: prompt,
    response_mode: "blocking",
    user: "lesson-manager-system",
  };

  logger.info("Dify APIリクエスト準備完了:", {
    appId: appId.substring(0, 4) + "...", // セキュリティのため完全なIDは表示しない
    promptLength: prompt.length,
    instrument,
    userPrompt: userPrompt ? "あり" : "なし",
    pieces: pieces ? "あり" : "なし",
    textLength: text.length,
  });

  return requestData;
}

/**
 * リトライロジック付きのDify API呼び出し
 */
async function callDifyWithRetry(requestData: any, apiKey: string): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
    try {
      return await callDifyAPI(requestData, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 最後の試行でなければリトライ
      if (attempt < MAX_RETRY_COUNT) {
        const delay = RETRY_DELAY_MS * attempt;
        logger.warn(`Dify API呼び出し失敗、${delay}ms後に再試行 (${attempt}/${MAX_RETRY_COUNT})`, 
          {error: lastError.message});
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // すべてのリトライが失敗
  throw lastError || new Error("未知のエラーによりDify API呼び出しに失敗");
}

/**
 * Dify APIの呼び出し
 */
async function callDifyAPI(requestData: any, apiKey: string): Promise<string> {
  try {
    // APIリクエスト
    const response = await axios.post(
      `${DIFY_API_ENDPOINT}/chat-messages`,
      requestData,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: DEFAULT_TIMEOUT_MS,
      }
    );

    // レスポンス検証
    if (!response.data ||
        !response.data.answer ||
        typeof response.data.answer !== "string") {
      throw createError(
        ErrorType.INTERNAL,
        "Dify APIからの応答が無効です",
        {response: JSON.stringify(response.data)}
      );
    }

    // Dify APIからの応答を処理
    return processApiResponse(response.data.answer);
  } catch (error) {
    // Axiosエラーの詳細なハンドリング
    if (axios.isAxiosError(error)) {
      handleAxiosError(error);
    }

    // その他のエラー
    throw createError(
      ErrorType.INTERNAL,
      `Dify API呼び出し中のエラー: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Axiosエラーを適切なタイプのエラーに変換
 */
function handleAxiosError(error: any): never {
  const status = error.response?.status;
  const detail = error.response?.data?.error || error.message;
  const responseData = error.response?.data;

  // より詳細なエラー情報をログに出力
  logger.error(`Dify API エラー: ${status}`, {
    detail,
    responseData,
    requestUrl: `${DIFY_API_ENDPOINT}/chat-messages`,
  });

  // エラータイプの判定
  if (status === 401) {
    throw createError(ErrorType.UNAUTHENTICATED, `API認証エラー: ${detail}`);
  } else if (status === 429) {
    throw createError(ErrorType.RESOURCE_EXHAUSTED, `レート制限エラー: ${detail}`);
  } else if (status && status >= 400 && status < 500) {
    throw createError(ErrorType.INVALID_ARGUMENT, `API呼び出しエラー (${status}): ${detail}`);
  } else {
    throw createError(ErrorType.UNAVAILABLE, `APIサービスエラー (${status}): ${detail}`);
  }
}

/**
 * API応答の処理
 */
function processApiResponse(responseText: string): string {
  let processedSummary = responseText;
  
  // JSON形式かどうかをチェック
  if (processedSummary.trim().startsWith("{") && processedSummary.trim().endsWith("}")) {
    try {
      // JSONとしてパース
      const jsonData = JSON.parse(processedSummary);
      // summaryフィールドが存在する場合は抽出
      if (jsonData && jsonData.summary) {
        processedSummary = jsonData.summary;
        logger.info("JSONレスポンスからsummaryフィールドを抽出しました", {
          originalLength: responseText.length,
          processedLength: processedSummary.length,
        });
      }
    } catch (jsonError) {
      logger.warn("JSONパースに失敗しました。元の応答をそのまま使用します", {
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
      });
    }
  }
  
  return processedSummary;
}

/**
 * Secret Managerからシークレットを取得
 */
async function getSecret(secretName: string): Promise<string> {
  try {
    const client = new SecretManagerServiceClient();
    const name = `projects/${PROJECT_ID}/secrets/${secretName}/versions/latest`;
    const [version] = await client.accessSecretVersion({name});

    if (!version.payload || !version.payload.data) {
      throw new Error(`シークレット ${secretName} が見つからないか、データがありません`);
    }

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
