import { auth, db, firebaseApp } from '../config/firebase';
import { doc, setDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';

// 明示的にFunctions初期化を行う
const functions = getFunctions(firebaseApp, 'asia-northeast1');
// Firebaseプロジェクト情報
const projectId = firebaseApp?.options?.projectId || 'lesson-manager-99ab9';
const region = 'asia-northeast1';

// デバッグ情報
console.log('lessonAIService初期化:', {
  firebaseAppExists: !!firebaseApp,
  projectId,
  functionsExists: !!functions,
  region
});

/**
 * レッスンAIに新しいメッセージを送信する (Firebase SDK経由)
 */
export const sendMessageToLessonAI = async (
  message: string,
  conversationId: string = '',
  instrument: string = 'standard',
  roomId: string = '',
  isTestMode: boolean = false
): Promise<any> => {
  try {
    console.log('sendMessageToLessonAI開始:', { 
      message: message.substring(0, 30) + (message.length > 30 ? '...' : ''), 
      conversationId, 
      instrument, 
      roomId 
    });
    
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    console.log('SDK呼び出し - 認証状態確認:', {
      uid: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous,
      emailVerified: currentUser.emailVerified,
      providerId: currentUser.providerId,
      authTokenPromise: typeof currentUser.getIdToken
    });
    
    // Firebase Functionsの状態を確認
    if (!functions) {
      throw new Error('Firebase Functionsが正しく初期化されていません');
    }
    
    // メッセージを送信する関数を呼び出す
    console.log('関数名を確認: sendMessage');
    console.log('Firebase Functions状態:', {
      functionsType: typeof functions,
      functionsKeys: Object.keys(functions),
      region: region,
      projectId: projectId,
      sendMessageExists: typeof httpsCallable(functions, 'sendMessage') === 'function'
    });
    
    const sendMessageFunc = httpsCallable(functions, 'sendMessage');
    
    // 開始時間を記録
    const startTime = Date.now();
    
    // リクエストパラメータ
    const params = {
      query: message,
      conversationId,
      instrument,
      roomId,
      isTestMode
    };
    
    console.log('SDKリクエスト送信直前...');
    console.log('リクエストパラメータ詳細:', JSON.stringify({
      queryLength: message.length,
      conversationId: conversationId || '(新規)',
      instrument,
      roomId,
      isTestMode,
      userId: currentUser.uid // ユーザーIDを明示的に追加
    }));
    
    // レスポンスを待機
    const result = await Promise.race([
      sendMessageFunc(params),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('レスポンスタイムアウト: 30秒経過')), 30000)
      )
    ]) as HttpsCallableResult<any>;
    
    // 経過時間を計算
    const elapsedTime = Date.now() - startTime;
    
    console.log('sendMessageToLessonAI完了:', { 
      success: !!result.data?.success,
      elapsedTime: `${elapsedTime}ms`,
      hasAnswer: !!result.data?.answer,
      answerLength: result.data?.answer?.length || 0,
      data: JSON.stringify(result.data).substring(0, 100)
    });
    
    // レスポンスを詳細にチェック
    if (!result.data) {
      throw new Error('APIからのレスポンスが空です');
    }
    
    if (!result.data.success) {
      console.error('Functionsからエラーレスポンス:', result.data);
      throw new Error(result.data?.message || 'AIからの応答を取得できませんでした');
    }
    
    if (!result.data.answer) {
      console.warn('Functionsから応答はあるが回答なし:', result.data);
      throw new Error('AIから応答はありましたが回答が含まれていませんでした');
    }
    
    return result.data;
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

/**
 * HTTP直接呼び出しでレッスンAIに新しいメッセージを送信する
 */
export const sendMessageToLessonAIHttp = async (
  message: string,
  conversationId: string = '',
  instrument: string = 'standard',
  roomId: string = '',
  isTestMode: boolean = false
): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  try {
    console.log('sendMessageToLessonAIHttp開始:', { 
      message: message.substring(0, 30) + (message.length > 30 ? '...' : ''), 
      conversationId, 
      instrument,
      roomId
    });
    
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    console.log('認証状態確認:', {
      uid: currentUser.uid,
      email: currentUser.email,
      isAnonymous: currentUser.isAnonymous,
      emailVerified: currentUser.emailVerified,
      providerId: currentUser.providerId,
    });
    
    // IDトークンを取得
    const idToken = await currentUser.getIdToken(true); // forceRefresh=trueでトークンを強制更新
    
    if (!idToken) {
      throw new Error('認証トークンの取得に失敗しました');
    }
    
    console.log('認証トークン取得成功:', {
      tokenLength: idToken.length,
      tokenPrefix: idToken.substring(0, 10) + '...'
    });
    
    // エンドポイントを生成
    const endpoint = `https://${region}-${projectId}.cloudfunctions.net/sendMessage`;
    console.log('HTTP直接エンドポイント:', endpoint);
    
    // ヘッダーとボディを準備
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    };
    
    const payload = {
      data: {
        message,
        conversationId,
        instrument,
        roomId,
        isTestMode,
        userId: currentUser.uid
      }
    };
    
    console.log('HTTP直接リクエスト準備完了:', {
      endpoint,
      payloadSize: JSON.stringify(payload).length,
      authTokenPrefix: idToken.substring(0, 10) + '...',
      headers: Object.keys(headers)
    });
    
    // 開始時間を記録
    const startTime = Date.now();
    
    // HTTPリクエスト実行
    console.log('HTTP直接リクエスト送信直前...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    // 経過時間を計算
    const elapsedTime = Date.now() - startTime;
    
    console.log('HTTP直接レスポンス受信:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries([...response.headers.entries()])
    });
    
    // エラーチェック
    if (!response.ok) {
      const errorText = await response.text();
      console.error('HTTP直接エラー詳細:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      throw new Error(`HTTP エラー ${response.status}: ${errorText}`);
    }
    
    // 応答処理
    console.log('HTTP直接レスポンスJSON解析中...');
    const responseData = await response.json();
    
    console.log('sendMessageToLessonAIHttp完了:', { 
      status: response.status,
      elapsedTime: `${elapsedTime}ms`,
      hasResult: !!responseData.result,
      hasAnswer: !!responseData.result?.answer,
      answerLength: responseData.result?.answer?.length || 0,
      data: JSON.stringify(responseData.result).substring(0, 100)
    });
    
    // レスポンスを詳細にチェック
    if (!responseData.result) {
      console.error('HTTP直接呼び出しからのレスポンスにresultが含まれていません:', responseData);
      throw new Error('APIレスポンスにresultが含まれていません');
    }
    
    if (!responseData.result.success) {
      console.error('HTTP直接呼び出しからエラーレスポンス:', responseData.result);
      throw new Error(responseData.result?.message || 'AIからの応答を取得できませんでした');
    }
    
    if (!responseData.result.answer) {
      console.warn('HTTP直接呼び出しから応答はあるが回答なし:', responseData.result);
      throw new Error('AIから応答はありましたが回答が含まれていませんでした');
    }
    
    return responseData.result;
  } catch (error: any) {
    // タイムアウトを確実にクリア
    clearTimeout(timeoutId);
    
    // エラーがAbortErrorかどうかを確認
    if (error.name === 'AbortError') {
      throw new Error('レスポンスタイムアウト: 30秒経過');
    }
    
    console.error('sendMessageToLessonAIHttpエラー詳細:', {
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