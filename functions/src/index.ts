/**
 * Cloud Functions エントリポイント
 * 
 * アプリのCloud Functions機能のメインエントリポイントです。
 * 各モジュールからの機能をエクスポートし、初期設定を行います。
 */

// Firebase 関連
import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// ユーティリティ
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import axios from "axios";

// プロジェクトモジュール
import {generateTasksFromLessons} from "./practice-menu";

// Firebaseの初期化（まだ初期化されていない場合）
if (admin.apps.length === 0) {
admin.initializeApp();
  logger.info("Firebase Admin SDK初期化完了");
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
      name: "projects/lesson-manager-99ab9/secrets/dify-standard-api-key/versions/latest",
    });
    
    const [appIdVersion] = await secretManager.accessSecretVersion({
      name: "projects/lesson-manager-99ab9/secrets/dify-standard-app-id/versions/latest",
    });

    const apiKey = apiKeyVersion.payload?.data?.toString();
    const appId = appIdVersion.payload?.data?.toString();

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
 * 楽器名を正規化する
 * 例: woodwind-saxophone-standard → saxophone
 */
function normalizeInstrumentName(instrument: string): string {
  if (!instrument) return "saxophone"; // デフォルト値
  
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
 * AIアシスタントにメッセージを送信するCloud Function
 */
export const sendMessage = onCall(
  {
    enforceAppCheck: false,
    cors: true,
    memory: "256MiB",
    invoker: "public",
    region: "asia-northeast1",
  },
  async (request) => {
    const data: any = request.data;
    
    try {
      // パラメータをログに出力
      logger.info("sendMessage関数が呼び出されました", {
        messageLength: data.message ? data.message.length : 0,
        conversationId: data.conversationId || "(新規)",
        instrument: data.instrument || "(なし)",
        roomId: data.roomId || "(なし)",
        isTestMode: !!data.isTestMode,
        auth: request.auth ? "認証済み" : "未認証",
      });

      // 認証必須の処理
      if (!request.auth) {
        logger.error("認証されていないユーザーからのリクエストを拒否しました");
        throw new HttpsError(
          "unauthenticated",
          "この機能を使用するには認証が必要です"
        );
      }

      // 認証ユーザーのIDを記録
      const authUid = request.auth.uid;
      logger.info("認証ユーザーID:", authUid);

      // テストモードの場合はエコー応答
      if (data.isTestMode === true) {
        return handleTestModeResponse(data, authUid);
      }
      
      // 必須パラメータの検証
      validateMessageParams(data);

      // 楽器情報の取得
      const instrumentName = await getInstrumentFromProfile(request.auth.uid, data.instrument);

      // Dify API呼び出し
      return await callDifyAPI(data, instrumentName, authUid);
    } catch (error: any) {
      // エラー処理を一貫化
      logger.error("処理エラー:", error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "メッセージの送信に失敗しました",
        {original: String(error)}
      );
    }
  },
);

/**
 * レッスンからタスクを作成するCloud Function
 */
export const createTaskFromLesson = onCall(
  {
    enforceAppCheck: false,
    cors: true,
    memory: "256MiB",
    invoker: "public",
    region: "asia-northeast1",
    maxInstances: 10,
  },
  async (request) => {
    const data: any = request.data;
    
    try {
      // パラメータをログに出力
      logger.info("createTaskFromLesson関数が呼び出されました", {
        lessonId: data.lessonId || "(なし)",
        summaryLength: data.summary ? data.summary.length : 0,
        piecesCount: Array.isArray(data.pieces) ? data.pieces.length : 0,
        teacher: data.teacher || "(なし)",
        chatInfo: data.isFromChat ? "チャットから呼び出し" : "レッスンから呼び出し",
        auth: request.auth ? "認証済み" : "未認証",
      });

      // 認証必須の処理
      if (!request.auth) {
        logger.error("認証されていないユーザーからのリクエストを拒否しました");
        throw new HttpsError(
          "unauthenticated",
          "この機能を使用するには認証が必要です"
        );
      }

      // 認証ユーザーのIDを記録
      const authUid = request.auth.uid;
      logger.info("認証ユーザーID:", authUid);
      
      // 必須パラメータの検証
      if (!data.summary) {
        throw new HttpsError(
          "invalid-argument", 
          "レッスンの要約が必要です"
        );
      }

      // 楽器情報の取得
      const instrumentName = await getInstrumentFromProfile(request.auth.uid, data.instrument);
      logger.info(`使用する楽器: ${instrumentName}`);

      // タスク作成のプロンプトを作成
      const prompt = createTaskPromptFromLesson(data.summary, instrumentName, data.pieces, data.teacher);
      logger.info(`生成されたプロンプト（先頭100文字）: ${prompt.substring(0, 100)}...`);

      // Dify API呼び出しの準備
      const taskData = {
        message: prompt,
        conversationId: data.conversationId || "",
        roomId: data.chatTitle ? `task-${Date.now()}` : "lesson-task", // チャットからの場合は一意のroomIdを生成
      };

      // Dify API呼び出し
      logger.info("Dify API呼び出しを開始します（タスク生成）...");
      const apiResponse = await callDifyAPI(taskData, instrumentName, authUid);
      
      // レスポンスチェック
      if (!apiResponse || !apiResponse.answer) {
        logger.error("Dify APIからの応答が不完全です", apiResponse);
        throw new Error("タスク生成のレスポンスが不正です");
      }
      
      logger.info(`APIレスポンス（先頭100文字）: ${apiResponse.answer.substring(0, 100)}...`);
      
      // 成功レスポンスを返す
      return {
        success: true,
        tasks: apiResponse.answer,
        conversationId: apiResponse.conversationId || "",
      };
    } catch (error: any) {
      // エラー処理を一貫化
      logger.error("タスク作成中のエラー:", error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "タスク作成に失敗しました",
        {original: String(error)}
      );
    }
  },
);

/**
 * レッスンからタスク作成用のプロンプトを作成
 */
function createTaskPromptFromLesson(summary: string, instrument: string, pieces: string[] = [], teacher = ""): string {
  // プロンプトを作成
  let prompt = `以下のレッスン情報に基づいて、${instrument}の練習タスクを作成してください。\n\n`;
  
  if (teacher) {
    prompt += `講師: ${teacher}\n`;
  }
  
  if (pieces && pieces.length > 0) {
    prompt += `曲目: ${pieces.join(", ")}\n`;
  }
  
  prompt += `レッスン要約: ${summary}\n\n`;
  
  prompt += `上記のレッスン内容から、効果的な練習タスクを作成してください。
各タスクは以下の形式でマークダウン形式で返してください：

# タスク名1
タスクの詳細な説明

# タスク名2
タスクの詳細な説明

...

タスクは3〜5個程度作成し、それぞれが具体的で実行可能なものにしてください。
レッスンで指摘された問題点や練習すべきポイントに焦点を当ててください。`;

  return prompt;
}

/**
 * テストモード用のレスポンス
 */
async function handleTestModeResponse(data: any, /* Unused parameter */ _: string): Promise<any> {
  logger.info("テストモードでリクエストを処理:", {
    message: data.message.substring(0, 30) + "...",
    conversationId: data.conversationId,
  });

  return {
    success: true,
    answer: `[テストモード] あなたのメッセージ「${data.message}」を受け取りました。これはテストレスポンスです。`,
    conversationId: data.conversationId || "test-conversation-id",
  };
}

/**
 * メッセージパラメータの検証
 */
function validateMessageParams(data: any): void {
  if (!data.message) {
    throw new HttpsError(
      "invalid-argument",
      "メッセージは必須です"
    );
  }

  if (!data.roomId) {
    throw new HttpsError(
      "invalid-argument",
      "roomIdは必須です"
    );
  }
}

/**
 * ユーザープロファイルから楽器情報を取得
 */
async function getInstrumentFromProfile(userId: string, defaultInstrument = ""): Promise<string> {
  let instrumentFromProfile = "";
  
  try {
    const userProfileRef = admin.firestore().collection("users").doc(userId);
    const userProfile = await userProfileRef.get();
    
    if (userProfile.exists) {
      const profileData = userProfile.data();
      
      // 三層構造の楽器情報を取得
      const instrumentCategory = profileData?.instrumentCategory || "";
      const instrumentName = profileData?.instrumentName || "";
      const instrumentModel = profileData?.instrumentModel || "";
      
      logger.info(`ユーザープロファイルから楽器情報を取得: カテゴリ="${instrumentCategory}", 楽器="${instrumentName}", モデル="${instrumentModel}"`);
      
      // 楽器名を小文字で取得（メインの楽器名を優先）
      if (instrumentName) {
        instrumentFromProfile = instrumentName.toLowerCase();
      } else if (instrumentCategory) {
        // カテゴリのみがある場合はそれを使用
        instrumentFromProfile = instrumentCategory.toLowerCase();
      }
      
      logger.info(`使用する楽器名: "${instrumentFromProfile}"`);
    } else {
      logger.info("ユーザープロファイルが見つかりません");
    }
  } catch (profileError) {
    logger.error("ユーザープロファイル取得エラー:", profileError);
  }
  
  // プロファイルの楽器情報が取得できなかった場合はデフォルト値を使用
  return instrumentFromProfile || defaultInstrument || "";
}

/**
 * Dify APIを呼び出す
 */
async function callDifyAPI(data: any, instrumentName: string, userId: string): Promise<any> {
  try {
    const {apiKey, appId} = await getDifySecrets();
    
    // 認証情報の詳細（機密情報を隠して）をログに出力
    logger.info("Dify API認証情報:", {
      apiKeyLength: apiKey.length, 
      apiKeyPrefix: apiKey.substring(0, 4), 
      appIdLength: appId.length, 
      appIdPrefix: appId.substring(0, 4),
    });
    
    logger.info("Dify API呼び出しを開始します...");
    
    // 楽器名を正規化
    const normalizedInstrument = normalizeInstrumentName(instrumentName);
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
      throw new HttpsError(
        "internal",
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
async function callDifyWorkflow(apiKey: string, appId: string, data: any, instrument: string, userId: string): Promise<any> {
  const workflowEndpoint = "https://api.dify.ai/v1/workflows/run";
  logger.info("使用するエンドポイント:", workflowEndpoint);
  
  const response = await axios.post(
    workflowEndpoint,
    {
      workflow_id: appId,
      inputs: {
        instrument: instrument,
        roomId: data.roomId || "",
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
async function callDifyChat(apiKey: string, appId: string, data: any, instrument: string, userId: string): Promise<any> {
  const chatEndpoint = "https://api.dify.ai/v1/chat-messages";
  logger.info("使用するエンドポイント:", chatEndpoint);
  
  const response = await axios.post(
    chatEndpoint,
    {
      inputs: {
        instrument: instrument,
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

// Firebase Cloud Functions エクスポート
export {generateTasksFromLessons};

// 他のモジュールで必要な関数をエクスポート
export * from "./summaries";
export * from "./common/errors";
