import * as admin from "firebase-admin";
import OpenAI from "openai";

// Firebase Adminの初期化
admin.initializeApp();

// Firestore と Storage のインスタンスをエクスポート
export const db = admin.firestore();
export const storage = admin.storage();

// Firebase Functionsの設定から環境変数を取得
// v2では functions.config() は使用できないため、process.env から直接取得
export const openaiApiKey = process.env.OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY || process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY;

// OpenAI環境変数の状態をログ出力
console.log("OpenAI環境変数状態:", {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "設定あり" : "未設定",
  FUNCTIONS_CONFIG_OPENAI_API_KEY: process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY ? "設定あり" : "未設定",
  FUNCTIONS_CONFIG_OPENAI_APIKEY: process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY ? "設定あり" : "未設定",
  使用するキー: openaiApiKey ? "設定あり" : "未設定"
});

// Firebase Configから値を取得
async function getFirebaseConfig() {
  try {
    const configSnapshot = await db.collection("config").doc("openai").get();
    console.log("Firebase config取得: ", configSnapshot.exists ? "成功" : "失敗");
    if (configSnapshot.exists) {
      const configData = configSnapshot.data();
      console.log("openai設定を確認: ", configData);
      
      // 環境変数に設定
      if (configData?.apikey) {
        process.env.OPENAI_API_KEY = configData.apikey;
        console.log("OpenAI API Keyを環境変数に設定しました (apikey)");
      }
      
      if (configData?.api_key) {
        process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY = configData.api_key;
        console.log("OpenAI API Keyを環境変数に設定しました (api_key)");
      }
      
      return true;
    }
    return false;
  } catch (error) {
    console.error("Firebase Config取得エラー:", error);
    return false;
  }
}

// OpenAI APIの初期化（async）
let openai: OpenAI | null = null;

async function initializeOpenAI() {
  try {
    // まずFirebase Configから取得を試みる
    await getFirebaseConfig();
    
    // 再度環境変数をチェック
    const apiKey = process.env.OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY || process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY;
    
    if (apiKey) {
      openai = new OpenAI({
        apiKey: apiKey,
      });
      console.log("OpenAI APIが初期化されました");
      return true;
    } else {
      console.error("OpenAI APIキーが設定されていません。環境変数を確認してください。Firebase Config:", {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "設定あり" : "未設定",
        FUNCTIONS_CONFIG_OPENAI_API_KEY: process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY ? "設定あり" : "未設定",
        FUNCTIONS_CONFIG_OPENAI_APIKEY: process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY ? "設定あり" : "未設定"
      });
      console.error("Whisper機能は使用できません。");
      return false;
    }
  } catch (error) {
    console.error("OpenAI API初期化エラー:", error);
    return false;
  }
}

// 初期化を実行
initializeOpenAI().then(success => {
  console.log("OpenAI初期化結果:", success ? "成功" : "失敗");
});

export { openai };
