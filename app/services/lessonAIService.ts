import { getChatRoomById } from './chatRoomService';
import { auth } from '../config/firebase';
import { db } from "../config/firebase";
import { collection, doc, setDoc, addDoc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firebaseApp } from '../config/firebase';

// レッスンAIのレスポンス型
export interface LessonAIResponse {
  answer: string;
  conversationId?: string;
  success: boolean;
}

const functions = getFunctions(firebaseApp, 'asia-northeast1');

/**
 * AIレッスンアシスタントにメッセージを送信する関数
 */
export const sendMessageToLessonAI = async (
  message: string,
  conversationId: string = "",
  instrument: string = "",
  roomId: string = ""
): Promise<any> => {
  try {
    console.log('AIレッスンアシスタントにメッセージを送信:', {
      message: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      conversationId: conversationId || '(新規会話)',
      instrument,
      roomId
    });
    
    const chatFunc = httpsCallable(functions, 'sendMessage');
    const result = await chatFunc({
      message,
      conversationId,
      instrument,
      roomId
    });
    
    console.log('AIレッスンアシスタント応答結果:', result.data);
    return result.data;
  } catch (error) {
    console.error('AIレッスンアシスタントメッセージ送信エラー:', error);
    return {
      success: false,
      error,
      message: `メッセージ送信に失敗しました: ${error}`
    };
  }
};

// テスト用関数：Firebase Functionsの接続をテスト
export const testFunctionConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Firebase Functionsテスト開始...');
    const testFunction = httpsCallable(functions, 'testEcho');
    const result = await testFunction({ message: 'テスト' });
    console.log('Firebase Functionsテスト成功:', result.data);
    return { success: true, message: 'Firebase Functionsの接続テストに成功しました。' };
  } catch (error) {
    console.error('Firebase Functionsテストエラー:', error);
    return { success: false, message: `Firebase Functionsの接続テストに失敗しました: ${error}` };
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
 * 様々なバリエーションでDify API接続テスト
 */
export const testDifyApiVariations = async (): Promise<any> => {
  try {
    console.log('Dify APIバリエーションテスト開始（クライアント）');
    
    const testFunc = httpsCallable(functions, 'testDifyVariations');
    const result = await testFunc();
    
    console.log('Dify APIバリエーションテスト結果:', result.data);
    return result.data;
  } catch (error) {
    console.error('Dify APIバリエーションテストエラー:', error);
    return {
      success: false,
      error,
      message: `バリエーションテストに失敗しました: ${error}`
    };
  }
}; 