import { getChatRoomById } from './chatRoomService';
import { auth } from '../config/firebase';
import { db } from "../config/firebase";
import { collection, doc, setDoc, addDoc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable, HttpsCallableResult } from 'firebase/functions';
import { firebaseApp, functions as configFunctions } from '../config/firebase';

// レッスンAIのレスポンス型
export interface LessonAIResponse {
  answer: string;
  conversationId?: string;
  success: boolean;
}

// 明示的にFunctions初期化を行う（設定ファイルからの参照よりも確実な方法）
const functions = configFunctions;

/**
 * AIレッスンアシスタントにメッセージを送信する関数
 */
export const sendMessageToLessonAI = async (
  message: string,
  conversationId: string = "",
  instrument: string = "",
  roomId: string = "",
  isTestMode: boolean = false
): Promise<any> => {
  try {
    console.log('AIレッスンアシスタントにメッセージを送信:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      conversationId: conversationId || '(新規会話)',
      instrument,
      roomId,
      isTestMode: isTestMode
    });
    
    if (isTestMode) {
      console.log('テストモードでメッセージを送信します - isTestMode=true');
    }
    
    // Firebase Functions参照を正しく取得できているか検証
    if (!functions) {
      throw new Error('Firebase Functionsが正しく初期化されていません');
    }
    
    console.log('Firebase Functions確認:', {
      functionsExists: !!functions,
      projectId: firebaseApp.options.projectId
    });
    
    // 送信パラメータを構築
    const params = {
      message,
      conversationId,
      instrument,
      roomId,
      isTestMode: isTestMode // 明示的にブール値を渡す
    };
    
    console.log('送信パラメータ:', JSON.stringify(params));
    
    // 関数呼び出し前のタイムスタンプ
    const startTime = new Date().getTime();
    console.log(`Firebase Function 呼び出し開始: ${new Date().toISOString()}`);
    
    try {
      // Firebase Functions参照を取得
      const chatFunc = httpsCallable(functions, 'sendMessage');
      
      // 関数を呼び出し（タイムアウト対策として別のtry-catchで囲む）
      const result = await Promise.race([
        chatFunc(params),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Firebase Functions呼び出しタイムアウト')), 15000)
        )
      ]) as HttpsCallableResult<any>;
      
      // 関数呼び出し後のタイムスタンプと処理時間
      const endTime = new Date().getTime();
      console.log(`Firebase Function 呼び出し完了: ${new Date().toISOString()}, 処理時間: ${endTime - startTime}ms`);
      
      // 詳細なレスポンス情報をログに出力
      console.log('AIレッスンアシスタント応答結果:', {
        success: (result.data as any).success,
        answerLength: (result.data as any).answer ? (result.data as any).answer.length : 0,
        conversationId: (result.data as any).conversationId,
        firstChars: (result.data as any).answer ? (result.data as any).answer.substring(0, 20) : '',
        fullResponse: result.data
      });
      
      return result.data;
    } catch (callError: any) {
      const endTime = new Date().getTime();
      console.error(`Firebase Function 呼び出しエラー: ${new Date().toISOString()}, 経過時間: ${endTime - startTime}ms`, callError);
      
      // エラーを上位に再スロー
      throw callError;
    }
  } catch (error: any) {
    // より詳細なエラー情報をログに記録
    console.error('AIレッスンアシスタントメッセージ送信エラー (詳細):', {
      errorMessage: error.message,
      errorCode: error.code,
      errorDetails: error.details,
      errorName: error.name,
      errorObject: JSON.stringify(error),
      stack: error.stack
    });
    
    // HTTP関数エラーの場合、詳細情報を抽出
    if (error.code === 'functions/internal') {
      console.error('Firebase Functions内部エラー:', error.details);
    } else if (error.code === 'functions/unavailable') {
      console.error('Firebase Functions利用不可エラー - ネットワーク接続を確認してください');
    } else if (error.code === 'functions/cancelled') {
      console.error('Firebase Functions呼び出しがキャンセルされました');
    } else if (error.code === 'functions/invalid-argument') {
      console.error('Firebase Functions無効な引数エラー:', error.details);
    } else if (error.code === 'functions/unauthenticated') {
      console.error('Firebase Functions未認証エラー - 認証が必要です');
    } else if (error.message.includes('timeout')) {
      console.error('Firebase Functions呼び出しタイムアウト');
    }
    
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        details: error.details,
        name: error.name
      },
      message: `メッセージ送信に失敗しました: ${error.message}`,
      details: error.details || {}
    };
  }
};

// テスト用関数：Firebase Functionsの接続をテスト
export const testFunctionConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Firebase Functionsテスト開始...');
    
    // Firebase Functionsの状態を確認
    if (!functions) {
      throw new Error('Firebase Functionsが正しく初期化されていません');
    }
    
    console.log('Firebase Functions確認:', {
      functionsExists: !!functions,
      projectId: firebaseApp.options.projectId
    });
    
    // sendMessage関数でテスト
    const chatFunc = httpsCallable(functions, 'sendMessage');
    
    const testParams = {
      message: 'テストメッセージ',
      roomId: 'test-room-id',
      instrument: 'test',
      conversationId: '',
      isTestMode: true
    };
    
    console.log('テストパラメータ:', JSON.stringify(testParams));
    
    const startTime = new Date().getTime();
    console.log(`テスト関数呼び出し開始: ${new Date().toISOString()}`);
    
    // タイムアウト対策
    const result = await Promise.race([
      chatFunc(testParams),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Functions接続テストタイムアウト')), 15000)
      )
    ]) as HttpsCallableResult<any>;
    
    const endTime = new Date().getTime();
    console.log(`テスト関数呼び出し完了: ${new Date().toISOString()}, 処理時間: ${endTime - startTime}ms`);
    
    console.log('Firebase Functions接続テスト成功:', result.data);
    return { 
      success: true, 
      message: `Firebase Functionsの接続テストに成功しました。(${endTime - startTime}ms)`
    };
  } catch (error: any) {
    console.error('Firebase Functionsテストエラー:', {
      message: error.message,
      code: error.code,
      stack: error.stack,
      details: error.details
    });
    return { 
      success: false, 
      message: `Firebase Functionsの接続テストに失敗しました: ${error.message || JSON.stringify(error)}`
    };
  }
};

// テスト用関数：HTTPSでEchoテスト（公開関数）
export const testHttpEcho = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('HTTP Echoテスト開始...');
    const response = await fetch(
      'https://asia-northeast1-lesson-manager-99ab9.cloudfunctions.net/httpEcho',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'HTTPテスト' }),
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('HTTP Echoテスト成功:', data);
    return { success: true, message: 'HTTP Echoテストに成功しました。' };
  } catch (error) {
    console.error('HTTP Echoテストエラー:', error);
    return { success: false, message: `HTTP Echoテストに失敗しました: ${error}` };
  }
};

/**
 * HTTP直接呼び出しテスト
 */
export const testSimpleConnection = async (testMessage: string): Promise<any> => {
  try {
    console.log('HTTP直接テスト開始:', { message: testMessage });
    
    // プロジェクト情報
    const projectId = 'lesson-manager-99ab9';
    const region = 'asia-northeast1';
    const functionName = 'httpEcho';
    
    const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;
    
    // 直接HTTPリクエスト
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: testMessage,
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP エラー: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('HTTP応答:', data);
    
    return data;
  } catch (error: any) {
    console.error('HTTP呼び出しエラー:', error);
    throw error;
  }
};

/**
 * Dify APIとの接続をテストする関数
 */
export const testDifyApiConnection = async (): Promise<any> => {
  try {
    console.log('Dify API接続テスト開始...');
    const testDifyFunc = httpsCallable(functions, 'testDifyConnection');
    const result = await testDifyFunc({});
    console.log('Dify API接続テスト結果:', result.data);
    return result.data;
  } catch (error) {
    console.error('Dify API接続テストエラー:', error);
    return {
      success: false,
      pingSuccess: false,
      message: `Dify APIテスト呼び出しに失敗しました: ${error}`,
      error
    };
  }
};

/**
 * 直接API情報を使ったDify API接続テスト（ハードコード）
 */
export const testDifyDirectApiConnection = async (): Promise<any> => {
  try {
    console.log('Dify API直接接続テスト開始（クライアント）');
    
    const testFunc = httpsCallable(functions, 'testDifyDirectConnection');
    const result = await testFunc();
    
    console.log('Dify API直接接続テスト結果:', result.data);
    return result.data;
  } catch (error) {
    console.error('Dify API直接接続テストエラー:', error);
    return {
      success: false,
      error,
      message: `直接接続テストに失敗しました: ${error}`
    };
  }
};

/**
 * Dify APIバリエーションのテスト
 */
export const testDifyApiVariations = async (): Promise<any> => {
  try {
    const testDifyVarFunc = httpsCallable(functions, 'testDifyVariations');
    const result = await testDifyVarFunc({});
    return result.data;
  } catch (error) {
    console.error('Dify APIバリエーションテストエラー:', error);
    return {
      success: false,
      message: `Dify APIバリエーションテストに失敗しました: ${error}`,
      error
    };
  }
};

/**
 * テスト用のチャットルームを作成する関数
 */
export const createTestChatRoom = async (): Promise<string> => {
  try {
    // 現在のユーザーを取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    // ユニークなIDでテスト用チャットルームを作成
    const testRoomId = `test-room-${Date.now()}`;
    const roomRef = doc(db, `users/${currentUser.uid}/chatRooms`, testRoomId);
    
    // テストチャットルームのデータ
    await setDoc(roomRef, {
      id: testRoomId,
      title: 'テスト用チャットルーム',
      topic: 'テスト',
      initialMessage: 'これはテスト用のチャットルームです',
      modelType: 'standard',
      lastMessage: {
        content: 'テスト初期化',
        sender: 'system',
        timestamp: Timestamp.now()
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    // メッセージコレクションを初期化
    const messagesCollectionRef = collection(roomRef, 'messages');
    await addDoc(messagesCollectionRef, {
      content: 'テスト初期化メッセージ',
      sender: 'system',
      timestamp: Timestamp.now()
    });
    
    console.log('テスト用チャットルーム作成成功:', testRoomId);
    return testRoomId;
  } catch (error) {
    console.error('テスト用チャットルーム作成エラー:', error);
    throw error;
  }
}; 