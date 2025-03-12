import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ChatMessage } from './difyService';

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  conversationId?: string;
  messages: ChatMessage[];
  createdAt: Timestamp | any; // serverTimestampの型対応
  updatedAt: Timestamp | any; // serverTimestampの型対応
  userId: string;
}

// チャットルームの作成
export const createChatRoom = async (
  userId: string,
  title: string,
  topic: string,
  initialMessage?: string
): Promise<ChatRoom> => {
  try {
    const initialMessages: ChatMessage[] = initialMessage 
      ? [{ role: 'user', content: initialMessage }] 
      : [];

    const chatRoomData = {
      title,
      topic,
      messages: initialMessages,
      userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'chatRooms'), chatRoomData);
    
    // 現在のタイムスタンプを使用
    const now = Timestamp.now();
    
    return {
      id: docRef.id,
      ...chatRoomData,
      messages: initialMessages,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error('チャットルーム作成中にエラーが発生しました:', error);
    throw new Error('チャットルームの作成に失敗しました。後でもう一度お試しください。');
  }
};

// チャットルームの取得
export const getChatRoom = async (roomId: string): Promise<ChatRoom | null> => {
  try {
    const docRef = doc(db, 'chatRooms', roomId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
      } as ChatRoom;
    }
    return null;
  } catch (error) {
    console.error('チャットルーム取得中にエラーが発生しました:', error);
    throw new Error('チャットルームの取得に失敗しました。後でもう一度お試しください。');
  }
};

// ユーザーのチャットルーム一覧を取得
export const getUserChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    // インデックスが作成されるまでの一時的な回避策として、orderByを削除
    const q = query(
      collection(db, 'chatRooms'),
      where('userId', '==', userId)
      // インデックスが作成されたら以下の行を復活させる
      // orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    // クライアント側でソートする
    const chatRooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ChatRoom));
    
    // updatedAtでソート（降順）
    return chatRooms.sort((a, b) => {
      // Timestampオブジェクトかどうかをチェック
      const aTimestamp = a.updatedAt;
      const bTimestamp = b.updatedAt;
      
      let aTime = 0;
      let bTime = 0;
      
      if (aTimestamp instanceof Timestamp) {
        aTime = aTimestamp.toMillis();
      } else if (aTimestamp && typeof aTimestamp === 'object' && 'seconds' in aTimestamp) {
        aTime = (aTimestamp as any).seconds * 1000;
      }
      
      if (bTimestamp instanceof Timestamp) {
        bTime = bTimestamp.toMillis();
      } else if (bTimestamp && typeof bTimestamp === 'object' && 'seconds' in bTimestamp) {
        bTime = (bTimestamp as any).seconds * 1000;
      }
      
      return bTime - aTime;
    });
  } catch (error) {
    console.error('チャットルーム一覧取得中にエラーが発生しました:', error);
    throw new Error('チャットルーム一覧の取得に失敗しました。後でもう一度お試しください。');
  }
};

// メッセージの追加
export const addMessageToChatRoom = async (
  roomId: string,
  message: ChatMessage,
  conversationId?: string
): Promise<void> => {
  try {
    const docRef = doc(db, 'chatRooms', roomId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('チャットルームが見つかりません');
    }
    
    const data = docSnap.data();
    const messages = [...(data.messages || []), message];
    
    // conversationIdがundefinedの場合は、そのフィールドを更新しない
    const updateData: any = {
      messages,
      updatedAt: serverTimestamp(),
    };
    
    // conversationIdが存在する場合のみ、更新データに含める
    if (conversationId) {
      updateData.conversationId = conversationId;
    }
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error('メッセージ追加中にエラーが発生しました:', error);
    throw new Error('メッセージの追加に失敗しました。後でもう一度お試しください。');
  }
};

// チャットルームの更新
export const updateChatRoom = async (
  roomId: string,
  updates: Partial<Omit<ChatRoom, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const docRef = doc(db, 'chatRooms', roomId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('チャットルーム更新中にエラーが発生しました:', error);
    throw new Error('チャットルームの更新に失敗しました。後でもう一度お試しください。');
  }
};
