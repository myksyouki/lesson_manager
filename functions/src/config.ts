import * as admin from "firebase-admin";
import OpenAI from "openai";

// Firebase Adminの初期化
admin.initializeApp();

// Firestore と Storage のインスタンスをエクスポート
export const db = admin.firestore();
export const storage = admin.storage();

// Firebase Functionsの設定から環境変数を取得
// v2では functions.config() は使用できないため、process.env から直接取得
export const openaiApiKey = process.env.OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY;

// OpenAI環境変数の状態をログ出力
console.log("OpenAI環境変数状態:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? `設定あり (${process.env.OPENAI_API_KEY.substring(0, 5)}...)` : "未設定",
  FUNCTIONS_CONFIG_OPENAI_API_KEY: process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY ? `設定あり (${process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY.substring(0, 5)}...)` : "未設定",
  FUNCTIONS_CONFIG_OPENAI_APIKEY: process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY ? `設定あり (${process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY.substring(0, 5)}...)` : "未設定",
  使用するキー: openaiApiKey ? `${openaiApiKey.substring(0, 5)}...` : "未設定"
});

// OpenAI APIの初期化
let openai: OpenAI | null = null;
try {
  if (openaiApiKey) {
    openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    console.log("OpenAI APIが初期化されました。APIキー:", openaiApiKey.substring(0, 5) + "...");
  } else {
    console.error("OpenAI APIキーが設定されていません。環境変数を確認してください。Firebase Config:", {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "設定あり" : "未設定",
      FUNCTIONS_CONFIG_OPENAI_API_KEY: process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY ? "設定あり" : "未設定",
      FUNCTIONS_CONFIG_OPENAI_APIKEY: process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY ? "設定あり" : "未設定",
    });
    console.error("Whisper機能は使用できません。");
  }
} catch (error) {
  console.error("OpenAI API初期化エラー:", error);
}

// 初期化結果のログ出力
console.log("OpenAI初期化結果:", openai ? "成功" : "失敗");

export { openai };
