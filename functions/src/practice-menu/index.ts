/**
 * 練習メニュー生成用のCloud Functions
 */

import {onCall} from "firebase-functions/v2/https";
import axios from "axios";
import {
  FUNCTION_REGION,
  DEFAULT_TIMEOUT,
  PROJECT_ID,
} from "../config";
import {ErrorType, createError} from "../common/errors";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

// 外部参照用にDify APIレスポンスのインターフェイス定義
interface DifyAPIResponse {
  success: boolean;
  answer: string;
  conversationId?: string;
}

// Secret Manager クライアント
const secretManager = new SecretManagerServiceClient();

/**
 * Dify APIシークレットを取得
 */
async function getDifySecrets() {
  try {
    logger.info("Difyシークレットの取得を開始...");
    
    const [apiKeyVersion] = await secretManager.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/dify-practice-api-key/versions/latest`,
    });
    
    const [appIdVersion] = await secretManager.accessSecretVersion({
      name: `projects/${PROJECT_ID}/secrets/dify-practice-app-id/versions/latest`,
    });

    const apiKey = apiKeyVersion.payload?.data?.toString() || "";
    const appId = appIdVersion.payload?.data?.toString() || "";

    if (!apiKey || !appId) {
      throw new Error("Difyシークレットの取得に失敗しました");
    }

    logger.info("Difyシークレットの取得に成功");
    
    return {
      apiKey,
      appId,
    };
  } catch (error) {
    logger.error("Difyシークレットの取得エラー:", error);
    throw new Error("Difyシークレットの取得に失敗しました");
  }
}

/**
 * 楽器名を正規化する関数
 */
function normalizeInstrumentName(instrument: string): string {
  if (!instrument) return "piano"; // デフォルト値
  
  logger.info(`正規化前の楽器名: "${instrument}"`);
  
  // woodwind-saxophone-standard → saxophone
  if (instrument.includes("-")) {
    const parts = instrument.split("-");
    // 真ん中の部分（saxophoneなど）を抽出
    if (parts.length >= 2) {
      logger.info(`楽器名を分割: ${parts.join(", ")}`);
      return parts[1];
    }
  }
  
  // 一般的な楽器名のマッピング
  const instrumentMap: Record<string, string> = {
    "woodwindsaxophonestandard": "saxophone",
    "standard": "saxophone",
    "woodwind": "woodwind",
    "wind": "saxophone",
    "brass": "brass",
    "strings": "strings",
    "piano": "piano",
    "guitar": "guitar",
    "drums": "drums",
    "percussion": "percussion",
    "voice": "voice",
  };
  
  // スペースや特殊文字を削除した小文字の楽器名
  const normalizedKey = instrument.toLowerCase().replace(/[^a-z]/g, "");
  if (instrumentMap[normalizedKey]) {
    logger.info(`マッピングから楽器名を検出: ${normalizedKey} → ${instrumentMap[normalizedKey]}`);
    return instrumentMap[normalizedKey];
  }
  
  // どの条件にも一致しない場合はそのまま返す
  logger.info(`変換なしで楽器名を使用: "${instrument}"`);
  return instrument;
}

/**
 * レッスンデータからタスクを生成するためのCloud Function
 * レッスンの要約情報を元に練習タスクを生成します
 */
export const generateTasksFromLessons = onCall(
  {
    region: FUNCTION_REGION,
    memory: "4GiB",
    timeoutSeconds: DEFAULT_TIMEOUT,
    maxInstances: 10,
  },
  async (request) => {
    // 認証チェック - v2では新しい方法で認証情報にアクセス
    if (!request.auth) {
      throw createError(
        ErrorType.UNAUTHENTICATED,
        "この機能を使用するにはログインが必要です"
      );
    }

    const data = request.data;
    // リクエストのバリデーション（新しいデータ形式に対応）
    if (!data || (!data.summaries && !data.lessons)) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "レッスンデータが必要です"
      );
    }

    try {
      // サマリーデータを取得（新旧形式両方に対応）
      const summaries = data.summaries || 
                      (data.lessons && Array.isArray(data.lessons) ? 
                        data.lessons.map((lesson: any) => lesson.summary || "") : 
                        []);
      
      // デバッグ情報を追加
      logger.info("受信データ:", JSON.stringify(data));
      logger.info("サマリー抽出結果:", summaries);
                        
      if (!summaries.length) {
        throw createError(
          ErrorType.INVALID_ARGUMENT,
          "有効なレッスンサマリーが必要です"
        );
      }
      
      // 空文字のサマリーをチェック
      const validSummaries = summaries.filter((s: string) => s && s.trim().length > 0);
      logger.info("有効なサマリー数:", validSummaries.length);
      
      if (validSummaries.length === 0) {
        throw createError(
          ErrorType.INVALID_ARGUMENT,
          "有効な内容を含むレッスンサマリーが必要です"
        );
      }
      
      const instrument = data.instrument || "ピアノ"; // デフォルト楽器
      logger.info("使用する楽器:", instrument);
      
      // レッスンサマリーからプロンプトを作成（簡略化）
      const prompt = createSimplifiedPrompt(validSummaries, instrument);

      // Dify API呼び出しの準備
      const messageData = {
        message: prompt,
        conversationId: data.conversationId || "",
        roomId: "practice-menu", // 固定の部屋ID
      };

      // Dify API呼び出し - 親モジュールの関数を使用
      logger.info("callDifyAPI関数を使用してAPIを呼び出し開始...");
      
      try {
        // 親モジュールのcallDifyAPI関数にアクセスできない場合は自前で実装
        const {apiKey, appId} = await getDifySecrets();
        const difyResponse = await callDifyAPI(messageData, instrument, request.auth.uid, apiKey, appId);
        
        if (!difyResponse || !difyResponse.answer) {
          logger.error("Dify APIからの応答が不完全です:", difyResponse);
          throw createError(
            ErrorType.INTERNAL,
            "APIレスポンスの形式が無効です"
          );
        }
      
        logger.info("Dify APIレスポンス成功:", difyResponse.answer.substring(0, 100) + "...");
        
        // レスポンスからタスクデータを抽出
        const taskData = parseTaskContent(difyResponse.answer);
        
        // 返却データの検証
        if (!taskData || !taskData.practice_points) {
          logger.error("パース結果が無効:", taskData);
          throw createError(
            ErrorType.INTERNAL,
            "タスクデータの形式が無効です"
          );
        }
        
        return taskData;
      } catch (apiError: unknown) {
        logger.error("Dify API呼び出しエラー:", apiError);
        throw createError(
          ErrorType.INTERNAL,
          `AIサービス呼び出しエラー: ${(apiError as Error).message || "不明なエラー"}`
        );
      }
    } catch (error: any) {
      logger.error("タスク生成エラー:", error);
      
      // エラー種別を判断して適切なエラーを返す
      if (error.code) {
        // 既にErrorTypeでラップされているエラーはそのまま投げる
        throw error;
      } else if (error.response) {
        // APIからのレスポンスエラー
        logger.error("APIエラーレスポンス:", error.response.data);
        throw createError(
          ErrorType.INTERNAL,
          `Dify API エラー: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        // リクエストは送信されたがレスポンスがない
        throw createError(
          ErrorType.UNAVAILABLE,
          "APIからの応答がありません。ネットワークまたはAPIの問題です。"
        );
      } else {
        // リクエスト設定時のエラー
        throw createError(
          ErrorType.INTERNAL,
          `リクエスト準備中のエラー: ${error.message}`
        );
      }
    }
  });

/**
 * レッスンサマリーからシンプルなプロンプトを作成
 */
function createSimplifiedPrompt(summaries: string[], instrument: string): string {
  // サマリーテキストを結合
  const summaryText = summaries.filter(Boolean).join("\n\n----------\n\n");

  // プロンプトを作成
  let prompt = `以下のレッスンサマリーに基づいて、${instrument}の練習タスクを作成してください。\n\n`;
  prompt += summaryText || "レッスンサマリーはありませんが、一般的な練習メニューを作成してください。";
  prompt += `\n\n上記のレッスン内容から、効果的な練習タスクを作成してください。以下の情報を含めてください：
1. 練習目標（5つ程度の具体的な目標）
2. テクニカル練習（3〜5つの技術練習）
3. 曲練習のポイント（レッスンで取り上げられた曲の練習方法）
4. 解釈とアドバイス（音楽的表現に関するアドバイス）

JSONフォーマットで返してください。以下の構造を使用してください：
{
  "practice_points": ["目標1", "目標2", ...],
  "technical_exercises": ["練習1", "練習2", ...],
  "piece_practice": ["ポイント1", "ポイント2", ...],
  "interpretation_advice": "アドバイスのテキスト"
}`;

  return prompt;
}

/**
 * Dify APIを呼び出す（親モジュールのcallDifyAPIが使えない場合のフォールバック）
 */
async function callDifyAPI(data: any, instrumentName: string, userId: string, apiKey: string, appId: string): Promise<DifyAPIResponse> {
  try {
    // 楽器名を正規化
    const normalizedInstrument = normalizeInstrumentName ? 
      normalizeInstrumentName(instrumentName) : instrumentName.toLowerCase();
    logger.info(`楽器名を正規化: "${instrumentName}" → "${normalizedInstrument}"`);
    
    // まずワークフローエンドポイントを試す
    try {
      return await callDifyWorkflow(apiKey, appId, data, normalizedInstrument, userId);
    } catch (workflowError) {
      // ワークフローが失敗した場合、通常のチャットエンドポイントを試す
      logger.warn("ワークフローエンドポイント失敗、チャットエンドポイントを試します", workflowError);
      return await callDifyChat(apiKey, appId, data, normalizedInstrument, userId);
    }
  } catch (error) {
    logger.error("Dify API呼び出しエラー:", error);
    
    if (axios.isAxiosError(error)) {
      throw createError(
        ErrorType.INTERNAL,
        `Dify API呼び出しエラー: ${error.message}`,
        {
          status: error.response?.status,
          data: error.response?.data,
        }
      );
    }
    
    throw error;
  }
}

/**
 * Dify ワークフローエンドポイントを呼び出す
 */
async function callDifyWorkflow(apiKey: string, appId: string, data: any, instrument: string, userId: string): Promise<DifyAPIResponse> {
  const workflowEndpoint = "https://api.dify.ai/v1/workflows/run";
  logger.info("使用するエンドポイント:", workflowEndpoint);
  
  const response = await axios.post(
    workflowEndpoint,
    {
      workflow_id: appId,
      inputs: {
        chat_history: "",
        instrument: instrument,
        skill_level: "",
        practice_content: "",
        specific_goals: "",
        summary: "",
        pieces: "",
        roomId: data.roomId || "",
        summaries: data.summaries || "",
      },
      query: data.message,
      user: userId,
    },
    {
      headers: {
        "Authorization": "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30秒タイムアウト
    }
  );
  
  logger.info("Dify APIレスポンスステータス:", response.status + " " + response.statusText);
  
  // ログにDifyの返答の主要部分だけを出力
  if (response.data && response.data.answer) {
    logger.info("Dify AIの応答:", response.data.answer.substring(0, 100) + "...");
  }
  
  const answer = response.data.outputs?.answer === "♪エラー♪" || response.data.answer === "♪エラー♪" ?
    "楽器種類の指定がないため、応答できません。プロフィール設定で楽器を選択してからお試しください。" :
    response.data.outputs?.answer || response.data.answer || "応答がありませんでした";
  
  // 成功応答を返す
  return {
    success: true,
    answer: answer,
    conversationId: response.data.outputs?.conversation_id || response.data.conversation_id || data.conversationId || "",
  };
}

/**
 * Dify チャットエンドポイントを呼び出す
 */
async function callDifyChat(apiKey: string, appId: string, data: any, instrument: string, userId: string): Promise<DifyAPIResponse> {
  const chatEndpoint = "https://api.dify.ai/v1/chat-messages";
  logger.info("使用するエンドポイント:", chatEndpoint);
  
  const response = await axios.post(
    chatEndpoint,
    {
      inputs: {
        chat_history: "",
        instrument: instrument,
        skill_level: "",
        practice_content: "",
        specific_goals: "",
        summary: "",
        pieces: "",
        roomId: data.roomId || "",
        summaries: data.summaries || "",
      },
      query: data.message,
      response_mode: "blocking",
      conversation_id: data.conversationId || "",
      user: userId,
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );
  
  logger.info("Dify チャットAPIレスポンスステータス:", response.status);
  
  const answer = response.data.answer === "♪エラー♪" ? 
    "楽器種類の指定がないため、応答できません。プロフィール設定で楽器を選択してからお試しください。" : 
    response.data.answer || "応答がありませんでした";
  
  return {
    success: true,
    answer: answer,
    conversationId: response.data.conversation_id || data.conversationId || "",
  };
}

/**
 * タスク内容をパースしてJSONオブジェクトに変換
 */
function parseTaskContent(content: string): any {
  try {
    logger.info("タスク内容パース開始:", content.substring(0, 100) + "...");
    
    if (!content || content.trim() === "") {
      logger.error("APIからの応答の内容が空です");
      throw createError(
        ErrorType.INTERNAL,
        "APIからの応答の内容が空です"
      );
    }
    
    // JSONレスポンスを抽出
    let taskData;
    try {
      // JSON形式が```json...```で囲まれているケース
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        logger.info("Markdown形式JSONを検出");
        taskData = JSON.parse(jsonMatch[1]);
      } else if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
        // 直接JSONが返ってきたケース
        logger.info("直接JSON形式を検出");
        taskData = JSON.parse(content);
      } else {
        // JSONでない場合、コンテンツから構造化データを抽出
        logger.info("非JSON形式のレスポンス、データ抽出を試みます");
        // フォールバックのデフォルト値を作成
        taskData = createDefaultTaskData(content);
      }
    } catch (e: any) {
      logger.error("JSONパースエラー:", e);
      logger.info("JSONパースに失敗、デフォルト値を使用");
      // JSONパースに失敗した場合は、デフォルト値を使用
      taskData = createDefaultTaskData(content);
    }
    
    // データの検証とフォールバック
    if (!taskData.practice_points || !Array.isArray(taskData.practice_points)) {
      logger.info("practice_pointsが無効、デフォルト値を使用");
      taskData.practice_points = extractListItems(content, "練習目標") || 
        ["正確なリズムの練習", "音色の統一", "表現力の向上", "テクニックの改善", "楽曲理解の深化"];
    }
    
    if (!taskData.technical_exercises || !Array.isArray(taskData.technical_exercises)) {
      logger.info("technical_exercisesが無効、デフォルト値を使用");
      taskData.technical_exercises = extractListItems(content, "テクニカル練習") || 
        ["スケール練習", "アルペジオ練習", "リズム練習"];
    }
    
    if (!taskData.piece_practice || !Array.isArray(taskData.piece_practice)) {
      logger.info("piece_practiceが無効、デフォルト値を使用");
      taskData.piece_practice = extractListItems(content, "曲練習") || 
        ["難しいフレーズを分割して練習", "メトロノームを使った練習", "表現の工夫"];
    }
    
    if (!taskData.interpretation_advice || typeof taskData.interpretation_advice !== "string") {
      logger.info("interpretation_adviceが無効、デフォルト値を使用");
      taskData.interpretation_advice = extractParagraph(content, "解釈とアドバイス") || 
        "音楽の流れと感情表現を大切にしましょう。テクニックだけでなく、曲の持つ感情や物語を表現することを意識して練習を進めてください。";
    }
    
    logger.info("最終的なタスクデータ:", taskData);
    return taskData;
  } catch (e: any) {
    logger.error("タスクレスポンス処理エラー:", e);
    throw createError(
      ErrorType.INTERNAL,
      `タスクレスポンスの処理に失敗: ${e.message}`
    );
  }
}

/**
 * デフォルトのタスクデータを作成
 */
function createDefaultTaskData(content: string): any {
  // テキストからリストアイテムを抽出
  return {
    practice_points: extractListItems(content, "練習目標") || 
      ["正確なリズムの練習", "音色の統一", "表現力の向上", "テクニックの改善", "楽曲理解の深化"],
    technical_exercises: extractListItems(content, "テクニカル練習") || 
      ["スケール練習", "アルペジオ練習", "リズム練習"],
    piece_practice: extractListItems(content, "曲練習") || 
      ["難しいフレーズを分割して練習", "メトロノームを使った練習", "表現の工夫"],
    interpretation_advice: extractParagraph(content, "解釈とアドバイス") || 
      "音楽の流れと感情表現を大切にしましょう。テクニックだけでなく、曲の持つ感情や物語を表現することを意識して練習を進めてください。",
  };
}

/**
 * テキストからリストアイテムを抽出
 */
function extractListItems(text: string, sectionName: string): string[] | null {
  try {
    // セクション名の後にあるリストアイテムを抽出
    const regexPattern = new RegExp(`${sectionName}[：:]*\\s*\\n+((?:[\\-•*]\\s*[^\\n]+\\n*)+)`, "i");
    const match = text.match(regexPattern);
    
    if (match && match[1]) {
      // リストアイテムを行ごとに分割して整形
      const items = match[1].split("\n")
        .map((line) => line.trim().replace(/^[\-•*]\s*/, ""))
        .filter((item) => item.length > 0);
      
      return items.length > 0 ? items : null;
    }
    
    // 番号付きリストの場合
    const numberedPattern = new RegExp(`${sectionName}[：:]*\\s*\\n+((?:\\d+\\.\\s*[^\\n]+\\n*)+)`, "i");
    const numberedMatch = text.match(numberedPattern);
    
    if (numberedMatch && numberedMatch[1]) {
      // 番号付きリストアイテムを行ごとに分割して整形
      const items = numberedMatch[1].split("\n")
        .map((line) => line.trim().replace(/^\d+\.\s*/, ""))
        .filter((item) => item.length > 0);
      
      return items.length > 0 ? items : null;
    }
    
    return null;
  } catch (e) {
    logger.error(`${sectionName}の抽出に失敗:`, e);
    return null;
  }
}

/**
 * テキストから段落を抽出
 */
function extractParagraph(text: string, sectionName: string): string | null {
  try {
    // セクション名の後にある段落を抽出
    const regexPattern = new RegExp(`${sectionName}[：:]*\\s*\\n+([\\s\\S]*?)(?=\\n+##|\\n+[0-9#]|\$)`, "i");
    const match = text.match(regexPattern);
    
    if (match && match[1]) {
      return match[1].trim();
    }
    
    return null;
  } catch (e) {
    logger.error(`${sectionName}の抽出に失敗:`, e);
    return null;
  }
} 
