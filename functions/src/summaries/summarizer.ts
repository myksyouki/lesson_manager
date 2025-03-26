/**
 * 文字起こしテキストの要約処理
 * Dify APIを使用
 */

import axios from "axios";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {createError, ErrorType} from "../common/errors";
import {DIFY_API_ENDPOINT, DIFY_API_KEY_SECRET, PROJECT_ID, DIFY_APP_ID_SECRET} from "../config";

/**
 * 要約結果の型定義
 */
export interface SummaryResult {
  success: boolean;
  summary: string;
  error?: string;
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
 * 文字起こしテキストを要約
 */
export async function summarizeText(
  text: string,
  instrument: string,
  userPrompt?: string,
  pieces?: string
): Promise<SummaryResult> {
  try {
    logger.info("テキスト要約を開始");

    if (!text || text.trim().length === 0) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "Text to summarize is empty"
      );
    }

    // APIキーとアプリIDの取得
    const apiKey = await getSecret(DIFY_API_KEY_SECRET);
    const appId = await getSecret(DIFY_APP_ID_SECRET);

    // 楽器情報に基づくプロンプトの調整
    let prompt = "以下は音楽レッスンの文字起こしです。レッスンの重要なポイントを箇条書きで5-7つにまとめてください。";

    if (instrument && instrument.trim().length > 0) {
      prompt += ` このレッスンは${instrument}に関するものです。`;
    }

    // ユーザープロンプトがある場合は追加
    if (userPrompt && userPrompt.trim().length > 0) {
      prompt += ` 追加の指示: ${userPrompt}`;
      logger.info(`ユーザープロンプトを追加: "${userPrompt}"`);
    }

    // Dify APIへのリクエストデータ形式を修正
    const requestData = {
      app_id: appId, // アプリIDを追加
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
      appId,
      prompt,
      instrument,
      userPrompt: userPrompt || "(なし)",
      pieces: pieces ? "あり" : "なし",
      textLength: text.length,
    });

    // APIリクエスト
    const response = await axios.post(
      `${DIFY_API_ENDPOINT}/chat-messages`,
      requestData,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 60000, // 1分のタイムアウト
      }
    );

    // レスポンス検証
    if (!response.data ||
        !response.data.answer ||
        typeof response.data.answer !== "string") {
      throw createError(
        ErrorType.INTERNAL,
        "Invalid response from Dify API",
        {response: JSON.stringify(response.data)}
      );
    }

    logger.info("テキスト要約完了");
    
    // Dify APIからの応答を処理
    let processedSummary = response.data.answer;
    
    // JSON形式かどうかをチェック
    if (processedSummary.trim().startsWith("{") && processedSummary.trim().endsWith("}")) {
      try {
        // JSONとしてパース
        const jsonData = JSON.parse(processedSummary);
        // summaryフィールドが存在する場合は抽出
        if (jsonData && jsonData.summary) {
          processedSummary = jsonData.summary;
          logger.info("JSONレスポンスからsummaryフィールドを抽出しました", {
            originalLength: response.data.answer.length,
            processedLength: processedSummary.length,
          });
        }
      } catch (jsonError) {
        logger.warn("JSONパースに失敗しました。元の応答をそのまま使用します", {
          error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        });
      }
    }

    return {
      success: true,
      summary: processedSummary,
    };
  } catch (error) {
    logger.error("テキスト要約中のエラー:", error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const detail = error.response?.data?.error || error.message;
      const responseData = error.response?.data;

      // より詳細なエラー情報をログに出力
      logger.error(`Dify API エラー: ${status}`, {
        detail,
        responseData,
        requestUrl: `${DIFY_API_ENDPOINT}/chat-messages`,
      });

      return {
        success: false,
        summary: "",
        error: `API呼び出しエラー (${status}): ${detail}`,
      };
    }

    return {
      success: false,
      summary: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
