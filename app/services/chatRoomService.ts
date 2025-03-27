import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { ChatMessage } from '../types/chatRoom';
import { getFirestore } from 'firebase/firestore';

// 新しいデータ構造を使用するかどうかのフラグ
let useNewStructure = true;

// 新しいデータ構造の使用を設定する関数
export const setUseNewStructure = (useNew: boolean): void => {
  useNewStructure = useNew;
  console.log(`チャットルームサービス: 新しい構造の使用を${useNew ? '有効' : '無効'}にしました`);
};

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  modelType: string; // モデルタイプ（standard, artist名前など）
  conversationId?: string;
  messages: ChatMessage[];
  createdAt: Timestamp | any; // serverTimestampの型対応
  updatedAt: Timestamp | any; // serverTimestampの型対応
  userId: string;
  instrument?: string;
  initialMessage?: string; // 初期メッセージ（オプショナル）
  isDeleted?: boolean; // 削除済みフラグ
  deletedAt?: Timestamp | any; // 削除日時
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
      modelType
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

    // ユーザーのchatRoomsサブコレクションにドキュメントを追加
    const userChatRoomsRef = collection(db, `users/${currentUser.uid}/chatRooms`);
    const docRef = await addDoc(userChatRoomsRef, newChatRoom);

    console.log('チャットルーム作成完了:', {
      path: `users/${currentUser.uid}/chatRooms/${docRef.id}`,
      id: docRef.id,
      title,
      modelType,
    });
    
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

    // ユーザーのchatRoomsサブコレクションからドキュメントを取得
    const docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
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
    console.log('📋 ChatRoomService: getUserChatRooms開始', userId);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ ChatRoomService: 認証済みユーザーがいません');
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのchatRoomsサブコレクションからドキュメントを取得
    const chatRoomsRef = collection(db, `users/${userId}/chatRooms`);
    console.log('🔍 ChatRoomService: コレクションパス', `users/${userId}/chatRooms`);
    
    const q = query(
      chatRoomsRef,
      orderBy('updatedAt', 'desc')
    );
    
    try {
      const querySnapshot = await getDocs(q);
      console.log(`✅ ChatRoomService: クエリ実行完了 ${querySnapshot.size}件`);

      const chatRooms: ChatRoom[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Timestampオブジェクトの処理
        const processedData = {
          ...data,
          createdAt: data.createdAt || { seconds: 0, nanoseconds: 0 },
          updatedAt: data.updatedAt || { seconds: 0, nanoseconds: 0 },
        };
        
        // 削除されていないチャットルームのみを追加
        if (!data.isDeleted) {
          chatRooms.push({
            id: doc.id,
            ...processedData,
          } as ChatRoom);
        }
      });

      console.log(`📊 ChatRoomService: 削除済みを除外後のチャットルーム数: ${chatRooms.length}件`);
      
      // 空の配列ではない場合、最初のチャットルームの内容をログに出力して確認
      if (chatRooms.length > 0) {
        console.log('📝 ChatRoomService: 最初のチャットルーム例:', JSON.stringify({
          id: chatRooms[0].id,
          title: chatRooms[0].title,
          topic: chatRooms[0].topic,
          updatedAt: chatRooms[0].updatedAt
        }, null, 2));
      } else {
        console.log('⚠️ ChatRoomService: チャットルームが見つかりませんでした');
        
        // デバッグ: コレクション内のすべてのドキュメントを表示
        if (querySnapshot.size > 0) {
          console.log('🔎 ChatRoomService: コレクション内のすべてのドキュメント:');
          querySnapshot.forEach((doc) => {
            const rawData = doc.data();
            console.log(`  - ID: ${doc.id}, isDeleted: ${rawData.isDeleted}, title: ${rawData.title}`);
          });
        }
      }
      
      return chatRooms;
    } catch (queryError) {
      console.error('❌ ChatRoomService: クエリ実行エラー:', queryError);
      throw queryError;
    }
  } catch (error) {
    console.error('❌ ChatRoomService: チャットルーム一覧取得エラー:', error);
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

    // ユーザーのchatRoomsサブコレクションからドキュメントを取得
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, id);
    console.log(`チャットルーム詳細を取得: ${chatRoomRef.path}`);

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

    // ユーザーのchatRoomsサブコレクションのドキュメントを更新
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    await updateDoc(chatRoomRef, {
      messages: messages,
      updatedAt: Timestamp.now(),
    });

    console.log(`チャットルームのメッセージを更新しました: ${chatRoomRef.path}`);
  } catch (error) {
    console.error('チャットルームのメッセージ更新エラー:', error);
    throw error;
  }
};

// チャットルームの削除（論理削除）
export const deleteChatRoom = async (roomId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのchatRoomsサブコレクションのドキュメントを論理削除
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    await updateDoc(chatRoomRef, {
      isDeleted: true,
      deletedAt: Timestamp.now(),
    });

    console.log(`チャットルームを論理削除しました: ${chatRoomRef.path}`);
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

    // ユーザーのchatRoomsサブコレクションのドキュメントを取得
    const docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    
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

    // ユーザーのchatRoomsサブコレクションのドキュメントを更新
    const docRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('チャットルーム更新中にエラーが発生しました:', error);
    throw new Error('チャットルームの更新に失敗しました。後でもう一度お試しください。');
  }
};

// 削除されたチャットルーム一覧を取得
export const getDeletedChatRooms = async (userId: string): Promise<ChatRoom[]> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのchatRoomsサブコレクションから削除済みドキュメントを取得
    const chatRoomsRef = collection(db, `users/${userId}/chatRooms`);
    const q = query(
      chatRoomsRef, 
      where('isDeleted', '==', true),
      orderBy('deletedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    console.log(`削除済みチャットルーム一覧を取得: ${querySnapshot.size}件`);

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
    console.error('削除済みチャットルーム一覧取得エラー:', error);
    throw error;
  }
};

// チャットルームを復元
export const restoreChatRoom = async (roomId: string): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのchatRoomsサブコレクションのドキュメントを復元
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    await updateDoc(chatRoomRef, {
      isDeleted: false,
      deletedAt: null,
    });
    
    console.log(`チャットルームを復元しました: ${chatRoomRef.path}`);
  } catch (error) {
    console.error('チャットルーム復元エラー:', error);
    throw error;
  }
};
