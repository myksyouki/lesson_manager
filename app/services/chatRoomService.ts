import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { ChatMessage } from '../types/chatRoom';
import { getFirestore } from 'firebase/firestore';

// 新しいデータ構造を使用するフラグ (trueに変更)
let useNewStructure = true;

// 新しいデータ構造の使用を設定する関数
export const setUseNewStructure = (useNew: boolean): void => {
  useNewStructure = useNew;
};

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  modelType: string; // 追加: モデルタイプ（standard, artist名前など）
  conversationId?: string;
  messages: ChatMessage[];
  createdAt: Timestamp | any; // serverTimestampの型対応
  updatedAt: Timestamp | any; // serverTimestampの型対応
  userId: string;
  instrument?: string;
  initialMessage?: string; // 初期メッセージ（オプショナルに変更）
}

// チャットルーム作成用のデータ型
export interface CreateChatRoomData {
  title: string;
  topic: string;
  initialMessage?: string;
  modelType?: string;
}

// チャットルームの作成
export const createChatRoom = async (
  title: string,
  topic: string,
  initialMessage: string,
  modelType: string = 'standard'
): Promise<ChatRoom> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    console.log('チャットルーム作成開始:', {
      title,
      topic,
      initialMessageLength: initialMessage.length,
      modelType,
      useNewStructure
    });

    // 初期メッセージを作成
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      content: initialMessage,
      sender: 'user',
      timestamp: Timestamp.now(),
    };

    // チャットルームデータを作成
    const newChatRoom: Omit<ChatRoom, 'id'> = {
      title,
      topic,
      userId: currentUser.uid,
      initialMessage,
      modelType,
      messages: [userMessage],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    let docRef;

    // 新しい構造を使用（ユーザーのサブコレクションにチャットルームを作成）
    if (useNewStructure) {
      const userChatRoomsRef = collection(db, `users/${currentUser.uid}/chatRooms`);
      docRef = await addDoc(userChatRoomsRef, newChatRoom);

      console.log('チャットルーム作成完了 (新構造):', {
        path: `users/${currentUser.uid}/chatRooms/${docRef.id}`,
        id: docRef.id,
        title,
        modelType,
      });
    } else {
      // 従来の構造
      const chatRoomsRef = collection(db, 'chatRooms');
      docRef = await addDoc(chatRoomsRef, newChatRoom);

      console.log('チャットルーム作成完了 (従来構造):', {
        path: `chatRooms/${docRef.id}`,
        id: docRef.id,
        title,
        modelType,
      });
    }
    
    // 作成したチャットルームデータを返す
    return {
      id: docRef.id,
      ...newChatRoom,
    };
  } catch (error) {
    console.error('チャットルーム作成エラー:', error);
    throw error;
  }
};

// チャットルームの取得
export const getChatRoom = async (roomId: string): Promise<ChatRoom | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let docRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    } else {
      // 従来の構造を使用する場合
      docRef = doc(db, 'chatRooms', roomId);
    }
    
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
export const getUserChatRooms = async (): Promise<ChatRoom[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let querySnapshot;
    
    if (useNewStructure) {
      // 新構造を使用する場合（ユーザーのサブコレクション）
      const chatRoomsRef = collection(db, `users/${currentUser.uid}/chatRooms`);
      const q = query(chatRoomsRef, orderBy('updatedAt', 'desc'));
      querySnapshot = await getDocs(q);
      
      console.log(`新構造でチャットルーム一覧を取得: ${querySnapshot.size}件`);
    } else {
      // 従来の構造を使用する場合
      const chatRoomsRef = collection(db, 'chatRooms');
      const q = query(
        chatRoomsRef,
        where('userId', '==', currentUser.uid),
        orderBy('updatedAt', 'desc')
      );
      querySnapshot = await getDocs(q);
      
      console.log(`従来構造でチャットルーム一覧を取得: ${querySnapshot.size}件`);
    }

    const chatRooms: ChatRoom[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      chatRooms.push({
        id: doc.id,
        ...data,
      } as ChatRoom);
    });

    return chatRooms;
  } catch (error) {
    console.error('チャットルーム一覧取得エラー:', error);
    throw error;
  }
};

// チャットルームの詳細を取得
export const getChatRoomById = async (id: string): Promise<ChatRoom | null> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let chatRoomRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, id);
      console.log(`新構造でチャットルーム詳細を取得: ${chatRoomRef.path}`);
    } else {
      // 従来の構造を使用する場合
      chatRoomRef = doc(db, 'chatRooms', id);
      console.log(`従来構造でチャットルーム詳細を取得: ${chatRoomRef.path}`);
    }

    const chatRoomDoc = await getDoc(chatRoomRef);

    if (!chatRoomDoc.exists()) {
      console.log(`チャットルームが見つかりません: ${id}`);
      return null;
    }

    const data = chatRoomDoc.data();
    return {
      id: chatRoomDoc.id,
      ...data,
    } as ChatRoom;
  } catch (error) {
    console.error(`チャットルーム(ID: ${id})の取得エラー:`, error);
    throw error;
  }
};

// チャットルームのメッセージを更新
export const updateChatRoomMessages = async (
  roomId: string,
  messages: ChatMessage[]
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let chatRoomRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    } else {
      // 従来の構造を使用する場合
      chatRoomRef = doc(db, 'chatRooms', roomId);
    }

    const chatRoomDoc = await getDoc(chatRoomRef);

    if (!chatRoomDoc.exists()) {
      throw new Error('チャットルームが存在しません');
    }

    const data = chatRoomDoc.data();
    if (data.userId !== currentUser.uid) {
      throw new Error('このチャットルームを編集する権限がありません');
    }

    await updateDoc(chatRoomRef, {
      messages,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('チャットルームメッセージ更新エラー:', error);
    throw error;
  }
};

// チャットルームを削除
export const deleteChatRoom = async (roomId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let chatRoomRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    } else {
      // 従来の構造を使用する場合
      chatRoomRef = doc(db, 'chatRooms', roomId);
    }

    const chatRoomDoc = await getDoc(chatRoomRef);

    if (!chatRoomDoc.exists()) {
      throw new Error('チャットルームが存在しません');
    }

    const data = chatRoomDoc.data();
    if (data.userId !== currentUser.uid) {
      throw new Error('このチャットルームを削除する権限がありません');
    }

    await deleteDoc(chatRoomRef);
  } catch (error) {
    console.error('チャットルーム削除エラー:', error);
    throw error;
  }
};

// メッセージの追加
export const addMessageToChatRoom = async (
  roomId: string,
  message: ChatMessage,
  conversationId?: string
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let docRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    } else {
      // 従来の構造を使用する場合
      docRef = doc(db, 'chatRooms', roomId);
    }
    
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
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    let docRef;
    if (useNewStructure) {
      // 新構造を使用する場合
      docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    } else {
      // 従来の構造を使用する場合
      docRef = doc(db, 'chatRooms', roomId);
    }
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('チャットルーム更新中にエラーが発生しました:', error);
    throw new Error('チャットルームの更新に失敗しました。後でもう一度お試しください。');
  }
};
