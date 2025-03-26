/**
 * 文字起こしテキストからタグを生成する処理
 * Google Gemini APIを使用
 */

import {GoogleGenerativeAI} from "@google/generative-ai";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {createError, ErrorType} from "../common/errors";
import {GEMINI_API_KEY_SECRET, PROJECT_ID} from "../config";

// タグの固定数（変更）
const MAX_TAGS = 3;

/**
 * タグ生成結果の型定義
 */
export interface TagResult {
  success: boolean;
  tags: string[];
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
 * テキストからタグを生成
 */
export async function generateTags(
  text: string,
  summary: string,
  instrument: string
): Promise<TagResult> {
  try {
    logger.info("タグ生成を開始");

    if ((!text || text.trim().length === 0) && (!summary || summary.trim().length === 0)) {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "Both text and summary are empty"
      );
    }

    // APIキーの取得
    const apiKey = await getSecret(GEMINI_API_KEY_SECRET);

    // Gemini APIの設定
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-proが廃止されたため、gemini-1.5-flashに変更
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    // プロンプトの構築（優先的に要約を使用）
    const content = summary && summary.trim().length > 0 ?
      summary :
      text.substring(0, Math.min(text.length, 10000)); // テキストが長すぎる場合は切り詰め

    let prompt = `
これは音楽レッスンの内容です。以下のテキストを分析して、このレッスンの内容を表す重要なキーワードを3つだけ抽出してください。
各キーワードは必ず1単語のみとし、レッスンの主要な概念、技術、アドバイスを表すものにしてください。
複合語や句ではなく、単一の名詞や動詞を選択してください。

返答形式は必ず以下のようなJSON配列のみとしてください：
["キーワード1", "キーワード2", "キーワード3"]
`;

    if (instrument && instrument.trim().length > 0) {
      prompt += `このレッスンは${instrument}に関するものです。\n\n`;
    }

    prompt += `レッスン内容: ${content}`;

    // Gemini APIの呼び出し
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // レスポンスからタグを抽出
    let tags: string[] = [];
    try {
      // JSONの配列形式を検出して解析
      const match = responseText.match(/\[(.*?)\]/);
      if (match) {
        const jsonStr = match[0].replace(/'/g, "\""); // シングルクォートをダブルクォートに置換
        tags = JSON.parse(jsonStr);
      } else {
        // カンマ区切りのテキストとして処理
        tags = responseText.split(/[,、]/).map((tag: string) =>
          tag.trim().replace(/^["']|["']$/g, "") // 引用符を削除
        );
      }

      // 空のタグを除去
      tags = tags.filter((tag) => tag && tag.trim().length > 0);
      
      // 複数単語のタグを分割して最初の単語だけを使用
      tags = tags.map((tag) => {
        const words = tag.split(/\s+/);
        return words[0].trim();
      });

      // タグが3つになるように調整
      if (tags.length < MAX_TAGS) {
        // タグが足りない場合はデフォルトタグで補完
        const defaultTags = [instrument || "音楽", "レッスン", "練習"];
        for (let i = tags.length; i < MAX_TAGS; i++) {
          const defaultTag = defaultTags[i % defaultTags.length];
          if (!tags.includes(defaultTag)) {
            tags.push(defaultTag);
          }
        }
      } else if (tags.length > MAX_TAGS) {
        // タグが多すぎる場合は切り詰め
        tags = tags.slice(0, MAX_TAGS);
      }

      if (tags.length === 0) {
        throw new Error("タグが生成されませんでした");
      }
    } catch (error) {
      logger.error("タグの解析に失敗しました:", error);
      logger.info("生のレスポンス:", responseText);

      throw createError(
        ErrorType.INTERNAL,
        `Failed to parse tags: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    logger.info(`${tags.length}個のタグを生成しました:`, {tags});

    return {
      success: true,
      tags,
    };
  } catch (error) {
    logger.error("タグ生成中のエラー:", error);

    return {
      success: false,
      tags: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
