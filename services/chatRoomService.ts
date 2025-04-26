import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, serverTimestamp, Timestamp, orderBy, deleteDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { getFirestore } from 'firebase/firestore';
import { isDemoMode, getDemoChatRooms, createDemoChatRoom, addDemoChatMessage, startDemoAIConversation } from './demoModeService';

// メッセージの型定義
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'system';
  timestamp: Timestamp;
}

// チャットルームあたりの最大メッセージ数
export const MAX_MESSAGES_PER_CHAT_ROOM = 100; // 一つのチャットルームあたり最大100メッセージまで

// 警告表示するメッセージ数の閾値
export const WARNING_MESSAGE_THRESHOLD = 90; // 90メッセージを超えたら警告を表示

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

// ユーザーのアクティブなチャットルーム数を取得する関数
export const getUserActiveChatRoomsCount = async (userId: string): Promise<number> => {
  try {
    // デモモードの場合
    if (isDemoMode()) {
      const demoChatRooms = await getDemoChatRooms();
      const activeRooms = demoChatRooms.filter((room: any) => !room.isDeleted);
      return activeRooms.length;
    }

    // 通常モードの場合
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    // ユーザーのchatRoomsサブコレクションから非削除のドキュメント数を取得
    const chatRoomsRef = collection(db, `users/${userId}/chatRooms`);
    const q = query(
      chatRoomsRef, 
      where('isDeleted', '==', false)
    );
    const querySnapshot = await getDocs(q);
    
    console.log(`アクティブなチャットルーム数: ${querySnapshot.size}件`);
    return querySnapshot.size;
  } catch (error) {
    console.error('アクティブなチャットルーム数取得エラー:', error);
    throw error;
  }
};

// チャットルームの作成前に数の確認を行う
export const createChatRoom = async (
  title: string,
  topic: string,
  initialMessage: string,
  modelType: string = 'standard'
): Promise<ChatRoom> => {
  try {
    // デモモードの場合
    if (isDemoMode()) {
      console.log('デモモードでチャットルームを作成します:', {
        title,
        topic,
        initialMessageLength: initialMessage.length,
        modelType
      });

      // デモユーザーの情報を取得
      const demoUser = {
        uid: 'demo-user',
        email: 'demo@example.com',
        displayName: 'デモユーザー',
      };

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
        userId: demoUser.uid,
        initialMessage,
        modelType,
        messages: [userMessage],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isDeleted: false, // 初期値を明示的に設定
      };

      // デモモード用のチャットルーム作成関数を呼び出し
      const roomId = await createDemoChatRoom(newChatRoom);
      
      // AIの応答を生成
      const aiResponse = await startDemoAIConversation(initialMessage);
      
      // AIメッセージを作成
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse.content,
        sender: 'ai',
        timestamp: Timestamp.now(),
      };
      
      // AIメッセージをチャットルームに追加
      await addDemoChatMessage(roomId, aiMessage);
      
      // 作成したチャットルームデータを返す
      return {
        id: roomId,
        ...newChatRoom,
        messages: [userMessage, aiMessage]
      };
    }

    // 通常モードの場合
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーが認証されていません');
    }

    // アクティブなチャットルーム数を取得
    const activeRoomsCount = await getUserActiveChatRoomsCount(currentUser.uid);
    
    // チャットルーム数が10以上ならエラー
    if (activeRoomsCount >= 10) {
      throw new Error('チャットルームは最大10つまでしか作成できません。既存のチャットルームを削除してください。');
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
      isDeleted: false, // 初期値を明示的に設定
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
    // デモモードの場合
    if (isDemoMode()) {
      const chatRooms = await getDemoChatRooms();
      const room = chatRooms.find((room: any) => room.id === roomId);
      return room || null;
    }

    // 通常モードの場合
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
  // デモモードの場合
  if (isDemoMode()) {
    console.log('デモモードでチャットルーム一覧を取得します');
    const chatRooms = await getDemoChatRooms();
    const activeRooms = chatRooms.filter((room: any) => !room.isDeleted);
    return activeRooms;
  }

  // 通常モードの場合は既存の処理
  let retryCount = 0;
  const maxRetries = 3;
  const retryDelay = 2000; // 2秒

  const tryGetChatRooms = async (): Promise<ChatRoom[]> => {
    try {
      console.log('📋 ChatRoomService: getUserChatRooms開始', userId);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.log(`❌ ChatRoomService: 認証済みユーザーがいません。リトライ: ${retryCount + 1}/${maxRetries}`);
        
        if (retryCount < maxRetries) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return tryGetChatRooms();
        }
        
        throw new Error('ユーザーが認証されていません。再ログインしてください。');
      }

      // ユーザーID一致確認 (セキュリティチェック)
      if (userId !== currentUser.uid) {
        console.error(`❌ ChatRoomService: ユーザーIDの不一致: 要求=${userId}, 現在=${currentUser.uid}`);
        throw new Error('要求されたユーザーIDと認証されたユーザーIDが一致しません');
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
        }
        
        return chatRooms;
      } catch (queryError) {
        console.error('❌ ChatRoomService: クエリエラー', queryError);
        throw queryError;
      }
    } catch (error) {
      console.error('❌ ChatRoomService: getUserChatRoomsエラー', error);
      throw error;
    }
  };

  return tryGetChatRooms();
};

// チャットルームの詳細を取得
export const getChatRoomById = async (id: string): Promise<ChatRoom | null> => {
  try {
    if (!id || id.trim() === '') {
      console.error('無効なチャットルームID:', id);
      return null;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('ユーザーが認証されていません');
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
    console.log(`チャットルームデータ取得成功: ${id}, title: ${data.title}`);
    
    return {
      id: chatRoomDoc.id,
      ...data,
    } as ChatRoom;
  } catch (error) {
    console.error(`チャットルーム(ID: ${id})の取得エラー:`, error);
    throw error;
  }
};

/**
 * チャットルームのメッセージを更新する
 * @param roomId チャットルームID
 * @param messages メッセージ配列
 * @param conversationId 会話ID（オプション）
 * @param modelType モデルタイプ（オプション）
 */
export const updateChatRoomMessages = async (
  roomId: string, 
  messages: ChatMessage[], 
  conversationId?: string,
  modelType?: string
): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('ユーザーがログインしていません');
    }
    
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    
    // 更新データを作成
    const updateData: any = {
      messages,
      updatedAt: serverTimestamp()
    };
    
    // conversationIdが存在する場合のみ、更新データに含める
    if (conversationId) {
      updateData.conversationId = conversationId;
    }
    
    // modelTypeが存在する場合のみ、更新データに含める
    if (modelType) {
      updateData.modelType = modelType;
    }
    
    await updateDoc(chatRoomRef, updateData);
    
  } catch (error) {
    console.error('メッセージ更新エラー:', error);
    throw new Error('メッセージの更新に失敗しました');
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
    let messages = [...(data.messages || []), message];
    
    // メッセージ数が上限を超える場合、古いメッセージを削除
    if (messages.length > MAX_MESSAGES_PER_CHAT_ROOM) {
      console.log(`メッセージ数が上限(${MAX_MESSAGES_PER_CHAT_ROOM})を超えました。古いメッセージを削除します。`);
      const excessCount = messages.length - MAX_MESSAGES_PER_CHAT_ROOM;
      messages = messages.slice(excessCount); // 古いメッセージを削除
    }
    
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

// チャットルームを更新する
export const updateChatRoom = async (roomId: string, data: Partial<ChatRoom>): Promise<void> => {
  try {
    console.log(`チャットルーム情報更新開始 (roomId: ${roomId})`, data);
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('認証エラー: ユーザーがログインしていません');
    
    // パスを修正 - ユーザーのサブコレクションを使用
    const chatRoomRef = doc(db, `users/${currentUser.uid}/chatRooms`, roomId);
    
    // updatedAtを追加
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(chatRoomRef, updateData);
    console.log(`チャットルーム情報更新完了 (roomId: ${roomId})`);
  } catch (error) {
    console.error('チャットルーム更新エラー:', error);
    throw error;
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
