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

/**
 * 楽器名を正規化する関数
 * woodwind-saxophone-standard -> saxophone のように変換
 */
function normalizeInstrumentName(instrument: string): string {
  if (!instrument) return "saxophone"; // デフォルト値を設定
  
  console.log(`正規化前の楽器名: "${instrument}"`);
  
  // woodwind-saxophone-standard -> saxophone
  if (instrument.includes("-")) {
    const parts = instrument.split("-");
    // 真ん中の部分（saxophoneなど）を抽出
    if (parts.length >= 2) {
      console.log(`楽器名を分割: ${parts.join(", ")}`);
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
    console.log(`マッピングから楽器名を検出: ${normalizedKey} -> ${instrumentMap[normalizedKey]}`);
    return instrumentMap[normalizedKey];
  }
  
  // どの条件にも一致しない場合はそのまま返す
  console.log(`変換なしで楽器名を使用: "${instrument}"`);
  return instrument;
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

      // 認証必須の処理
      if (!request.auth) {
        console.error("認証されていないユーザーからのリクエストを拒否しました");
        throw new HttpsError(
          "unauthenticated",
          "この機能を使用するには認証が必要です"
        );
      }

      // 認証ユーザーのIDを記録
      const authUid = request.auth.uid;
      console.log("認証ユーザーID:", authUid);

      // 追加デバッグログ - 要求されたパラメータを全てログに出力
      console.log("送信パラメータ詳細:", JSON.stringify({
        message: data.message ? data.message.substring(0, 100) + "..." : undefined,
        conversationId: data.conversationId,
        instrument: data.instrument,
        roomId: data.roomId,
        isTestMode: data.isTestMode,
        userId: authUid,
      }));

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
      
      // 認証チェック（テストモード以外）
      // 認証チェックを一時的に無効化 (デバッグ用)
      /*
      if (!request.auth && !data.isTestMode) {
        throw new HttpsError(
          "unauthenticated",
          "認証が必要です",
        );
      }
      */
      console.log("認証チェックをスキップしました");

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
        // ユーザープロファイルから楽器情報を取得
        let instrumentFromProfile = "";
        if (request.auth?.uid) {
          try {
            const userProfileRef = admin.firestore().collection("users").doc(request.auth.uid);
            const userProfile = await userProfileRef.get();
            
            if (userProfile.exists) {
              const profileData = userProfile.data();
              
              // 三層構造の楽器情報を取得
              const instrumentCategory = profileData?.instrumentCategory || "";
              const instrumentName = profileData?.instrumentName || "";
              const instrumentModel = profileData?.instrumentModel || "";
              
              console.log(`ユーザープロファイルから楽器情報を取得: カテゴリ="${instrumentCategory}", 楽器="${instrumentName}", モデル="${instrumentModel}"`);
              
              // 楽器名を小文字で取得（メインの楽器名を優先）
              if (instrumentName) {
                instrumentFromProfile = instrumentName.toLowerCase();
              } else if (instrumentCategory) {
                // カテゴリのみがある場合はそれを使用
                instrumentFromProfile = instrumentCategory.toLowerCase();
              }
              
              console.log(`使用する楽器名: "${instrumentFromProfile}"`);
            } else {
              console.log("ユーザープロファイルが見つかりません");
            }
          } catch (profileError) {
            console.error("ユーザープロファイル取得エラー:", profileError);
          }
        }

        // 実際のDify API呼び出し
        try {
          const {apiKey, appId} = await getDifySecrets();
          
          // 認証情報の詳細（機密情報を隠して）をログに出力
          console.log("Dify API認証情報:", {apiKeyLength: apiKey.length, apiKeyPrefix: apiKey.substring(0, 4), appIdLength: appId.length, appIdPrefix: appId.substring(0, 4)});
          
          console.log("Dify API呼び出しを開始します...");
          
          // ワークフローエンドポイント
          const workflowEndpoint = "https://api.dify.ai/v1/workflows/run";
          console.log("使用するエンドポイント:", workflowEndpoint);

          // バックアップエンドポイント（通常のチャットメッセージAPI）
          const chatEndpoint = "https://api.dify.ai/v1/chat-messages";
          
          // 使用する楽器名（プロファイルからの情報を優先）
          const instrumentToUse = instrumentFromProfile || data.instrument || "";
          console.log(`使用する楽器情報: "${instrumentToUse}" (プロファイルから: ${!!instrumentFromProfile}, パラメータから: ${!!data.instrument})`);
          
          // リクエスト構造を完全にログに出力
          console.log("Dify APIリクエスト構造:", {
            workflow_id: appId,
            inputs: {
              instrument: instrumentToUse,
              roomId: data.roomId || "",
            },
            query: data.message,
            user: request.auth ? request.auth.uid : "anonymous-user",
            apiKey: apiKey ? "設定済み (長さ: " + apiKey.length + ")" : "未設定",
          });
          
          console.log("Dify APIリクエスト送信開始:", workflowEndpoint);
          
          // ワークフローエンドポイントにリクエスト
          try {
            // 楽器名を正規化
            const normalizedInstrument = normalizeInstrumentName(instrumentToUse);
            console.log(`楽器名を正規化: "${instrumentToUse}" -> "${normalizedInstrument}"`);
            
            const workflowResponse = await axios.post(
              workflowEndpoint,
              {
                workflow_id: appId,
                inputs: {
                  instrument: normalizedInstrument,
                  roomId: data.roomId || "",
                },
                query: data.message,
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
            if (workflowResponse.data && workflowResponse.data.answer) {
              console.log("Dify AIの応答:", workflowResponse.data.answer.substring(0, 100) + "...");
            }
            
            // 成功応答を返す
            return {
              success: true,
              answer: workflowResponse.data.outputs?.answer === "♪エラー♪" || workflowResponse.data.answer === "♪エラー♪" ? 
                "楽器種類の指定がないため、応答できません。プロフィール設定で楽器を選択してからお試しください。" :
                workflowResponse.data.outputs?.answer || workflowResponse.data.answer || "応答がありませんでした",
              conversationId: workflowResponse.data.outputs?.conversation_id || workflowResponse.data.conversation_id || data.conversationId || "",
            };
          } catch (workflowError: any) {
            // ワークフローが失敗した場合、通常のチャットエンドポイントを試す
            console.log("ワークフローエンドポイント失敗、チャットエンドポイントを試します:", chatEndpoint);
            
            try {
              // 楽器名を正規化
              const normalizedInstrument = normalizeInstrumentName(instrumentToUse);
              
              const chatResponse = await axios.post(
                chatEndpoint,
                {
                  inputs: {
                    instrument: normalizedInstrument,
                  },
                  query: data.message,
                  response_mode: "blocking",
                  conversation_id: data.conversationId || "",
                  user: request.auth ? request.auth.uid : "anonymous-user",
                },
                {
                  headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                  },
                  timeout: 30000,
                }
              );
              
              console.log("Dify チャットAPIレスポンスステータス:", chatResponse.status);
              console.log("Dify チャットAPIレスポンス構造:", JSON.stringify(chatResponse.data, null, 2).substring(0, 500) + "...");
              
              // レスポンスを返す
    return {
      success: true,
                answer: chatResponse.data.answer === "♪エラー♪" ? 
                  "楽器種類の指定がないため、応答できません。プロフィール設定で楽器を選択してからお試しください。" : 
                  chatResponse.data.answer || "応答がありませんでした",
                conversationId: chatResponse.data.conversation_id || data.conversationId || "",
              };
            } catch (chatError: any) {
              // チャットエンドポイントも失敗した場合
              console.error("両方のDify API呼び出しに失敗しました", {
                workflowError: workflowError.message,
                chatError: chatError.message,
              });
    
    throw new HttpsError(
                "internal",
                `Dify API呼び出しエラー: ${chatError.message}`,
                {
                  status: chatError.response?.status,
                  data: chatError.response?.data,
                }
              );
            }
          }
        } catch (axiosError: any) {
          console.error("Dify API呼び出しエラー:", {
            message: axiosError.message,
            code: axiosError.code,
            response: axiosError.response ? {
              status: axiosError.response.status,
              statusText: axiosError.response.statusText,
              headers: axiosError.response.headers,
              data: axiosError.response.data,
            } : "レスポンスなし",
            config: axiosError.config ? {
              url: axiosError.config.url,
              method: axiosError.config.method,
              timeout: axiosError.config.timeout,
              headers: axiosError.config.headers,
            } : "設定情報なし",
          });
          throw new HttpsError(
            "internal",
            `Dify API呼び出しエラー: ${axiosError.message}`,
            {
              status: axiosError.response?.status,
              data: axiosError.response?.data,
            }
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
import {generateTasksFromLessons} from "./practice-menu";

// 他のモジュールで必要な関数をエクスポート（必要に応じて）
export * from "./summaries";
export * from "./common/errors";
export {generateTasksFromLessons};
