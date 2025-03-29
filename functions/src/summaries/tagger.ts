/**
 * 文字起こしテキストからタグを生成する処理
 * 
 * Google Gemini APIを使用してレッスン内容から関連タグを生成します。
 * 要約とテキストを組み合わせて最適なタグを抽出します。
 */

// サードパーティライブラリ
import {GoogleGenerativeAI} from "@google/generative-ai";
import * as logger from "firebase-functions/logger";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

// プロジェクト内のモジュール
import {createError, ErrorType} from "../common/errors";
import {GEMINI_API_KEY_SECRET, PROJECT_ID} from "../config";

// 定数
const MAX_TAGS = 3;
const MAX_TEXT_LENGTH = 10000; // API入力の最大文字数
const MAX_RETRY_COUNT = 2;
const RETRY_DELAY_MS = 2000;

/**
 * タグ生成結果の型定義
 */
export interface TagResult {
  success: boolean;
  tags: string[];
  error?: string;
}

/**
 * テキストからタグを生成
 * 
 * @param text 対象の文字起こしテキスト
 * @param summary テキストの要約（あれば優先的に使用）
 * @param instrument 楽器名（タグが足りない場合の補完に使用）
 * @returns タグ生成結果
 */
export async function generateTags(
  text: string,
  summary: string,
  instrument: string
): Promise<TagResult> {
  try {
    logger.info("タグ生成を開始", {
      textLength: text?.length || 0,
      summaryLength: summary?.length || 0,
      instrument,
    });

    // 入力の検証
    validateInputs(text, summary);

    // APIキーの取得
    const apiKey = await getSecret(GEMINI_API_KEY_SECRET);

    // 入力コンテンツの準備
    const content = prepareContent(text, summary);

    // プロンプトの構築
    const prompt = buildTagPrompt(content, instrument);

    // タグの生成（リトライロジック付き）
    const tags = await generateTagsWithRetry(prompt, apiKey);

    // 最終的なタグの加工
    const finalTags = processGeneratedTags(tags, instrument);

    logger.info(`${finalTags.length}個のタグを生成しました:`, {tags: finalTags});

    return {
      success: true,
      tags: finalTags,
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

/**
 * 入力の検証
 */
function validateInputs(text: string, summary: string): void {
  if ((!text || text.trim().length === 0) && (!summary || summary.trim().length === 0)) {
    throw createError(
      ErrorType.INVALID_ARGUMENT,
      "テキストと要約の両方が空です"
    );
  }
}

/**
 * 入力コンテンツの準備
 */
function prepareContent(text: string, summary: string): string {
  // 優先的に要約を使用
  if (summary && summary.trim().length > 0) {
    logger.info("要約をタグ生成の入力として使用します");
    return summary;
  }
  
  // 要約がない場合はテキストを使用（長すぎる場合は切り詰め）
  logger.info("テキストをタグ生成の入力として使用します", {
    originalLength: text.length,
    truncatedLength: Math.min(text.length, MAX_TEXT_LENGTH),
  });
  
  return text.substring(0, Math.min(text.length, MAX_TEXT_LENGTH));
}

/**
 * タグ生成用プロンプトの構築
 */
function buildTagPrompt(content: string, instrument: string): string {
  let prompt = `
これは音楽レッスンの内容です。以下のテキストを分析して、このレッスンの内容を表す重要なキーワードを3つだけ抽出してください。
各キーワードは必ず1単語のみとし、レッスンの主要な概念、技術、アドバイスを表すものにしてください。
複合語や句ではなく、単一の名詞や動詞を選択してください。

返答形式は必ず以下のようなJSON配列のみとしてください：
["キーワード1", "キーワード2", "キーワード3"]
`;

  // 楽器情報があれば追加
  if (instrument && instrument.trim().length > 0) {
    prompt += `このレッスンは${instrument}に関するものです。\n\n`;
  }

  // コンテンツを追加
  prompt += `レッスン内容: ${content}`;

  return prompt;
}

/**
 * リトライロジック付きのタグ生成
 */
async function generateTagsWithRetry(prompt: string, apiKey: string): Promise<string[]> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRY_COUNT; attempt++) {
    try {
      return await callGeminiAPI(prompt, apiKey);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 最後の試行でなければリトライ
      if (attempt < MAX_RETRY_COUNT) {
        const delay = RETRY_DELAY_MS * attempt;
        logger.warn(`Gemini API呼び出し失敗、${delay}ms後に再試行 (${attempt}/${MAX_RETRY_COUNT})`, 
          {error: lastError.message});
        
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  // すべてのリトライが失敗
  throw lastError || new Error("未知のエラーによりGemini API呼び出しに失敗");
}

/**
 * Gemini APIの呼び出し
 */
async function callGeminiAPI(prompt: string, apiKey: string): Promise<string[]> {
  try {
    // Gemini APIの設定
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-proが廃止されたため、gemini-1.5-flashに変更
    const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

    // Gemini APIの呼び出し
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    logger.info("Gemini APIからの応答を受信", {
      responseLength: responseText.length,
    });

    // レスポンスからタグを抽出
    const tags = extractTagsFromResponse(responseText);
    
    // 抽出結果の検証
    if (tags.length === 0) {
      throw new Error("タグが生成されませんでした");
    }
    
    return tags;
  } catch (error) {
    logger.error("Gemini API呼び出し中のエラー:", error);
    throw createError(
      ErrorType.INTERNAL,
      `タグ生成に失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * APIレスポンスからタグを抽出
 */
function extractTagsFromResponse(responseText: string): string[] {
  try {
    let tags: string[] = [];
    
    // JSONの配列形式を検出して解析
    const match = responseText.match(/\[(.*?)\]/);
    if (match) {
      const jsonStr = match[0].replace(/'/g, "\""); // シングルクォートをダブルクォートに置換
      tags = JSON.parse(jsonStr);
      logger.info("JSON形式からタグを抽出しました", {rawMatch: match[0]});
    } else {
      // カンマ区切りのテキストとして処理
      tags = responseText.split(/[,、]/).map((tag: string) =>
        tag.trim().replace(/^["']|["']$/g, "") // 引用符を削除
      );
      logger.info("テキスト形式からタグを抽出しました", {tagCount: tags.length});
    }

    // 空のタグを除去
    tags = tags.filter((tag) => tag && tag.trim().length > 0);
    
    // 複数単語のタグを分割して最初の単語だけを使用
    tags = tags.map((tag) => {
      const words = tag.split(/\s+/);
      return words[0].trim();
    });
    
    return tags;
  } catch (error) {
    logger.error("タグの解析に失敗しました:", error);
    logger.info("生のレスポンス:", responseText);
    
    throw createError(
      ErrorType.INTERNAL,
      `タグの解析に失敗: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * 生成されたタグの最終処理
 */
function processGeneratedTags(tags: string[], instrument: string): string[] {
  // タグが3つになるように調整
  if (tags.length < MAX_TAGS) {
    // タグが足りない場合はデフォルトタグで補完
    logger.info(`タグが${MAX_TAGS}個未満のため、デフォルトタグで補完します`, {currentCount: tags.length});
    const defaultTags = [instrument || "音楽", "レッスン", "練習"];
    
    for (let i = tags.length; i < MAX_TAGS; i++) {
      const defaultTag = defaultTags[i % defaultTags.length];
      if (!tags.includes(defaultTag)) {
        tags.push(defaultTag);
      }
    }
  } else if (tags.length > MAX_TAGS) {
    // タグが多すぎる場合は切り詰め
    logger.info(`タグが${MAX_TAGS}個を超えているため、切り詰めます`, {originalCount: tags.length});
    tags = tags.slice(0, MAX_TAGS);
  }
  
  return tags;
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
