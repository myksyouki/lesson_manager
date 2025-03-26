/**
 * Cloud Functions エントリポイント
 */

import * as admin from "firebase-admin";
// import * as functions from "firebase-functions/v1";

// Firebaseの初期化
admin.initializeApp();

// シンプル化したチャット機能をインポート
// import {testEcho, httpEcho, sendMessage, testDifyConnection, testDifyDirectConnection, testDifyVariations} from "./chat/index";

// テスト関数をエクスポート
// export {testEcho, httpEcho, sendMessage, testDifyConnection, testDifyDirectConnection, testDifyVariations};

// 正しく初期化されたことをログに記録
console.log("Firebase Functions初期化完了");

// 他のモジュールで必要な関数をエクスポート（必要に応じて）
export * from "./summaries";
export * from "./common/errors";
