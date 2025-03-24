/**
 * Dify チャットAPI クライアント
 * トークルーム用のDify API呼び出しを処理
 */
import axios from 'axios';
import { getCachedSecret } from './secretManager';

// Dify APIのベースURL
const DIFY_API_BASE_URL = 'https://api.dify.ai/v1';

// モデルタイプに基づいてAPIキーとアプリIDを取得
async function getDifyCredentials(modelType: string) {
  console.log(`モデルタイプ "${modelType}" のDify認証情報を取得します`);
  
  try {
    // モデルタイプを解析してAPIキーとアプリIDを取得
    // フォーマット: categoryId-instrumentId-modelId
    const parts = modelType.split('-');
    
    // デフォルトはスタンダードモデル
    let apiKeySecretName = 'dify-standard-api-key';
    let appIdSecretName = 'dify-standard-app-id';
    
    // アーティストモデルの場合は楽器固有のAPIを使用
    if (parts.length >= 3 && parts[2] !== 'standard') {
      const instrumentId = parts[1]; // 例: saxophone, piano
      const artistModelId = parts[2]; // 例: artist1, artist2
      
      // 楽器固有のシークレット名を構築
      apiKeySecretName = `dify-${instrumentId}-${artistModelId}-api-key`;
      appIdSecretName = `dify-${instrumentId}-${artistModelId}-app-id`;
      
      console.log(`アーティストモデル用のシークレット: ${apiKeySecretName}, ${appIdSecretName}`);
    } else {
      console.log(`スタンダードモデル用のシークレットを使用します`);
    }
    
    // シークレットマネージャーからAPIキーとアプリIDを取得
    try {
      const apiKey = await getCachedSecret(apiKeySecretName);
      const appId = await getCachedSecret(appIdSecretName);
      
      console.log(`Dify認証情報の取得成功: ${apiKeySecretName}`);
      
      return {
        apiKey,
        appId,
        apiKeySecretName,
        appIdSecretName
      };
    } catch (error) {
      // 特定のシークレットが見つからない場合はスタンダードモデルの認証情報を使用
      console.warn(`${apiKeySecretName}の取得に失敗。スタンダードモデルにフォールバックします`, error);
      
      const standardApiKey = await getCachedSecret('dify-standard-api-key');
      const standardAppId = await getCachedSecret('dify-standard-app-id');
      
      return {
        apiKey: standardApiKey,
        appId: standardAppId,
        apiKeySecretName: 'dify-standard-api-key',
        appIdSecretName: 'dify-standard-app-id'
      };
    }
  } catch (error) {
    console.error('Dify認証情報の取得中にエラーが発生しました:', error);
    throw new Error('Dify APIの認証情報取得に失敗しました');
  }
}

/**
 * Dify APIに新しいメッセージを送信する
 */
export async function sendMessageToDify(
  message: string,
  userId: string,
  modelType: string = 'standard',
  conversationId?: string,
  additionalInputs: Record<string, any> = {}
) {
  try {
    console.log('Dify APIにメッセージを送信します:', {
      messageLength: message.length,
      userId,
      modelType,
      conversationId: conversationId || 'なし'
    });
    
    // モデルタイプからDify認証情報を取得
    const { apiKey, appId } = await getDifyCredentials(modelType);
    
    // 楽器情報を抽出（モデルタイプのフォーマット: categoryId-instrumentId-modelId）
    let instrumentName = 'piano';
    const parts = modelType.split('-');
    if (parts.length >= 2) {
      instrumentName = parts[1];
    }
    
    // リクエストパラメータの準備
    const inputs = {
      instrument: instrumentName,
      ...additionalInputs
    };
    
    console.log('Dify APIリクエストパラメータ:', {
      apiUrl: `${DIFY_API_BASE_URL}/chat-messages`,
      appId,
      inputs,
      userId,
      conversationId: conversationId || 'なし',
      messagePreview: message.substring(0, 100) + (message.length > 100 ? '...' : '')
    });
    
    // Dify APIにリクエストを送信
    const response = await axios.post(
      `${DIFY_API_BASE_URL}/chat-messages`,
      {
        inputs,
        query: message,
        user: userId,
        conversation_id: conversationId || undefined,
        response_mode: "blocking"
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    // レスポンスのログを記録
    console.log('Dify API応答を受信:', {
      status: response.status,
      hasAnswer: !!response.data.answer,
      answerLength: response.data.answer ? response.data.answer.length : 0,
      conversationId: response.data.conversation_id || 'なし'
    });
    
    // 成功したレスポンスを返す
    return {
      answer: response.data.answer,
      conversationId: response.data.conversation_id,
      success: true,
      metadata: {
        modelType,
        instrumentName,
        apiVersion: "v1",
        appId
      }
    };
  } catch (error: any) {
    // エラーログを記録
    console.error('Dify API呼び出しエラー:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // エラーを再スロー
    throw new Error(`Dify APIの呼び出しに失敗しました: ${error.message}`);
  }
} 