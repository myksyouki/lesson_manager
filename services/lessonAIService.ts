import { auth, db, firebaseApp } from '../config/firebase';
import { doc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

// Debug: 緊急対応用にFunctionsを再初期化
console.log('⚠️ Functionsを緊急モードで初期化します');
const emergencyFunctions = getFunctions();
// リージョンを明示的に設定 (Firebase SDKバージョンによっては違う方法が必要)
// @ts-ignore 古いバージョンとの互換性のためにregionプロパティを直接設定
emergencyFunctions.region = 'asia-northeast1';

console.log('🔧 緊急Functions初期化結果:', {
  functionsExists: !!emergencyFunctions,
  functionsType: typeof emergencyFunctions,
  // @ts-ignore
  hasRegion: !!emergencyFunctions.region,
  // @ts-ignore
  region: emergencyFunctions.region || '不明'
});

// 明示的にFunctions初期化を行う
const functions = emergencyFunctions;

// Firebaseプロジェクト情報
const projectId = firebaseApp?.options?.projectId || 'lesson-manager-99ab9';
const region = 'asia-northeast1';

// アーティストIDと変数名のマッピング
const ARTIST_MAPPING: Record<string, string> = {
  'ueno': 'ueno-kohei',        // 上野耕平
  'tanaka': 'tanaka-soichiro', // 田中奏一朗
  'tsuzuki': 'tsuzuki-jun',    // 都築惇
  'sumiya': 'sumiya-miho',     // 住谷美帆
  'saito': 'saito-kenta'       // 齊藤健太
};

// 直接HTTPモードを有効化
const DIRECT_TRY_ENABLED = true;

// デバッグ情報
console.log('lessonAIService初期化:', {
  firebaseAppExists: !!firebaseApp,
  projectId,
  functionsExists: !!functions,
  region
});

/**
 * モデルIDからアーティスト変数名を取得
 * @param modelId モデルID
 * @returns アーティスト変数名、スタンダードの場合はundefined
 */
function getArtistVariableName(modelId: string): string | undefined {
  if (modelId === 'standard') return undefined;
  return ARTIST_MAPPING[modelId];
}

/**
 * レッスンAIに新しいメッセージを送信する
 */
export const sendMessageToLessonAI = async (
  message: string,
  conversationId: string = '',
  modelId: string = 'standard',
  roomId: string = '',
  isTestMode: boolean = false,
  retryCount: number = 0 // リトライカウンター
): Promise<any> => {
  const MAX_RETRIES = 2; // 最大リトライ回数
  
  try {
    // 詳細なデバッグログ
    console.log('🔍 sendMessageToLessonAI詳細診断モード:', { 
      message: message.substring(0, 30) + (message.length > 30 ? '...' : ''), 
      conversationId, 
      modelId, 
      roomId,
      retryCount,
      timestamp: new Date().toISOString()
    });
    
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // ユーザー認証情報を更新し、最新トークンを取得
    try {
      await currentUser.reload();
      console.log('👤 認証ユーザー情報更新完了:', {
        uid: currentUser.uid,
        isAnonymous: currentUser.isAnonymous,
        emailVerified: currentUser.emailVerified,
        providerId: currentUser.providerId,
      });
    } catch (error) {
      console.warn('認証情報更新エラー:', error);
    }
    
    // 最新トークンを先に取得（同期的に）
    let idToken = '';
    try {
      idToken = await currentUser.getIdToken(true); // 強制的に更新
      console.log('🔑 認証トークン取得成功:', idToken.substring(0, 10) + '...');
    } catch (tokenError) {
      console.error('認証トークン取得エラー:', tokenError);
      throw new Error('認証トークンの取得に失敗しました。再度ログインしてください。');
    }

    // 実際のAPI呼び出しに関連するアーティストモデルかどうかを判断
    const isArtistModel = modelId !== 'standard' && modelId in ARTIST_MAPPING;
    
    // アーティスト名を取得
    const artistName = isArtistModel ? getArtistVariableName(modelId) : undefined;
    
    // リクエストパラメータ
    const params = {
      message: message,
      conversationId,
      modelId,  
      roomId,
      isTestMode,
      useArtistModel: isArtistModel,
      artistName,
      userId: currentUser.uid,
      clientTimestamp: Date.now()
    };
    
    console.log('リクエストパラメータ詳細:', {
      messageLength: message.length,
      conversationId: conversationId || '(新規)',
      modelId: params.modelId,
      roomId,
      isTestMode,
      userId: currentUser.uid,
      isArtistModel,
      artistName,
      clientTimestamp: params.clientTimestamp
    });
    
    // 直接HTTP呼び出しを優先して使用（より信頼性が高いため）
    const manualEndpoint = `https://${region}-${projectId}.cloudfunctions.net/sendMessage`;
    console.log(`🔗 直接HTTP呼び出し開始: ${manualEndpoint}`);
    
    try {
      // 標準的なHTTP POSTリクエスト
      const manualResponse = await fetch(manualEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          data: params // 重要: Firebaseの形式に合わせて "data" プロパティ内にパラメータを設定
        })
      });
      
      // レスポンスステータスをログ
      console.log(`📊 HTTP応答ステータス: ${manualResponse.status}`);
      
      if (!manualResponse.ok) {
        throw new Error(`HTTP呼び出しエラー: ${manualResponse.status} ${manualResponse.statusText}`);
      }
      
      // レスポンスをJSON解析
      const responseData = await manualResponse.json();
      console.log('📄 HTTP応答データ:', {
        dataKeys: Object.keys(responseData),
        hasResult: !!responseData.result,
        hasData: !!responseData.data,
        dataType: typeof responseData
      });
      
      // 応答データを標準形式に変換
      const result = responseData.result || responseData;
      
      // サーバー側のエラーでも成功レスポンスの場合、クライアント側でデフォルト値を設定
      return {
        success: result.success !== undefined ? result.success : true,
        answer: result.answer || 'すみません、応答を取得できませんでした。しばらく経ってからもう一度お試しください。', 
        conversationId: result.conversationId || '',
        messageId: result.messageId || `ai-${Date.now()}`,
        created: result.created || new Date().toISOString()
      };
      
    } catch (httpError: any) {
      console.error('HTTP直接呼び出しエラー:', httpError);
      
      // HTTP呼び出しに失敗した場合、Firebase SDKを使用した呼び出しを試す
      console.warn('SDK経由での呼び出しに切り替えます...');
      
      try {
        // Firebase SDKを使用した呼び出し
        const sendMessageFunc = httpsCallable(functions, 'sendMessage');
        const functionResult = await sendMessageFunc(params);
        
        console.log('SDK呼び出し成功:', {
          dataExists: !!functionResult.data,
          dataType: typeof functionResult.data
        });
        
        const result = functionResult.data as any;
        
        return {
          success: result.success !== undefined ? result.success : true,
          answer: result.answer || 'すみません、応答を取得できませんでした。しばらく経ってからもう一度お試しください。', 
          conversationId: result.conversationId || '',
          messageId: result.messageId || `ai-${Date.now()}`,
          created: result.created || new Date().toISOString()
        };
        
      } catch (sdkError: any) {
        console.error('SDK呼び出しエラー:', sdkError);
        
        // 両方とも失敗した場合は直接Dify APIを呼び出す
        console.warn('直接Dify APIに切り替えます...');
        
        return await sendMessageToLessonAIHttp(
          message,
          conversationId,
          modelId,
          roomId,
          isTestMode
        );
      }
    }
    
  } catch (error: any) {
    console.error('sendMessageToLessonAIエラー詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    // エラー情報の整形
    const errorInfo = {
      success: false,
      message: error.message || '不明なエラー',
      code: error.code,
      details: error.details,
      timestamp: new Date().toISOString()
    };
    
    throw errorInfo;
  }
};

// HTTP直接呼び出しを実装（診断用）
export const sendMessageToLessonAIHttp = async (
  message: string,
  conversationId: string = '',
  modelId: string = 'standard',
  roomId: string = '',
  isTestMode: boolean = false
): Promise<any> => {
  try {
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // アーティストモデルかどうかを判断
    const isArtistModel = modelId !== 'standard' && modelId in ARTIST_MAPPING;
    const artistName = isArtistModel ? getArtistVariableName(modelId) : undefined;
    
    console.log('HTTP直接呼び出し開始:', { 
      messageLength: message.length,
      conversationId, 
      modelId, 
      roomId,
      isArtistModel,
      artistName
    });
    
    // 注意: これらは実際のプロダクション環境では環境変数またはセキュアな方法で管理する必要があります
    const apiKey = 'app-aB2b3FwHgueOVTXSXFE3cIWL';
    const appId = '678db37d-d760-4b66-b7b2-f391e7a92e9c';
    
    // 実際のDify API設定 - 正しいエンドポイントに修正
    // 正しいエンドポイントは api.dify.ai
    const apiUrl = `https://api.dify.ai/v1/chat-messages`;
    
    // リクエストの準備
    const startTime = Date.now();
    try {
      // リクエストのデータ構造
      const requestData = {
        query: message,
        user: currentUser.uid,
        inputs: {
          instrument: modelId,
          user_use: 'chat',
          room_id: roomId || ''  // 必要に応じて追加
        },
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      };
      
      console.log('送信リクエスト:', JSON.stringify(requestData, null, 2));
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      const endTime = Date.now();
      
      if (!response.ok) {
        console.error(`HTTP直接呼び出しエラー (${endTime - startTime}ms):`, {
          status: response.status,
          statusText: response.statusText
        });
        
        // APIからのエラーメッセージを取得
        try {
          const errorJson = await response.json();
          console.error('エラーレスポンス:', JSON.stringify(errorJson, null, 2));
          throw new Error(`Dify API エラー: ${errorJson.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`HTTP エラー ${response.status}: ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log(`HTTP直接呼び出し成功 (${endTime - startTime}ms):`, {
        hasAnswer: !!data.choices?.[0]?.message?.content || !!data.answer,
        answerLength: (data.choices?.[0]?.message?.content || data.answer || '').length,
        conversationId: data.conversation_id || data.id,
        messageId: data.id
      });
      
      return {
        success: true,
        answer: data.choices?.[0]?.message?.content || data.answer || 'レスポンスを取得できませんでした',
        conversationId: data.conversation_id || data.id,
        messageId: data.id
      };
    } catch (fetchError: any) {
      const endTime = Date.now();
      console.error(`HTTP直接呼び出しネットワークエラー (${endTime - startTime}ms):`, {
        message: fetchError.message,
        stack: fetchError.stack?.split('\n').slice(0, 3).join('\n')
      });
      throw fetchError;
    }
  } catch (error: any) {
    console.error('HTTP直接呼び出しエラー詳細:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    });
    
    throw {
      success: false,
      message: error instanceof Error ? error.message : '不明なエラー',
      timestamp: new Date().toISOString()
    };
  }
};

// Firebase Functionsの接続テスト
export const testFunctionsConnection = async () => {
  try {
    console.log('Firebase Functions接続テスト開始');
    
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // テスト用の簡単なメッセージを送信
    const testMessage = 'テストメッセージ';
    const testParams = {
      query: testMessage,
      conversationId: `test-${Date.now()}`,
      instrument: 'standard',
      roomId: 'test-room',
      isTestMode: true
    };
    
    console.log('テストリクエスト送信:', testParams);
    
    const sendMessageFunc = httpsCallable(functions, 'sendMessage');
    const result = await sendMessageFunc(testParams);
    
    console.log('テストリクエスト成功:', {
      success: true,
      resultExists: !!result,
      dataExists: !!result.data
    });
    
    return true;
  } catch (error) {
    console.error('Firebase Functions接続テストエラー:', error);
    return false;
  }
}; 