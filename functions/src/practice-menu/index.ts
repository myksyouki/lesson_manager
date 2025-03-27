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

// リクエストのバリデーション用インターフェース
interface PracticeMenuRequest {
  instrument: string;
  skillLevel: string;
  practiceDuration: number;
  practiceContent?: string;
  specificGoals?: string;
}

/**
 * 練習メニュー生成のためのCloud Function
 * ユーザーの楽器と習熟度に基づいた練習メニューを生成します
 */
export const generatePracticeMenu = functions
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
    if (!data || !data.instrument) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "楽器情報が必要です"
      );
    }

    if (!data.skill_level) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "スキルレベルが必要です"
      );
    }

    // 練習したい内容が必須
    if (!data.practice_content) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "練習したい内容が必要です"
      );
    }

    try {
      // リクエストの整形
      const request: PracticeMenuRequest = {
        instrument: data.instrument,
        skillLevel: data.skill_level,
        practiceDuration: data.practice_duration || 60, // デフォルト60分
        practiceContent: data.practice_content,
        specificGoals: data.specific_goals || "",
      };

      // プロンプトの生成
      const prompt = createPromptFromRequest(request);

      // 楽器に対応するAPIキー設定を取得
      const config = INSTRUMENT_DIFY_CONFIGS[request.instrument as keyof typeof INSTRUMENT_DIFY_CONFIGS] || 
                     INSTRUMENT_DIFY_CONFIGS.default;
      
      // Secret Managerからシークレットを取得
      console.log(`楽器: ${request.instrument}の設定を使用します`);
      
      // APP IDを取得
      const appId = await getSecret(config.appIdSecret);
      console.log("アプリID取得成功");
      
      // APIキーを取得
      const apiKey = await getSecret(config.apiKeySecret);
      console.log("APIキー取得成功");

      // プロンプトを生成
      console.log("プロンプト:", prompt);

      // Dify APIにリクエスト
      console.log("Dify APIリクエスト送信:", `${config.apiEndpoint}/chat-messages`);
      const response = await axios.post(
        `${config.apiEndpoint}/chat-messages`,
        {
          inputs: {
            instrument: request.instrument,
            skill_level: request.skillLevel,
            practice_duration: request.practiceDuration,
            practice_content: request.practiceContent,
            specific_goals: request.specificGoals,
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
      const practiceMenuData = parseDifyResponse(response.data);
      return practiceMenuData;
    } catch (error: any) {
      console.error("練習メニュー生成エラー:", error);
      
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
 * ユーザーのリクエストからプロンプトを生成
 */
function createPromptFromRequest(request: PracticeMenuRequest): string {
  const {instrument, skillLevel, practiceDuration, practiceContent, specificGoals} = request;
  
  let prompt = `${instrument}の${skillLevel}向けの、${practiceDuration}分間の練習メニューを作成してください。`;
  
  if (practiceContent && practiceContent.trim()) {
    prompt += ` 特に「${practiceContent}」に重点を置いてください。`;
  }
  
  if (specificGoals && specificGoals.trim()) {
    prompt += ` 目標: ${specificGoals}`;
  }
  
  prompt += " 各練習項目には、タイトル、詳細な説明、目安時間（分）、カテゴリ（ロングトーン、音階、曲練習などから選択）を含めてください。JSON形式で返してください。";
  
  return prompt;
}

/**
 * Dify APIのレスポンスをパース
 */
function parseDifyResponse(response: any): any {
  try {
    console.log("レスポンスデータ:", JSON.stringify(response));
    
    // レスポンスから答えを取得
    const content = response.answer || "";
    console.log("レスポンス内容:", content);
    
    // JSONレスポンスを抽出
    let practiceData;
    try {
      // JSON形式が```json...```で囲まれているケース
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        console.log("Markdown形式JSONを検出");
        practiceData = JSON.parse(jsonMatch[1]);
      } else if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
        // 直接JSONが返ってきたケース
        console.log("直接JSON形式を検出");
        practiceData = JSON.parse(content);
      } else {
        // JSONでない場合、テキスト構造を解析
        console.log("非JSON形式のレスポンス - テキスト解析を実行");
        return parseTextResponse(content);
      }
    } catch (e: any) {
      console.error("JSONパースエラー:", e);
      // JSONパースに失敗した場合
      throw createError(
        ErrorType.INTERNAL,
        `Dify APIからのレスポンスのJSONパースに失敗: ${e.message}`
      );
    }
    
    // データの整形
    console.log("解析されたデータ:", JSON.stringify(practiceData));
    const practiceMenu = [];
    
    if (practiceData.practice_menu && Array.isArray(practiceData.practice_menu)) {
      for (const item of practiceData.practice_menu) {
        practiceMenu.push({
          title: item.title || "無題の練習",
          description: item.description || "",
          duration: parseInt(item.duration) || 10,
          category: item.category || "一般練習",
        });
      }
    } else if (practiceData.items && Array.isArray(practiceData.items)) {
      // 代替フォーマット
      for (const item of practiceData.items) {
        practiceMenu.push({
          title: item.title || item.name || "無題の練習",
          description: item.description || item.details || "",
          duration: parseInt(item.duration) || parseInt(item.time) || 10,
          category: item.category || item.type || "一般練習",
        });
      }
    } else {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "Dify APIからのレスポンスに有効な練習メニュー情報が含まれていません"
      );
    }
    
    console.log(`${practiceMenu.length}個の練習項目を検出`);
    return {
      practice_menu: practiceMenu,
      summary: practiceData.summary || practiceData.overview || "練習メニュー",
    };
  } catch (error: any) {
    console.error("レスポンスのパースエラー:", error);
    throw createError(
      ErrorType.INTERNAL,
      `レスポンスのパースエラー: ${error.message}`
    );
  }
}

/**
 * テキスト形式のレスポンスを解析
 */
function parseTextResponse(content: string): any {
  console.log("テキスト形式の解析を開始");
  
  // 行ごとに分割
  const lines = content.split("\n").filter((line) => line.trim());
  console.log(`${lines.length}行を検出`);
  
  if (lines.length < 3) {
    throw createError(
      ErrorType.INVALID_ARGUMENT,
      "有効な練習メニュー情報が見つかりません。レスポンスの行数が少なすぎます。"
    );
  }
  
  // 最初の行をサマリーとして扱う
  const summary = lines[0];
  
  // 残りの行から練習メニューを抽出
  const practiceMenu = [];
  let currentItem: any = null;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 新しい項目の開始（数字＋ドットで始まるか、「項目」「練習」などのキーワードを含む行）
    if (/^\d+[\.\):]/.test(line) || /項目|練習|エクササイズ|ステップ/.test(line)) {
      // 前の項目があれば保存
      if (currentItem) {
        practiceMenu.push(currentItem);
      }
      
      // タイトルを抽出
      let title = line.replace(/^\d+[\.\):]/, "").trim();
      if (!title) title = "練習項目";
      
      // 新しい項目
      currentItem = {
        title: title,
        description: "",
        duration: 10, // デフォルト
        category: "一般練習",
      };
      
      // 時間情報を抽出（例: 「（10分）」）
      const durationMatch = title.match(/（(\d+)分）|\((\d+)分\)/);
      if (durationMatch) {
        currentItem.duration = parseInt(durationMatch[1] || durationMatch[2]);
        // タイトルから時間情報を削除
        currentItem.title = title.replace(/（\d+分）|\(\d+分\)/, "").trim();
      }
    } else if (currentItem) {
      // 既存の項目の説明として追加
      // 時間情報を抽出（例: 「10分」）
      if (/(\d+)分/.test(line) && !currentItem.duration) {
        const durationMatch = line.match(/(\d+)分/);
        if (durationMatch) {
          currentItem.duration = parseInt(durationMatch[1]);
        }
      }
      
      // カテゴリ情報を抽出
      const categoryKeywords: {[key: string]: string} = {
        "ロングトーン": "ロングトーン",
        "音階": "音階",
        "スケール": "音階",
        "テクニック": "テクニック",
        "タンギング": "テクニック",
        "アーティキュレーション": "テクニック",
        "曲練習": "曲練習",
        "レパートリー": "曲練習",
        "表現": "表現力",
        "リズム": "リズム",
      };
      
      for (const [keyword, category] of Object.entries(categoryKeywords)) {
        if (line.includes(keyword) && currentItem.category === "一般練習") {
          currentItem.category = category;
          break;
        }
      }
      
      // 説明に追加
      currentItem.description += line + "\n";
    }
  }
  
  // 最後の項目を追加
  if (currentItem) {
    practiceMenu.push(currentItem);
  }
  
  console.log(`${practiceMenu.length}個の練習項目を抽出`);
  
  // 練習メニューが空の場合
  if (practiceMenu.length === 0) {
    throw createError(
      ErrorType.INVALID_ARGUMENT,
      "有効な練習メニュー情報を抽出できませんでした"
    );
  }
  
  return {
    practice_menu: practiceMenu,
    summary: summary,
  };
}

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
