import * as admin from "firebase-admin";
import OpenAI from "openai";

// Firebase Adminの初期化
admin.initializeApp();

// Firestore と Storage のインスタンスをエクスポート
export const db = admin.firestore();
export const storage = admin.storage();

// Firebase Functionsの設定から環境変数を取得
// v2では functions.config() は使用できないため、process.env から直接取得
export const openaiApiKey = process.env.OPENAI_API_KEY;

// OpenAI APIの初期化
let openai: OpenAI | null = null;
try {
  if (openaiApiKey) {
    openai = new OpenAI({
      apiKey: openaiApiKey,
    });
    console.log("OpenAI APIが初期化されました");
  } else {
    console.log("OpenAI APIキーが設定されていません。Whisper機能は使用できません。");
  }
} catch (error) {
  console.error("OpenAI APIの初期化中にエラーが発生しました:", error);
}

export { openai };
