// @ts-nocheck
/**
 * Cloud Functions エントリポイント
 * 
 * アプリのCloud Functions機能のメインエントリポイントです。
 * 各モジュールからの機能をエクスポートし、初期設定を行います。
 */

// Firebase 関連
import {onCall, onRequest, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import * as functions from "firebase-functions";
import { onSchedule } from 'firebase-functions/v2/scheduler';

// ユーティリティ
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import axios from "axios";

// プロジェクトモジュール
import {generateTasksFromLessons} from "./practice-menu/index";
import { practiceMenuFunctions } from './practice-menu';
import { testOpenAIConnection, generatePracticeRecommendation } from './practice-menu/genkit';
import { setAdminRole, initializeAdmin } from './tools/admin-setup';
import { FUNCTION_REGION } from './config';
import { processAudioOnUpload } from './summaries';

// Firebaseの初期化（まだ初期化されていない場合）
if (admin.apps.length === 0) {
admin.initializeApp();
  logger.info("Firebase Admin SDK初期化完了");
}

// テスト用のhelloWorld関数
export const helloWorld = onCall(
  {
    region: "asia-northeast1",
    memory: "256Mi",
    timeoutSeconds: 60,
  },
  async (request) => {
    logger.info("helloWorld関数が呼び出されました", {
      auth: request.auth,
      data: request.data,
    });

    try {
      return {
        success: true,
        message: "Hello, World!",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("helloWorld関数でエラーが発生しました", error);
      throw new HttpsError("internal", "内部エラーが発生しました");
    }
  }
);

// 実際に使用している関数は復元
async function getDifySecrets(): Promise<{ apiKey: string, appId: string }> {
  try {
    console.log('Difyシークレット取得中...');
    const client = new SecretManagerServiceClient();
    
    // シークレット名を組み立て
    const apiKeyName = `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-api-key/versions/latest`;
    const appIdName = `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-app-id/versions/latest`;
    
    console.log(`シークレット名: ${apiKeyName}, ${appIdName}`);
    
    // 並行してシークレットを取得
    const [apiKeyResponse, appIdResponse] = await Promise.all([
      client.accessSecretVersion({ name: apiKeyName }),
      client.accessSecretVersion({ name: appIdName })
    ]);
    
    // 値を取得
    const apiKey = apiKeyResponse[0].payload?.data?.toString() || '';
    const appId = appIdResponse[0].payload?.data?.toString() || '';
    
    // シークレットが取得できたかチェック
    if (!apiKey || !appId) {
      throw new Error('Difyシークレットが見つかりません');
    }
    
    console.log('Difyシークレット取得成功');
    
    return { apiKey, appId };
  } catch (error) {
    console.error('Difyシークレット取得エラー:', error);
    throw new Error('Difyシークレットの取得に失敗しました');
  }
}

// 未使用の関数をコメントアウト
/*
async function getArtistDifySecrets(): Promise<{ apiKey: string, appId: string }> {
  try {
    console.log('アーティストモデル用Difyシークレット取得中...');
    const client = new SecretManagerServiceClient();
    
    // シークレット名を組み立て
    const apiKeyName = `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-saxophone-artist-api-key/versions/latest`;
    const appIdName = `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-saxophone-artist-app-id/versions/latest`;
    
    console.log(`アーティストモデル用シークレット名: ${apiKeyName}, ${appIdName}`);
    
    // 並行してシークレットを取得
    const [apiKeyResponse, appIdResponse] = await Promise.all([
      client.accessSecretVersion({ name: apiKeyName }),
      client.accessSecretVersion({ name: appIdName })
    ]);
    
    // 値を取得
    const apiKey = apiKeyResponse[0].payload?.data?.toString() || '';
    const appId = appIdResponse[0].payload?.data?.toString() || '';
    
    // シークレットが取得できたかチェック
    if (!apiKey || !appId) {
      throw new Error('アーティストモデル用Difyシークレットが見つかりません');
    }
    
    console.log('アーティストモデル用Difyシークレット取得成功');
    
    return { apiKey, appId };
  } catch (error) {
    console.error('アーティストモデル用Difyシークレット取得エラー:', error);
    throw new Error('アーティストモデル用Difyシークレットの取得に失敗しました');
  }
}
*/

// 未使用の関数をコメントアウト
/*
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
*/

/**
 * チャットメッセージ送信関数
 */
export const sendMessage = onCall({
  memory: '256MiB',
  region: 'asia-northeast1',
  timeoutSeconds: 300,
  minInstances: 0,
  maxInstances: 100,
  enforceAppCheck: false,
  invoker: 'authenticated'
}, async (request) => {
  try {
    // リクエストデータが無い場合はエラー
    if (!request.data) {
      throw new Error('メッセージデータがありません');
    }
    
    // ユーザー認証チェック
    if (!request.auth) {
      throw new Error('認証されていないユーザーはこの機能を使用できません');
    }
    
    // リクエストパラメータのログ（より詳細なバージョン）
    console.log('メッセージ送信リクエスト詳細:', {
      messageContent: request.data.message?.substring(0, 50) + (request.data.message?.length > 50 ? '...' : ''),
      messageLength: request.data.message?.length || 0,
      hasConversationId: !!request.data.conversationId,
      conversationId: request.data.conversationId,
      instrument: request.data.modelId || request.data.instrument || 'standard',
      isArtistModel: !!request.data.useArtistModel,
      artistName: request.data.artistName,
      hasRoomId: !!request.data.roomId,
      roomId: request.data.roomId,
      userUid: request.auth.uid.substring(0, 6) + '...'
    });
    
    // パラメータのバリデーション
    if (!request.data.message) {
      console.warn('リクエストボディにデータが不足しています:', request.data);
      throw new Error('メッセージが空です');
    }
    
    try {
      // Dify APIを直接呼び出す
      const result = await callDifyAPI(
        request.data.message,
        request.data.conversationId || '',
        request.data.modelId || request.data.instrument || 'standard',
        request.auth.uid,
        request.data.roomId,
        request.data.skillLevel,
        request.data.artistName,
        request.data.useArtistModel
      );
      
      return result;
    } catch (apiError: any) {
      // API呼び出しエラーの詳細をログ出力
      console.error('Dify API呼び出しエラー:', apiError);
      
      // モデル過負荷エラー（503 ServiceUnavailable）を確認
      const errorMessage = apiError?.message || '';
      const isModelOverloadError = (typeof errorMessage === 'string') && 
                                 (errorMessage.includes('503') || 
                                 errorMessage.includes('ServiceUnavailable'));
      
      // エラーでもデフォルトの応答を返す
      return {
        success: false,
        answer: isModelOverloadError 
          ? 'AIモデルが現在混雑しています。しばらく経ってからもう一度お試しください。'
          : 'AIからの応答を取得できませんでした。時間をおいて再度お試しください。',
        conversationId: request.data.conversationId || '',
        messageId: `error-${Date.now()}`,
        created: new Date().toISOString(),
        error: {
          message: apiError.message || 'Unknown API error',
          code: apiError.code || 'UNKNOWN_ERROR'
        }
      };
    }
  } catch (error: any) {
    console.error('チャットメッセージ送信エラー:', error);
    
    // 一般的なエラーでもレスポンスを返す
    return {
      success: false,
      answer: 'メッセージの処理中にエラーが発生しました。後でもう一度お試しください。',
      messageId: `error-${Date.now()}`,
      conversationId: request.data?.conversationId || '',
      created: new Date().toISOString(),
      error: {
        message: error.message || 'チャットメッセージの送信中にエラーが発生しました',
        code: error.code || 'UNKNOWN_ERROR',
        details: error.details
      }
    };
  }
});

/**
 * Dify APIを使用してタスクを生成する共通関数
 * レッスンサマリーまたはチャットのいずれかを入力として使用できる
 */
async function createTaskFromDify(
  userId: string,
  data: {
    // 共通パラメータ
    instrument?: string;
    roomId?: string;
    
    // レッスンから生成する場合のパラメータ
    lessonId?: string;
    summary?: string;
    pieces?: string[];
    teacher?: string;
    
    // チャットから生成する場合のパラメータ
    messages?: any[];
    chatTitle?: string;
    chatTopic?: string;
    skill_level?: string;
    practice_content?: string;
    specific_goals?: string;
  }
): Promise<any> {
  try {
    logger.info("タスク生成の共通処理を開始", {
      userId,
      isFromLesson: !!data.summary,
      isFromChat: !!data.messages,
      hasInstrument: !!data.instrument,
    });
    
    // 楽器情報の取得
    const instrumentName = await getInstrumentFromProfile(userId, data.instrument);
    logger.info(`使用する楽器: ${instrumentName}`);
    
    // Difyシークレットを取得
    const {apiKey, appId} = await getDifySecrets();
    if (!apiKey || !appId) {
      throw new Error("API設定の取得に失敗しました");
    }
    
    // レッスンサマリーからの場合
    if (data.summary) {
      // タスク作成のプロンプトを作成
      const prompt = createTaskPromptFromLesson(
        data.summary,
        instrumentName,
        data.pieces || [],
        data.teacher || ""
      );
      
      logger.info(`生成されたプロンプト（先頭100文字）: ${prompt.substring(0, 100)}...`);
      
      // Dify API呼び出しの準備
      const taskData = {
        message: prompt,
        roomId: data.roomId || "lesson-task",
      };
      
      // Dify API呼び出し
      logger.info("レッスンサマリーからタスク生成のためにDify APIを呼び出します");
      const apiResponse = await callDifyChat(apiKey, appId, taskData, instrumentName, userId);
      
      return {
        success: apiResponse.success,
        tasks: apiResponse.answer,
        conversationId: apiResponse.conversationId || "",
      };
    }
    
    // チャットからの場合
    if (data.messages && data.messages.length > 0) {
      // チャット履歴をフォーマット (コメントアウトして未使用警告を解消)
      // const chatHistory = data.messages
      //   .map((msg: any) => `${msg.sender}: ${msg.content}`)
      //   .join("\n");
      
      // クエリ文を作成
      const query = `${data.chatTopic || "練習メニュー"}に関する${instrumentName}の練習メニューを作成してください。`;
      
      // Dify API呼び出しの準備
      const taskData = {
        message: query,
        roomId: data.roomId || `chat-task-${Date.now()}`,
        skill_level: data.skill_level || "初級",
        practice_content: data.practice_content || "",
        specific_goals: data.specific_goals || data.chatTopic || "",
        chatTopic: data.chatTopic || "",
      };
      
      // Dify API呼び出し
      logger.info("チャットからタスク生成のためにDify APIを呼び出します");
      const apiResponse = await callDifyChat(apiKey, appId, taskData, instrumentName, userId);
      
      return {
        success: apiResponse.success,
        tasks: apiResponse.answer,
        message_id: apiResponse.taskId || null,
        conversation_id: apiResponse.conversationId || "",
      };
    }
    
    // 入力がない場合はエラー
    throw new Error("タスク生成に必要な入力がありません");
  } catch (error: any) {
    logger.error("タスク生成の共通処理でエラーが発生しました:", error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "タスク生成に失敗しました",
      {original: String(error)}
    );
  }
}

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

      // 共通タスク生成関数を呼び出し
      return await createTaskFromDify(authUid, {
        lessonId: data.lessonId,
        summary: data.summary,
        pieces: data.pieces,
        teacher: data.teacher,
        roomId: data.roomId || "lesson-task",
      });
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

// 未使用の関数をコメントアウト
/*
async function handleTestModeResponse(data: any): Promise<any> {
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
*/

// 未使用の関数をコメントアウト
/*
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
*/

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
 * DifyのAPIを呼び出す関数
 */
async function callDifyAPI(
  message: string,
  conversationId: string,
  instrument: string,
  userId: string,
  roomId?: string,
  skillLevel?: string,
  artistName?: string,
  useArtistModel: boolean = false
): Promise<any> {
  try {
    // デバッグ情報：入力パラメータのログ記録
    console.log('callDifyAPI 入力パラメータ:', {
      message: message.length > 30 ? `${message.substring(0, 30)}...(${message.length}文字)` : message,
      conversationId,
      instrument,
      userId,
      roomId,
      skillLevel,
      artistName,
      useArtistModel
    });
    
    // 新しいシークレットを取得
    const secretClient = new SecretManagerServiceClient();
    const [apiKeyVersion] = await secretClient.accessSecretVersion({
      name: `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-saxophone-api-key/versions/latest`
    });
    const [appIdVersion] = await secretClient.accessSecretVersion({
      name: `projects/${process.env.GCLOUD_PROJECT}/secrets/dify-saxophone-app-id/versions/latest`
    });

    const apiKey = apiKeyVersion.payload?.data?.toString() || '';
    const appId = appIdVersion.payload?.data?.toString() || '';

    console.log('Dify シークレット取得結果:', {
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey.length,
      hasAppId: !!appId,
      appIdLength: appId.length
    });

    if (!apiKey || !appId) {
      throw new Error('Dify API設定の取得に失敗しました');
    }

    // モデル選択ロジック
    // アーティストモードが有効で、artistNameが指定されている場合はそれをモデルとして使用
    // そうでない場合は通常のモデル選択ロジックを使用
    let modelValue = "standard";
    let instrumentValue = "サクソフォン";
    
    if (useArtistModel && artistName) {
      // アーティスト名をモデル値として設定
      modelValue = artistName;
      console.log(`アーティストモデルを使用: ${modelValue}`);
    } else if (instrument === "standard" || instrument === "gpt-4" || instrument === "claude") {
      // 通常のモデル選択ロジック
      modelValue = instrument;
    } else {
      // それ以外の場合は楽器名として扱い、モデルはデフォルト値を使用
      instrumentValue = instrument || "サクソフォン";
    }
    
    console.log('使用するモデルと楽器:', {
      model: modelValue,
      instrument: instrumentValue
    });

    // リクエストデータの準備 - モデル名とinstrumentを正しく設定
    const requestBody = {
      inputs: {
        model: modelValue,        // モデル名（アーティスト名または標準モデル）
        instrument: instrumentValue, // 楽器名
        user_use: "chat"          // 常にchatを使用
      },
      query: message,
      user: userId,
      conversation_id: conversationId || undefined,
      response_mode: "blocking"
    };
    
    // リクエストの詳細内容をログ出力（機密情報は省略）
    console.log('Dify チャットリクエスト詳細:', JSON.stringify({
      inputs: requestBody.inputs,
      conversation_id: conversationId || '新規',
      query_full: message.length <= 100 ? message : `${message.substring(0, 100)}...(${message.length}文字)`,
      query_length: message.length
    }, null, 2));

    // リクエストヘッダーの準備
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Dify APIのエンドポイントURL - chat-messagesエンドポイントを使用
    const apiUrl = 'https://api.dify.ai/v1/chat-messages';

    // 開始時間を記録
    const startTime = Date.now();

    // APIリクエストを実行
    console.log(`Dify API呼び出し: ${apiUrl}, メッセージ長: ${message.length}文字`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody)
    });

    // 応答時間を計算
    const responseTime = Date.now() - startTime;
    console.log(`Dify API応答受信: ${responseTime}ms, ステータス: ${response.status}`);

    // レスポンスをJSONに変換
    const responseData = await response.json();
    
    // 完全なレスポンスデータをログに出力（デバッグ用）
    console.log('Dify API完全レスポンス:', JSON.stringify(responseData, null, 2));
    
    // エラーレスポンスの場合は詳細をログに記録
    if (!response.ok) {
      console.error('Dify APIエラーレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      throw new Error(responseData.message || `HTTP エラー ${response.status}`);
    }

    // レスポンスデータを整形して返す
    const result = {
      success: true,
      answer: responseData.answer ? responseData.answer : 'AIからの応答を生成中です。少し時間をおいて再度お試しください。',
      conversationId: responseData.conversation_id || '',
      messageId: responseData.id || `msg-${Date.now()}`,
      created: new Date().toISOString()
    };

    console.log('Dify API成功レスポンス:', {
      conversationId: result.conversationId,
      messageId: result.messageId,
      answerLength: result.answer.length,
      responseTime: `${responseTime}ms`
    });

    return result;
  } catch (error: any) {
    // エラーの詳細をログに記録
    console.error('Dify API呼び出しエラー:', {
      message: error.message,
      stack: error.stack,
      cause: error.cause
    });
    
    // エラーを再スロー
    throw error;
  }
}

/**
 * DifyのChat APIを呼び出す関数
 */
// callDifyChat関数は廃止し、callDifyAPI関数に統合します
async function callDifyChat(apiKey: string, appId: string, data: any, instrument: string, userId: string): Promise<any> {
  try {
    // callDifyAPI関数に必要なパラメータに変換して呼び出す
    return await callDifyAPI(
      data.message,
      data.conversationId || '',
      data.useArtistModel ? 'saxophone' : instrument,
      userId,
      data.roomId,
      data.skill_level,
      data.artistName,
      data.useArtistModel
    );
  } catch (error) {
    console.error('callDifyChat エラー (callDifyAPIに移行中):', error);
    throw error;
  }
}

// 関数のエクスポート
export {
  helloWorld,
  generateTasksFromLessons,
  // 管理者設定関連
  setAdminRole,
  initializeAdmin,
  processAudioOnUpload,
};

// 練習メニュー関連の関数をエクスポート
export const getSheetMusic = practiceMenuFunctions.getSheetMusic;
export const createPracticeMenu = practiceMenuFunctions.createPracticeMenu;
export const uploadSheetMusic = practiceMenuFunctions.uploadSheetMusic;
export { testOpenAIConnection, generatePracticeRecommendation };

/**
 * チャットルームの会話履歴からタスクを作成するCloud Function
 */
export const createTaskFromChat = onCall(
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
      logger.info("createTaskFromChat関数が呼び出されました", {
        messagesCount: Array.isArray(data.messages) ? data.messages.length : 0,
        chatTitle: data.chatTitle || "(なし)",
        chatTopic: data.chatTopic || "(なし)",
        hasInstrument: !!data.instrument,
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
      const userId = request.auth.uid;
      logger.info("認証ユーザーID:", userId);
      
      // 必須パラメータの検証
      if (!data.messages || !Array.isArray(data.messages) || data.messages.length === 0) {
        throw new HttpsError(
          "invalid-argument", 
          "メッセージが必要です"
        );
      }

      try {
        // 共通タスク生成関数を呼び出し
        return await createTaskFromDify(userId, {
          messages: data.messages,
          chatTitle: data.chatTitle,
          chatTopic: data.chatTopic,
          skill_level: data.skill_level,
          practice_content: data.practice_content,
          specific_goals: data.specific_goals,
          roomId: data.roomId || `chat-task-${Date.now()}`,
          instrument: data.instrument,
        });
      } catch (error: any) {
        // エラー処理
        logger.error(`チャットからのタスク生成エラー: ${error.message || "不明なエラー"}`, error);
        
        // フォールバック: 固定の練習メニューを返す
        logger.info("フォールバック: 固定の練習メニューを生成します");
        
        // フォールバックタスクを生成
        return generateFallbackTask(userId, data);
      }
    } catch (error: any) {
      // 外側のエラー処理
      logger.error("タスク生成関数全体のエラー:", error);
      
      if (error instanceof HttpsError) {
        throw error;
      }
      
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "タスク生成に失敗しました",
        {original: String(error)}
      );
    }
  },
);

// フォールバックタスク生成関数
function generateFallbackTask(userId: string, data: any) {
  const instrument = data.instrument || "ピアノ";
  
  // 楽器に合わせたフォールバックタスクを生成
  const fallbackTask = {
    title: `${instrument}の基本練習メニュー`,
    category: "基本練習",
    practice_points: [
      "正しい姿勢と基本フォームを意識する",
      "リズムを正確に取る",
      "音色と音質に注意する",
      "基礎技術の向上に集中する",
    ],
    technical_exercises: [
      "スケール練習（長調・短調）",
      "アルペジオ練習",
      "基本的な奏法の練習",
      "音階を使った指の独立練習",
    ],
    piece_practice: [
      "簡単な小品から始める",
      "部分練習を丁寧に行う",
      "テンポをゆっくり正確に練習する",
    ],
    interpretation_advice: `${instrument}の基本に忠実に練習しましょう。焦らずにじっくりと基礎を固めることが上達の近道です。正確なリズムと美しい音色を心がけて練習してください。`,
  };
  
  console.log("フォールバックタスク生成完了:", {
    instrument,
    title: fallbackTask.title,
  });
  
  return {
    success: false,
    error: "タスク生成APIに接続できませんでした",
    tasks: JSON.stringify(fallbackTask),
    fallback: true,
  };
}

/**
 * ユーティリティ：実行時の環境情報を返す関数
 */
export const getEnvironmentInfo = onCall(
  {
    region: "asia-northeast1",
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "認証が必要です");
    }

    // 実行環境情報を収集
    const envInfo = {
      projectId: process.env.GCLOUD_PROJECT || "unknown",
      region: process.env.FUNCTION_REGION || "unknown",
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      auth: {
        uid: request.auth.uid,
        token: {
          // トークン情報の一部を安全に返す
          iss: request.auth.token.iss,
          aud: request.auth.token.aud,
          exp: request.auth.token.exp,
        },
      },
    };

    return {
      success: true,
      environment: envInfo,
    };
  }
);

// テスト用の簡易関数を追加
export const testPracticeRecommendation = onCall({
  region: FUNCTION_REGION
}, async (request) => {
  if (!request.auth) {
    return {
      success: false,
      message: '認証が必要です',
      recommendations: []
    };
  }

  return {
    success: true,
    message: 'テスト成功',
    recommendations: [
      {
        id: 'test_1',
        title: 'テスト練習メニュー',
        description: 'これはテスト用の練習メニューです',
        difficulty: 'INTERMEDIATE',
        estimatedTime: '30分',
        category: 'テスト',
        steps: [
          {
            title: 'ステップ1',
            description: 'テストステップの説明',
            duration: 10
          }
        ]
      }
    ]
  };
});

/**
 * 予約されたアカウントの削除処理を行うスケジュール関数
 * 毎日午前3時に実行され、削除期限が過ぎたアカウントを削除する
 */
export const processScheduledAccountDeletions = onSchedule(
  {
    region: 'asia-northeast1',
    schedule: '0 3 * * *',  // 毎日午前3時に実行
    timeZone: 'Asia/Tokyo',
  },
  async (event) => {
    const now = admin.firestore.Timestamp.now();
    const db = admin.firestore();
    const auth = admin.auth();
    
    try {
      // 削除期限が過ぎたアカウントを検索
      const query = db.collection('accountDeletions')
        .where('scheduledForDeletion', '<=', now);
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        console.log('削除予定のアカウントはありません');
        return;
      }
      
      console.log(`${snapshot.size}件のアカウントを処理します`);
      
      // 各アカウントを処理
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const userId = data.userId;
        console.log(`ユーザー ${userId} の処理を開始します`);
        
        try {
          // ユーザーデータの匿名化処理
          await anonymizeUserData(userId, db);
          
          // 削除予約情報を削除
          await db.collection('accountDeletions').doc(userId).delete();
          
          // Firebase Authentication のユーザーを削除
          try {
            await auth.deleteUser(userId);
            console.log(`ユーザー ${userId} の認証情報を削除しました`);
          } catch (authError) {
            console.error(`ユーザー ${userId} の認証情報削除に失敗:`, authError);
            // 認証情報の削除に失敗してもデータは匿名化済みなので問題なし
          }
          
          console.log(`ユーザー ${userId} の処理が完了しました`);
        } catch (error) {
          console.error(`ユーザー ${userId} の処理中にエラー:`, error);
        }
      }
      
      console.log('全てのユーザー処理が完了しました');
      return;
    } catch (error) {
      console.error('アカウント削除処理中にエラーが発生しました:', error);
      return;
    }
  }
);

/**
 * ユーザーデータの匿名化処理
 * 個人を特定できる情報を削除し、コンテンツデータは匿名化して保持する
 */
async function anonymizeUserData(userId: string, db: FirebaseFirestore.Firestore): Promise<void> {
  console.log('ユーザーデータの匿名化を開始:', userId);
  
  // 匿名化ID
  const anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    // 1. チャットルームとメッセージの匿名化
    const chatRoomsRef = db.collection(`users/${userId}/chatRooms`);
    const chatRoomsSnapshot = await chatRoomsRef.get();
    
    console.log(`匿名化: チャットルーム数 ${chatRoomsSnapshot.size}`);
    
    for (const chatDoc of chatRoomsSnapshot.docs) {
      // チャットルーム自体を匿名化
      await chatDoc.ref.update({
        userId: anonymousId,
        userEmail: 'anonymous@example.com',
        userName: '匿名ユーザー',
        anonymized: true,
        anonymizedAt: admin.firestore.Timestamp.now(),
        // チャット内容自体は保持
      });
      
      // チャットルーム内のメッセージも確認
      const messagesRef = chatDoc.ref.collection('messages');
      const messagesSnapshot = await messagesRef.get();
      
      const messageBatch = db.batch();
      let count = 0;
      
      for (const msgDoc of messagesSnapshot.docs) {
        // 個人情報を含む可能性のあるフィールドを匿名化
        messageBatch.update(msgDoc.ref, {
          userId: anonymousId,
          sender: '匿名ユーザー',
          anonymized: true,
          // メッセージ内容自体は維持
        });
        
        count++;
        // Firestoreのバッチサイズ制限（500件）に達したら一度コミット
        if (count >= 450) {
          await messageBatch.commit();
          count = 0;
        }
      }
      
      // 残りのメッセージをコミット
      if (count > 0) {
        await messageBatch.commit();
      }
    }
    
    // 2. レッスンデータの匿名化
    const lessonsRef = db.collection(`users/${userId}/lessons`);
    const lessonsSnapshot = await lessonsRef.get();
    
    console.log(`匿名化: レッスン数 ${lessonsSnapshot.size}`);
    
    const lessonBatch = db.batch();
    let lessonCount = 0;
    
    for (const lessonDoc of lessonsSnapshot.docs) {
      lessonBatch.update(lessonDoc.ref, {
        user_id: anonymousId,
        teacherName: '匿名講師', // 講師名も匿名化
        anonymized: true,
        anonymizedAt: admin.firestore.Timestamp.now(),
        // レッスン内容、文字起こし、要約などは保持
      });
      
      lessonCount++;
      // バッチサイズ制限に達したら一度コミット
      if (lessonCount >= 450) {
        await lessonBatch.commit();
        lessonCount = 0;
      }
    }
    
    // 残りのレッスンをコミット
    if (lessonCount > 0) {
      await lessonBatch.commit();
    }
    
    // 3. プロフィール情報を削除（匿名化せず完全削除）
    try {
      const profileRef = db.collection(`users/${userId}/profile`).doc('main');
      await profileRef.delete();
    } catch (e) {
      console.log('プロフィール削除エラー:', e);
    }
    
    // 4. ユーザードキュメント自体を更新
    try {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        await userRef.update({
          email: 'anonymous@example.com',
          displayName: '削除済みユーザー',
          anonymized: true,
          anonymizedAt: admin.firestore.Timestamp.now(),
          originalUserId: userId, // 内部参照用に元のIDを保持
        });
      }
    } catch (e) {
      console.log('ユーザードキュメント更新エラー:', e);
    }
    
    console.log(`ユーザー ${userId} のデータ匿名化が完了しました`);
  } catch (error) {
    console.error('データ匿名化処理エラー:', error);
    throw new Error('ユーザーデータの匿名化に失敗しました');
  }
}

/**
 * サブスクリプションレシート検証API
 * iOSとAndroidのレシートを検証して結果を返す
 */
export const verifySubscriptionReceipt = onCall({
  memory: '256MiB',
  region: 'asia-northeast1',
  timeoutSeconds: 60,
  minInstances: 0,
  maxInstances: 10,
  enforceAppCheck: false,
  invoker: 'authenticated'
}, async (request) => {
  try {
    // リクエストデータが無い場合はエラー
    if (!request.data) {
      throw new HttpsError('invalid-argument', 'レシートデータがありません');
    }
    
    // ユーザー認証チェック
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証されていないユーザーはこの機能を使用できません');
    }
    
    const { receipt, platform, productId } = request.data;
    
    if (!receipt || !platform || !productId) {
      throw new HttpsError('invalid-argument', 'レシート、プラットフォーム、または製品IDが不足しています');
    }
    
    let verificationResult;
    
    if (platform === 'ios') {
      verificationResult = await verifyIosReceipt(receipt);
    } else if (platform === 'android') {
      verificationResult = await verifyAndroidReceipt(receipt, productId);
    } else {
      throw new HttpsError('invalid-argument', '無効なプラットフォームです');
    }
    
    if (!verificationResult.isValid) {
      throw new HttpsError('invalid-argument', 'レシートの検証に失敗しました: ' + verificationResult.message);
    }
    
    // 検証成功時にFirestoreにサブスクリプション情報を保存
    const userId = request.auth.uid;
    const db = admin.firestore();
    
    // サブスクリプションデータを保存
    await db.collection('users').doc(userId).collection('subscriptions').doc(productId).set({
      productId,
      platform,
      purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
      expiryDate: new Date(verificationResult.expiryDateMs),
      transactionId: verificationResult.transactionId,
      receipt: receipt,
      autoRenewing: verificationResult.autoRenewing,
      status: 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // ユーザープロファイルも更新
    await db.collection('users').doc(userId).update({
      'subscription.active': true,
      'subscription.plan': productId.includes('premium') ? 'premium' : 'standard',
      'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      success: true,
      ...verificationResult
    };
  } catch (error) {
    console.error('レシート検証エラー:', error);
    throw new HttpsError('internal', 'レシート検証中にエラーが発生しました: ' + error.message);
  }
});

/**
 * iOSのレシートを検証する
 */
async function verifyIosReceipt(receipt: string) {
  try {
    // Secret Managerからシークレットを取得
    const client = new SecretManagerServiceClient();
    const sharedSecretName = `projects/${process.env.GCLOUD_PROJECT}/secrets/apple-shared-secret/versions/latest`;
    
    // Apple Shared Secretを取得
    const [sharedSecretResponse] = await client.accessSecretVersion({ name: sharedSecretName });
    const sharedSecret = sharedSecretResponse.payload?.data?.toString() || '';
    
    if (!sharedSecret) {
      throw new Error('Apple Shared Secretが見つかりません');
    }
    
    // 本番環境用のエンドポイント
    const verifyEndpoint = 'https://buy.itunes.apple.com/verifyReceipt';
    // サンドボックス環境用のエンドポイント (開発中に使用)
    const sandboxEndpoint = 'https://sandbox.itunes.apple.com/verifyReceipt';
    
    // 本番環境で検証を試みる
    let response = await axios.post(verifyEndpoint, {
      'receipt-data': receipt,
      'password': sharedSecret,
      'exclude-old-transactions': true
    });
    
    // ステータスが21007の場合、サンドボックス環境で再試行
    if (response.data.status === 21007) {
      response = await axios.post(sandboxEndpoint, {
        'receipt-data': receipt,
        'password': sharedSecret,
        'exclude-old-transactions': true
      });
    }
    
    // レスポンスチェック
    if (response.data.status !== 0) {
      return {
        isValid: false,
        message: `Appleからのエラー: ${response.data.status}`
      };
    }
    
    // サブスクリプション情報の取得
    const latestReceipt = response.data.latest_receipt_info;
    if (!latestReceipt || latestReceipt.length === 0) {
      return {
        isValid: false,
        message: 'サブスクリプション情報が見つかりません'
      };
    }
    
    // 最新のサブスクリプション情報を取得
    const latest = latestReceipt[latestReceipt.length - 1];
    
    // 有効期限を確認
    const expiryDateMs = parseInt(latest.expires_date_ms);
    const now = Date.now();
    
    if (expiryDateMs < now) {
      return {
        isValid: false,
        message: 'サブスクリプションの期限が切れています'
      };
    }
    
    return {
      isValid: true,
      expiryDateMs,
      autoRenewing: latest.auto_renew_status === '1',
      transactionId: latest.transaction_id,
      productId: latest.product_id
    };
  } catch (error) {
    console.error('iOSレシート検証エラー:', error);
    return {
      isValid: false,
      message: 'iOSレシート検証中にエラーが発生しました: ' + error.message
    };
  }
}

/**
 * Androidのレシートを検証する
 */
async function verifyAndroidReceipt(receipt: string, productId: string) {
  try {
    // Secret Managerからサービスアカウント情報を取得
    const client = new SecretManagerServiceClient();
    const serviceAccountName = `projects/${process.env.GCLOUD_PROJECT}/secrets/google-play-service-account/versions/latest`;
    
    // Google Play Service Accountを取得
    const [serviceAccountResponse] = await client.accessSecretVersion({ name: serviceAccountName });
    const serviceAccount = serviceAccountResponse.payload?.data?.toString() || '';
    
    if (!serviceAccount) {
      throw new Error('Google Play Service Accountが見つかりません');
    }
    
    // サービスアカウント情報をパース
    const serviceAccountJson = JSON.parse(serviceAccount);
    
    // Google Play Developer APIのエンドポイント
    // 注意: この実装は簡略化されています。実際にはGoogle Play Developer APIのライブラリを使用することが推奨されます。
    const packageName = 'com.regnition.appli'; // アプリのパッケージ名
    const purchaseToken = receipt;
    
    // OAuth2トークンを取得
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: serviceAccountJson.client_id,
      client_secret: serviceAccountJson.client_secret,
      refresh_token: serviceAccountJson.refresh_token,
      grant_type: 'refresh_token'
    });
    
    const accessToken = tokenResponse.data.access_token;
    
    // サブスクリプション情報を取得
    const subscriptionResponse = await axios.get(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    const subscription = subscriptionResponse.data;
    
    // サブスクリプションの状態を確認
    if (subscription.paymentState !== 1) {
      return {
        isValid: false,
        message: '支払いが完了していません'
      };
    }
    
    // 有効期限を確認
    const expiryDateMs = parseInt(subscription.expiryTimeMillis);
    const now = Date.now();
    
    if (expiryDateMs < now) {
      return {
        isValid: false,
        message: 'サブスクリプションの期限が切れています'
      };
    }
    
    return {
      isValid: true,
      expiryDateMs,
      autoRenewing: subscription.autoRenewing,
      transactionId: subscription.orderId,
      productId: productId
    };
  } catch (error) {
    console.error('Androidレシート検証エラー:', error);
    return {
      isValid: false,
      message: 'Androidレシート検証中にエラーが発生しました: ' + error.message
    };
  }
}

// App Store Server Notifications ハンドラを追加
export const handleAppStoreServerNotification = onRequest(
  { region: 'asia-northeast1' },
  async (req, res) => {
    logger.info('App Store Server Notification 受信', req.body);
    try {
      const notification = req.body as any;
      const unified = notification.unified_receipt;
      const infos = unified?.latest_receipt_info;
      if (!infos || infos.length === 0) {
        throw new Error('latest_receipt_info がありません');
      }
      const info = infos[infos.length - 1];
      const originalTransactionId = info.original_transaction_id;
      const expiryDateMs = parseInt(info.expires_date_ms);
      const autoRenewing = info.auto_renew_status === '1';

      // サブスクリプションコレクショングループをクエリ
      const subsSnap = await admin.firestore().collectionGroup('subscriptions')
        .where('transactionId', '==', originalTransactionId)
        .get();
      for (const docSnap of subsSnap.docs) {
        // サブスクリプションドキュメントを更新
        await docSnap.ref.set({
          expiryDate: new Date(expiryDateMs),
          autoRenewing,
          status: expiryDateMs > Date.now() ? 'active' : 'expired',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        // ユーザープロファイルも更新
        const userDoc = docSnap.ref.parent.parent;
        if (userDoc) {
          await userDoc.update({
            'subscription.active': expiryDateMs > Date.now(),
            'subscription.updatedAt': admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      // レスポンス 200 を返却
      res.status(200).end();
    } catch (error) {
      logger.error('Server Notification 処理エラー', error);
      res.status(500).end();
    }
  }
);
