import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuthStore } from '../store/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatRoom {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessageText?: string;
  lastMessageDate?: string;
}

export interface ChatMessage {
  id: string;
  chatRoomId: string;
  userId: string;
  text: string;
  isUserMessage: boolean;
  createdAt: string;
}

/**
 * チャットルーム一覧を取得する
 * デモモードの場合はローカルストレージから、それ以外の場合はFirestoreから取得
 */
export const getChatRooms = async (): Promise<ChatRoom[]> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      let chatRooms: ChatRoom[] = [];
      
      if (Platform.OS === 'web') {
        const chatRoomsData = localStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      } else {
        const chatRoomsData = await AsyncStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      }
      
      return chatRooms;
    } catch (error) {
      console.error('デモチャットルームの取得に失敗しました:', error);
      throw new Error('デモチャットルームの取得に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const chatRoomsQuery = query(
      collection(db, 'chatRooms'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(chatRoomsQuery);
    const chatRooms: ChatRoom[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      chatRooms.push({
        id: doc.id,
        userId: data.userId,
        title: data.title,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        lastMessageText: data.lastMessageText,
        lastMessageDate: data.lastMessageDate,
      });
    });
    
    return chatRooms;
  } catch (error) {
    console.error('チャットルームの取得に失敗しました:', error);
    throw new Error('チャットルームの取得に失敗しました');
  }
};

/**
 * チャットルームを作成する
 */
export const createChatRoom = async (title: string): Promise<ChatRoom> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const now = new Date().toISOString();
  const newChatRoom: Omit<ChatRoom, 'id'> = {
    userId: user.uid,
    title,
    createdAt: now,
    updatedAt: now,
  };
  
  // デモモードの場合
  if (isDemo) {
    try {
      let chatRooms: ChatRoom[] = [];
      
      if (Platform.OS === 'web') {
        const chatRoomsData = localStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      } else {
        const chatRoomsData = await AsyncStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      }
      
      const createdChatRoom: ChatRoom = {
        ...newChatRoom,
        id: `demo-chat-room-${Date.now()}`,
      };
      
      chatRooms.push(createdChatRoom);
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
      } else {
        await AsyncStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
      }
      
      return createdChatRoom;
    } catch (error) {
      console.error('デモチャットルームの作成に失敗しました:', error);
      throw new Error('デモチャットルームの作成に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const docRef = await addDoc(collection(db, 'chatRooms'), newChatRoom);
    
    return {
      ...newChatRoom,
      id: docRef.id,
    };
  } catch (error) {
    console.error('チャットルームの作成に失敗しました:', error);
    throw new Error('チャットルームの作成に失敗しました');
  }
};

/**
 * チャットメッセージを取得する
 */
export const getChatMessages = async (chatRoomId: string): Promise<ChatMessage[]> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  // デモモードの場合
  if (isDemo) {
    try {
      let chatMessages: ChatMessage[] = [];
      
      if (Platform.OS === 'web') {
        const chatMessagesData = localStorage.getItem('demoChatMessages');
        if (chatMessagesData) {
          chatMessages = JSON.parse(chatMessagesData);
        }
      } else {
        const chatMessagesData = await AsyncStorage.getItem('demoChatMessages');
        if (chatMessagesData) {
          chatMessages = JSON.parse(chatMessagesData);
        }
      }
      
      return chatMessages.filter(message => message.chatRoomId === chatRoomId);
    } catch (error) {
      console.error('デモチャットメッセージの取得に失敗しました:', error);
      throw new Error('デモチャットメッセージの取得に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    const messagesQuery = query(
      collection(db, 'chatMessages'),
      where('chatRoomId', '==', chatRoomId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(messagesQuery);
    const messages: ChatMessage[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        chatRoomId: data.chatRoomId,
        userId: data.userId,
        text: data.text,
        isUserMessage: data.isUserMessage,
        createdAt: data.createdAt,
      });
    });
    
    return messages;
  } catch (error) {
    console.error('チャットメッセージの取得に失敗しました:', error);
    throw new Error('チャットメッセージの取得に失敗しました');
  }
};

/**
 * ユーザーのチャットメッセージを送信する
 */
export const sendUserMessage = async (chatRoomId: string, text: string): Promise<ChatMessage> => {
  const { user, isDemo } = useAuthStore.getState();
  
  if (!user) {
    throw new Error('ユーザーが認証されていません');
  }
  
  const now = new Date().toISOString();
  const newMessage: Omit<ChatMessage, 'id'> = {
    chatRoomId,
    userId: user.uid,
    text,
    isUserMessage: true,
    createdAt: now,
  };
  
  // デモモードの場合
  if (isDemo) {
    try {
      let chatMessages: ChatMessage[] = [];
      let chatRooms: ChatRoom[] = [];
      
      if (Platform.OS === 'web') {
        const chatMessagesData = localStorage.getItem('demoChatMessages');
        if (chatMessagesData) {
          chatMessages = JSON.parse(chatMessagesData);
        }
        
        const chatRoomsData = localStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      } else {
        const chatMessagesData = await AsyncStorage.getItem('demoChatMessages');
        if (chatMessagesData) {
          chatMessages = JSON.parse(chatMessagesData);
        }
        
        const chatRoomsData = await AsyncStorage.getItem('demoChatRooms');
        if (chatRoomsData) {
          chatRooms = JSON.parse(chatRoomsData);
        }
      }
      
      const sentMessage: ChatMessage = {
        ...newMessage,
        id: `demo-message-${Date.now()}`,
      };
      
      chatMessages.push(sentMessage);
      
      // チャットルームの最新メッセージを更新
      const roomIndex = chatRooms.findIndex(room => room.id === chatRoomId);
      if (roomIndex !== -1) {
        chatRooms[roomIndex] = {
          ...chatRooms[roomIndex],
          lastMessageText: text,
          lastMessageDate: now,
          updatedAt: now,
        };
      }
      
      if (Platform.OS === 'web') {
        localStorage.setItem('demoChatMessages', JSON.stringify(chatMessages));
        localStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
      } else {
        await AsyncStorage.setItem('demoChatMessages', JSON.stringify(chatMessages));
        await AsyncStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
      }
      
      // AIの自動応答を追加
      setTimeout(() => {
        sendAIResponse(chatRoomId, text);
      }, 1000);
      
      return sentMessage;
    } catch (error) {
      console.error('デモチャットメッセージの送信に失敗しました:', error);
      throw new Error('デモチャットメッセージの送信に失敗しました');
    }
  }
  
  // 通常モードの場合
  try {
    // メッセージを追加
    const messageRef = await addDoc(collection(db, 'chatMessages'), newMessage);
    
    // チャットルームの最新メッセージを更新
    const chatRoomRef = doc(db, 'chatRooms', chatRoomId);
    await updateDoc(chatRoomRef, {
      lastMessageText: text,
      lastMessageDate: now,
      updatedAt: now,
    });
    
    return {
      ...newMessage,
      id: messageRef.id,
    };
  } catch (error) {
    console.error('チャットメッセージの送信に失敗しました:', error);
    throw new Error('チャットメッセージの送信に失敗しました');
  }
};

/**
 * デモモード用のAIレスポンス生成（シンプルな自動応答）
 */
const sendAIResponse = async (chatRoomId: string, userMessage: string): Promise<void> => {
  const { user } = useAuthStore.getState();
  
  if (!user) return;
  
  // シンプルな応答パターン
  let aiResponse = 'すみません、その質問にはお答えできません。';
  
  if (userMessage.includes('練習方法') || userMessage.includes('練習するには')) {
    aiResponse = '効果的な練習方法としては、短時間で集中して練習することをお勧めします。毎日20-30分の集中した練習は、週に1回の長時間練習よりも効果的です。また、メトロノームを使用してテンポを安定させることも重要です。';
  } else if (userMessage.includes('初心者') || userMessage.includes('始めたい')) {
    aiResponse = '初心者の方には、基礎的な技術を身につけるための簡単な曲から始めることをお勧めします。例えば、ピアノであればバッハの「アンナ・マグダレーナのための小曲集」や「ブルグミュラー25の練習曲」などが適しています。';
  } else if (userMessage.includes('時間') || userMessage.includes('効率')) {
    aiResponse = '練習時間を効率的に使うには、明確な目標を設定し、セクションごとに分けて練習するのが効果的です。また、録音して自分の演奏を客観的に聴くことも上達の近道です。';
  } else if (userMessage.includes('テクニック') || userMessage.includes('技術')) {
    aiResponse = 'テクニックを向上させるには、スケールやアルペジオなどの基礎練習を日々続けることが重要です。また、難しいパッセージは遅いテンポから始めて、少しずつ速度を上げていくとよいでしょう。';
  } else if (userMessage.includes('モチベーション') || userMessage.includes('続ける')) {
    aiResponse = 'モチベーションを維持するためには、自分が本当に演奏したい曲を練習レパートリーに含めることが大切です。また、小さな目標を達成していくことで、上達を実感できるようにしましょう。';
  }
  
  const now = new Date().toISOString();
  const aiMessage: Omit<ChatMessage, 'id'> = {
    chatRoomId,
    userId: user.uid,
    text: aiResponse,
    isUserMessage: false,
    createdAt: now,
  };
  
  try {
    let chatMessages: ChatMessage[] = [];
    let chatRooms: ChatRoom[] = [];
    
    if (Platform.OS === 'web') {
      const chatMessagesData = localStorage.getItem('demoChatMessages');
      if (chatMessagesData) {
        chatMessages = JSON.parse(chatMessagesData);
      }
      
      const chatRoomsData = localStorage.getItem('demoChatRooms');
      if (chatRoomsData) {
        chatRooms = JSON.parse(chatRoomsData);
      }
    } else {
      const chatMessagesData = await AsyncStorage.getItem('demoChatMessages');
      if (chatMessagesData) {
        chatMessages = JSON.parse(chatMessagesData);
      }
      
      const chatRoomsData = await AsyncStorage.getItem('demoChatRooms');
      if (chatRoomsData) {
        chatRooms = JSON.parse(chatRoomsData);
      }
    }
    
    const sentMessage: ChatMessage = {
      ...aiMessage,
      id: `demo-message-ai-${Date.now()}`,
    };
    
    chatMessages.push(sentMessage);
    
    // チャットルームの最新メッセージを更新
    const roomIndex = chatRooms.findIndex(room => room.id === chatRoomId);
    if (roomIndex !== -1) {
      chatRooms[roomIndex] = {
        ...chatRooms[roomIndex],
        lastMessageText: aiResponse,
        lastMessageDate: now,
        updatedAt: now,
      };
    }
    
    if (Platform.OS === 'web') {
      localStorage.setItem('demoChatMessages', JSON.stringify(chatMessages));
      localStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
    } else {
      await AsyncStorage.setItem('demoChatMessages', JSON.stringify(chatMessages));
      await AsyncStorage.setItem('demoChatRooms', JSON.stringify(chatRooms));
    }
  } catch (error) {
    console.error('AIレスポンスの送信に失敗しました:', error);
  }
}; 