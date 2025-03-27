/**
 * Cloud Functions エントリポイント
 */

import {onCall, HttpsError} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import axios from "axios";

// Firebaseの初期化
admin.initializeApp();

const secretManager = new SecretManagerServiceClient();

// DifyシークレットをSecret Managerから取得する関数
async function getDifySecrets() {
  try {
    console.log("Difyシークレットの取得を開始...");
    
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

    console.log("Difyシークレットの取得に成功");
    
    return {
      apiKey,
      appId,
    };
  } catch (error) {
    console.error("Difyシークレットの取得エラー:", error);
    throw new Error("Difyシークレットの取得に失敗しました");
  }
}

// AIアシスタントにメッセージを送信するCloud Function
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
      console.log("sendMessage関数が呼び出されました", {
        messageLength: data.message ? data.message.length : 0,
        conversationId: data.conversationId || "(新規)",
        instrument: data.instrument || "(なし)",
        roomId: data.roomId || "(なし)",
        isTestMode: !!data.isTestMode,
        auth: request.auth ? "認証済み" : "未認証",
      });

      // テストモードの場合はエコー応答
      if (data.isTestMode === true) {
        console.log("テストモードでエコー応答を返します (isTestMode=true)");
        
        try {
          // 少し待機してテスト処理をシミュレート
          await new Promise((resolve) => setTimeout(resolve, 500));
          
          // テスト用のレスポンスを構築
          const testResponse = {
            success: true,
            answer: `テストレスポンス: ${data.message} (roomId: ${data.roomId}, instrument: ${data.instrument || "なし"})`,
            conversationId: data.conversationId || "test-conversation-id",
            testInfo: {
              timestamp: new Date().toISOString(),
              params: {
                messageLength: data.message.length,
                hasRoomId: !!data.roomId,
                hasInstrument: !!data.instrument,
                hasConversationId: !!data.conversationId,
              },
            },
          };
          
          console.log("テストモードレスポンス:", testResponse);
          return testResponse;
        } catch (testError) {
          console.error("テストモード処理エラー:", testError);
          throw new HttpsError(
            "internal",
            `テストモード処理中にエラーが発生しました: ${testError instanceof Error ? testError.message : "不明なエラー"}`,
            {testMode: true}
          );
        }
      }
      
      // 実際のDify API呼び出し以降は既存のコード
      // 認証チェック（テストモード以外）
      if (!request.auth && !data.isTestMode) {
        throw new HttpsError(
          "unauthenticated",
          "認証が必要です",
        );
      }

      if (!data.message) {
        throw new HttpsError(
          "invalid-argument",
          "メッセージは必須です",
        );
      }

      if (!data.roomId) {
        throw new HttpsError(
          "invalid-argument",
          "roomIdは必須です",
        );
      }

      try {
        // リクエストパラメータをログに出力
        console.log("リクエストデータ:", {
          message: data.message,
          conversationId: data.conversationId || "(新規)",
          instrument: data.instrument || "(なし)",
          roomId: data.roomId,
          isTestMode: data.isTestMode,
          authUid: request.auth?.uid || "(認証なし)",
        });

        // 実際のDify API呼び出し
        try {
          const {apiKey, appId} = await getDifySecrets();
          
          // 認証情報の詳細（機密情報を隠して）をログに出力
          console.log("Dify API認証情報:", {apiKeyLength: apiKey.length, apiKeyPrefix: apiKey.substring(0, 4), appIdLength: appId.length, appIdPrefix: appId.substring(0, 4)});
          
          console.log("Dify API呼び出しを開始します...");
          
          // ワークフローエンドポイント
          const workflowEndpoint = "https://api.dify.ai/v1/workflows/run";
          
          // リクエスト構造を完全にログに出力
          console.log("Dify APIリクエスト構造:", {
            endpoint: workflowEndpoint,
            method: "POST",
            headers: { 
              "Authorization": "Bearer [非表示]", 
              "Content-Type": "application/json", 
            },
            data: {
              workflow_id: appId,
              inputs: {
                instrument: data.instrument || "",
                message: data.message,
                roomId: data.roomId || "",
              },
              user: request.auth ? request.auth.uid : "anonymous-user",
            },
          });
          
          console.log("Dify APIリクエスト送信開始:", workflowEndpoint);
          
          // ワークフローエンドポイントにリクエスト
          const workflowResponse = await axios.post(
            workflowEndpoint,
            {
              workflow_id: appId,
              inputs: {
                instrument: data.instrument || "",
                message: data.message,
                roomId: data.roomId || "",
              },
              user: request.auth ? request.auth.uid : "anonymous-user",
            },
            {
              headers: {
                "Authorization": "Bearer " + apiKey,
                "Content-Type": "application/json",
              },
              timeout: 30000, // 30秒タイムアウト
            }
          );
          
          console.log("Dify APIレスポンスステータス:", workflowResponse.status + " " + workflowResponse.statusText);
          console.log("Dify APIレスポンスヘッダー:", JSON.stringify(workflowResponse.headers));
          console.log("Dify APIレスポンス構造:", JSON.stringify(workflowResponse.data, null, 2).substring(0, 500) + "...");
          
          // ログにDifyの返答の主要部分だけを出力
          if (workflowResponse.data?.outputs?.answer) {
            console.log("Dify AI応答テキスト:", 
              workflowResponse.data.outputs.answer.substring(0, 100) + 
              (workflowResponse.data.outputs.answer.length > 100 ? "..." : "")
            );
          }
          
          // 成功応答を返す
          return {
            success: true,
            answer: workflowResponse.data.outputs.answer || "応答がありませんでした",
            conversationId: workflowResponse.data.outputs.conversation_id || data.conversationId || "",
          };
        } catch (apiError: any) {
          // APIエラーの詳細をログに出力
          console.error("Dify API呼び出しエラー:", {
            message: apiError.message,
            code: apiError.code,
            stack: apiError.stack,
            response: apiError.response ? {
              status: apiError.response.status,
              statusText: apiError.response.statusText,
              data: JSON.stringify(apiError.response.data),
              headers: JSON.stringify(apiError.response.headers),
            } : "レスポンスなし",
            request: apiError.request ? {
              method: apiError.request.method,
              path: apiError.request.path,
              host: apiError.request.host,
            } : "リクエストなし",
          });
          
          throw new HttpsError(
            "internal",
            `AIからの応答の取得に失敗しました: ${apiError.message}`,
            {apiErrorDetails: apiError.response?.data || {}}
          );
        }
      } catch (error: any) {
        console.error("処理エラー:", error);
        throw new HttpsError(
          "internal",
          error instanceof Error ? error.message : "メッセージの送信に失敗しました",
        );
      }
    } catch (error: any) {
      console.error("処理エラー:", error);
      throw new HttpsError(
        "internal",
        error instanceof Error ? error.message : "メッセージの送信に失敗しました",
      );
    }
  },
);

// 正しく初期化されたことをログに記録
console.log("Firebase Functions初期化完了");

// 練習メニュー生成機能をインポート
import {generatePracticeMenu, generateTasksFromLessons} from "./practice-menu";

// 他のモジュールで必要な関数をエクスポート（必要に応じて）
export * from "./summaries";
export * from "./common/errors";
export {generatePracticeMenu, generateTasksFromLessons};
