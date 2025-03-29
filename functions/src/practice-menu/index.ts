/**
 * 練習メニュー生成用のCloud Functions
 */

import * as functions from "firebase-functions/v1";
import axios from "axios";
import {
  FUNCTION_REGION,
  INSTRUMENT_DIFY_CONFIGS,
} from "../config";
import {getSecret} from "../common/secret";
import {ErrorType, createError} from "../common/errors";

/**
 * レッスンデータからタスクを生成するためのCloud Function
 * レッスンの要約情報を元に練習タスクを生成します
 */
export const generateTasksFromLessons = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
    // 認証チェック
    if (!context.auth) {
      throw createError(
        ErrorType.UNAUTHENTICATED,
        "この機能を使用するにはログインが必要です"
      );
    }

    // リクエストのバリデーション
    if (!data || !data.lessons || !Array.isArray(data.lessons) || data.lessons.length === 0) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "レッスンデータが必要です"
      );
    }

    try {
      // レッスンデータからプロンプトを生成
      const lessons = data.lessons;
      const instrument = data.instrument || "ピアノ"; // デフォルト楽器
      const prompt = createTaskPromptFromLessons(lessons, instrument);

      // 楽器に対応するAPIキー設定を取得
      const config = INSTRUMENT_DIFY_CONFIGS[instrument as keyof typeof INSTRUMENT_DIFY_CONFIGS] || 
                     INSTRUMENT_DIFY_CONFIGS.default;
      
      // Secret Managerからシークレットを取得
      console.log(`楽器: ${instrument}の設定を使用します`);
      
      // APP IDを取得
      const appId = await getSecret(config.appIdSecret);
      console.log("アプリID取得成功");
      
      // APIキーを取得
      const apiKey = await getSecret(config.apiKeySecret);
      console.log("APIキー取得成功");

      console.log("プロンプト:", prompt);

      // Dify APIにリクエスト
      console.log("Dify APIリクエスト送信:", `${config.apiEndpoint}/chat-messages`);
      const response = await axios.post(
        `${config.apiEndpoint}/chat-messages`,
        {
          inputs: {
            instrument: instrument,
            lessons: lessons,
          },
          query: prompt,
          response_mode: "blocking",
          user: context.auth.uid, // 認証済みユーザーIDを使用
          app_id: appId, // アプリIDを追加
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("Dify APIレスポンス成功");
      
      // APIレスポンスをパース
      const taskData = parseTaskResponse(response.data);
      return taskData;
    } catch (error: any) {
      console.error("タスク生成エラー:", error);
      
      // エラー詳細をクライアントに返す
      if (error.response) {
        // APIからのレスポンスエラー
        console.error("APIエラーレスポンス:", error.response.data);
        throw createError(
          ErrorType.INTERNAL,
          `Dify API エラー: ${error.response.status} - ${JSON.stringify(error.response.data)}`
        );
      } else if (error.request) {
        // リクエストは送信されたがレスポンスがない
        throw createError(
          ErrorType.UNAVAILABLE,
          "Dify APIからの応答がありません。ネットワークまたはAPIの問題です。"
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
 * レッスンデータからタスク生成用プロンプトを作成
 */
function createTaskPromptFromLessons(lessons: any[], instrument: string): string {
  // レッスンからサマリーテキストを抽出
  const summaries = lessons.map((lesson) => {
    return `レッスン日: ${lesson.date || "不明"}
先生: ${lesson.teacher || lesson.teacherName || "不明"}
曲目: ${Array.isArray(lesson.pieces) ? lesson.pieces.join(", ") : lesson.pieces || "不明"}
要約: ${lesson.summary || ""}
メモ: ${lesson.notes || ""}`;
  }).join("\n\n----------\n\n");

  // プロンプトを作成
  let prompt = `以下のレッスン情報に基づいて、${instrument}の練習タスクを作成してください。\n\n`;
  prompt += summaries;
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
 * タスク生成のレスポンスをパース
 */
function parseTaskResponse(response: any): any {
  try {
    console.log("レスポンスデータ:", JSON.stringify(response));
    
    // レスポンスから答えを取得
    const content = response.answer || "";
    console.log("レスポンス内容:", content);
    
    // JSONレスポンスを抽出
    let taskData;
    try {
      // JSON形式が```json...```で囲まれているケース
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log("Markdown形式JSONを検出");
        taskData = JSON.parse(jsonMatch[1]);
      } else if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
        // 直接JSONが返ってきたケース
        console.log("直接JSON形式を検出");
        taskData = JSON.parse(content);
      } else {
        // JSONでない場合は構造化して返す
        console.log("非JSON形式のレスポンス - テキスト構造を作成");
        return {
          practice_points: ["レッスン内容を復習する"],
          technical_exercises: ["基本的な技術練習"],
          piece_practice: ["レッスンで扱った曲を練習する"],
          interpretation_advice: content,
        };
      }
    } catch (e: any) {
      console.error("JSONパースエラー:", e);
      // JSONパースに失敗した場合
      throw createError(
        ErrorType.INTERNAL,
        `Dify APIからのレスポンスのJSONパースに失敗: ${e.message}`
      );
    }
    
    // データの整形と検証
    const formattedResponse = {
      practice_points: Array.isArray(taskData.practice_points) ? taskData.practice_points : [],
      technical_exercises: Array.isArray(taskData.technical_exercises) ? taskData.technical_exercises : [],
      piece_practice: Array.isArray(taskData.piece_practice) ? taskData.piece_practice : [],
      interpretation_advice: taskData.interpretation_advice || "",
    };
    
    // 少なくとも1つの練習ポイントがあることを確認
    if (formattedResponse.practice_points.length === 0) {
      formattedResponse.practice_points = ["レッスン内容を復習する"];
    }
    
    return formattedResponse;
  } catch (error: any) {
    console.error("レスポンスのパースエラー:", error);
    throw createError(
      ErrorType.INTERNAL,
      `レスポンスのパースエラー: ${error.message}`
    );
  }
} 
