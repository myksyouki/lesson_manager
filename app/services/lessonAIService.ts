import { getChatRoomById } from './chatRoomService';
import { auth } from '../config/firebase';
import { db } from "../config/firebase";
import { collection, doc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import axios from 'axios';
import Constants from 'expo-constants';
import { getFunctions, httpsCallable } from 'firebase/functions';

// レッスンAIのレスポンス型
export interface LessonAIResponse {
  answer: string;
  conversationId?: string;
  success: boolean;
}

// Firebase Functionsの設定
const functions = getFunctions();
// asia-northeast1リージョンを使用
functions.region = 'asia-northeast1';
// Dify API呼び出し用の関数参照
const sendChatMessageFunc = httpsCallable(functions, 'sendChatMessage');

// DifyのAPI設定 (Functionsを使用するため、直接使用しなくなる)
const DIFY_API_BASE_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_API_BASE_URL || 'https://api.dify.ai/v1';
const DIFY_STANDARD_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_STANDARD_API_KEY || 'app-lqUus21WWzbWnovfHyGXQWiH';
const DIFY_STANDARD_APP_ID = Constants.expoConfig?.extra?.EXPO_PUBLIC_DIFY_STANDARD_APP_ID || 'aded5d31-163c-47f8-b07e-e381e73cfc64';

// Timestampをシリアライズ可能な文字列に変換する関数
const serializeTimestamp = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString();
  
  // Firestoreのタイムスタンプの場合
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  // 既にDateオブジェクトの場合
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  // 文字列の場合はそのまま
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  // それ以外の場合は現在時刻
  return new Date().toISOString();
};

/**
 * レッスンAIにメッセージを送信する
 */
export const sendMessageToLessonAI = async (
  message: string,
  roomId: string,
  modelType?: string,
  conversationId?: string
): Promise<LessonAIResponse> => {
  try {
    console.log('AIメッセージ処理開始:', {
      conversationId: conversationId || 'なし',
      messageLength: message.length,
      modelType: modelType || 'standard',
      roomId
    });

    if (!roomId) {
      console.error('チャットルームIDが未指定です');
      throw new Error('チャットルームIDが指定されていません');
    }

    // モデルタイプから楽器情報を抽出
    let instrumentName = 'standard';
    if (modelType) {
      // モデルタイプの形式: categoryId-instrumentId-modelId
      const parts = modelType.split('-');
      if (parts.length >= 2) {
        instrumentName = parts[1];
        console.log(`モデルタイプから楽器名を抽出: ${instrumentName}`);
      }
    }

    // ユーザーIDの取得
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('ユーザーが認証されていません');
      throw new Error('ユーザーが認証されていません');
    }

    const userId = currentUser.uid;
    console.log(`認証ユーザーID: ${userId}`);

    // チャットルームデータを取得（Firestoreからの読み込みが失敗した場合のバックアップデータ）
    let chatRoomData = null;
    try {
      // 新しいデータ構造でチャットルームを取得
      chatRoomData = await getChatRoomById(roomId);
      console.log('チャットルームデータ取得:', {
        status: chatRoomData ? '成功' : '失敗', 
        roomId,
        userId: chatRoomData?.userId,
        title: chatRoomData?.title,
        modelType: chatRoomData?.modelType,
        topic: chatRoomData?.topic,
        messageCount: chatRoomData?.messages?.length || 0,
        path: chatRoomData ? `users/${userId}/chatRooms/${roomId}` : 'パスが不明'
      });
      
      // チャットルームが見つからない場合は、Firestoreに直接作成を試みる
      if (!chatRoomData) {
        console.warn('チャットルームが見つかりません - 新規作成を試みます:', {
          roomId,
          userId,
          path: `users/${userId}/chatRooms/${roomId}`
        });
        
        try {
          // 新しいチャットルームをFirestoreに直接作成
          const userChatRoomsRef = collection(db, `users/${userId}/chatRooms`);
          const newChatRoom = {
            title: '新しいチャット',
            topic: '一般',
            userId: userId,
            modelType: modelType || 'standard',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            messages: [{
              id: `msg_${Date.now()}`,
              content: message,
              sender: 'user',
              timestamp: Timestamp.now(),
            }]
          };
          
          // 新しいドキュメントとして作成
          if (roomId) {
            await setDoc(doc(userChatRoomsRef, roomId), newChatRoom);
            console.log('既存IDでチャットルームを作成しました:', {
              path: `users/${userId}/chatRooms/${roomId}`,
              id: roomId
            });
          } else {
            const docRef = await addDoc(userChatRoomsRef, newChatRoom);
            roomId = docRef.id;
            console.log('新規IDでチャットルームを作成しました:', {
              path: `users/${userId}/chatRooms/${docRef.id}`,
              id: docRef.id
            });
          }
          
          // 作成したチャットルームを再取得
          chatRoomData = await getChatRoomById(roomId);
          console.log('新規作成したチャットルームを取得:', {
            status: chatRoomData ? '成功' : '失敗',
            roomId,
            title: chatRoomData?.title
          });
        } catch (createError) {
          console.error('チャットルーム作成エラー:', createError);
          // 作成に失敗してもメッセージ送信は試みる
        }
      }
    } catch (error) {
      console.warn('チャットルームデータ取得エラー:', error);
      // エラーが発生しても処理を続行
    }

    console.log('Firebase Functions経由でDify APIリクエストを送信します');

    // チャットルームにユーザーメッセージを追加
    const chatRoomRef = doc(db, `users/${userId}/chatRooms/${roomId}`);
    const messagesRef = collection(chatRoomRef, 'messages');
    
    // ユーザーメッセージをFirestoreに保存
    const userMessageRef = await addDoc(messagesRef, {
      content: message,
      sender: 'user',
      createdAt: Timestamp.now()
    });
    
    console.log('ユーザーメッセージを保存しました', {
      messageId: userMessageRef.id
    });

    try {
      // Firebase Functions経由でDify APIを呼び出す
      console.log('Firebase Functions sendChatMessage を呼び出します');
      
      const functionResponse = await sendChatMessageFunc({
        message,
        modelType: modelType || 'standard',
        conversationId,
        roomId,
        inputs: {
          instrument: instrumentName
        }
      });
      
      // レスポンスデータを取得
      const responseData = functionResponse.data as any;
      
      console.log('Firebase Functions応答:', {
        success: responseData.success,
        hasAnswer: !!responseData.answer,
        answerLength: responseData.answer ? responseData.answer.length : 0,
        conversationId: responseData.conversationId || "なし"
      });

      // AIの応答をFirestoreに保存
      const aiMessageRef = await addDoc(messagesRef, {
        content: responseData.answer,
        sender: 'ai',
        createdAt: Timestamp.now(),
        metadata: {
          conversation_id: responseData.conversationId,
          model_type: modelType,
          function_metadata: responseData.metadata
        }
      });
      
      console.log('AIレスポンスを保存しました', {
        messageId: aiMessageRef.id,
        contentPreview: responseData.answer.substring(0, 50) + (responseData.answer.length > 50 ? '...' : '')
      });

      // 最初の会話の場合、チャットルームに会話IDを保存
      if (!conversationId && responseData.conversationId) {
        await updateDoc(chatRoomRef, {
          conversationId: responseData.conversationId
        });
        console.log('チャットルームの会話IDを更新しました', {
          conversationId: responseData.conversationId
        });
      }

      return {
        answer: responseData.answer,
        conversationId: responseData.conversationId,
        success: true
      };
    } catch (error: any) {
      console.error('Firebase Functions呼び出しエラー:', {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });

      // エラーが発生した場合はエラーメッセージをAI応答として保存
      const errorMessage = `申し訳ありません。エラーが発生しました: ${error.message || 'Unknown error'}`;
      
      // AIエラーメッセージをFirestoreに保存
      const aiErrorMessageRef = await addDoc(messagesRef, {
        content: errorMessage,
        sender: 'ai',
        createdAt: Timestamp.now(),
        metadata: {
          is_error: true,
          error_message: error.message,
          error_code: error.code || 'unknown'
        }
      });
      
      console.log('AIエラーメッセージを保存しました', {
        messageId: aiErrorMessageRef.id
      });

      throw error;
    }
  } catch (error: any) {
    console.error('AI処理エラー:', {
      message: error.message,
      details: error.details,
      code: error.code,
      stack: error.stack
    });
    throw error;
  }
}; 