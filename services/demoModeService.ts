import { getLocalStorageItem, setLocalStorageItem, removeLocalStorageItem } from '../utils/_storage';
import { useAuthStore } from '../store/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Lesson, PracticeMenu, ChatRoom, Chat } from '../store/demoData';
import { getDefaultDemoData } from '../store/demoData';
import { Timestamp } from 'firebase/firestore';

// ChatMessageインターフェースをChatインターフェースに基づいて再定義
export interface ChatMessage {
  id: string;
  roomId: string;
  content: string; // Chatの'text'に相当
  isUser: boolean;
  timestamp: Date | string; // Chatの'createdAt'に相当
  [key: string]: any;
}

// モックAI会話データ
const mockAIConversation = [
  { role: 'user', content: '効果的な練習方法を教えてください' },
  { role: 'assistant', content: '効果的な練習のためには、集中力を高め、小さな目標を設定し、定期的に休憩を取ることが重要です。' },
  { role: 'user', content: '初心者向けの曲のおすすめは？' },
  { role: 'assistant', content: '初心者の方には、バッハのミニュエトやブルグミュラーの「25の練習曲」から始めることをおすすめします。' },
  { role: 'user', content: '練習時間の管理方法は？' },
  { role: 'assistant', content: '練習時間を効率的に使うには、短いセッションに分けて、具体的な目標を持って取り組むことが効果的です。' }
];

// デモモードのLocalStorageキー
const DEMO_LESSONS_KEY = 'demo_lessons';
const DEMO_PRACTICE_MENUS_KEY = 'demo_practice_menus';
const DEMO_CHAT_ROOMS_KEY = 'demo_chat_rooms';
const DEMO_CHAT_MESSAGES_KEY = 'demo_chat_messages';

/**
 * デモモードかどうかをチェックする
 * @returns {boolean} デモモードかどうか
 */
export const isDemoMode = (): boolean => {
  const { user, isAuthenticated } = useAuthStore.getState();
  return isAuthenticated && user?.email === 'demo@example.com';
};

/**
 * デモモードのレッスンデータを取得する
 * @returns {Promise<Lesson[]>} レッスンデータ
 */
export const getDemoLessons = async (): Promise<Lesson[]> => {
  try {
    if (Platform.OS === 'web') {
      // Webの場合はローカルストレージから取得
      const storedLessons = await getLocalStorageItem(DEMO_LESSONS_KEY);
      if (storedLessons) {
        return storedLessons;
      }
    } else {
      // モバイルの場合もAsyncStorageから取得
      const storedLessons = await getLocalStorageItem(DEMO_LESSONS_KEY);
      if (storedLessons) {
        return storedLessons;
      }
    }
    
    // デフォルトデータを返す
    const defaultData = getDefaultDemoData();
    return defaultData.lessons.map(lesson => ({
      ...lesson,
      date: lesson.date instanceof Timestamp ? 
        new Date(lesson.date.toMillis()) : 
        new Date(lesson.date as any)
    }));
  } catch (error) {
    console.error('デモレッスンデータの取得に失敗しました:', error);
    return [];
  }
};

/**
 * デモモードの練習メニューデータを取得する
 * @returns {Promise<PracticeMenu[]>} 練習メニューデータ
 */
export const getDemoPracticeMenus = async (): Promise<PracticeMenu[]> => {
  try {
    if (Platform.OS === 'web') {
      // Webの場合はローカルストレージから取得
      const storedMenus = await getLocalStorageItem(DEMO_PRACTICE_MENUS_KEY);
      if (storedMenus) {
        return storedMenus;
      }
    } else {
      // モバイルの場合もAsyncStorageから取得
      const storedMenus = await getLocalStorageItem(DEMO_PRACTICE_MENUS_KEY);
      if (storedMenus) {
        return storedMenus;
      }
    }
    
    // デフォルトデータを返す
    const defaultData = getDefaultDemoData();
    return defaultData.practiceMenus;
  } catch (error) {
    console.error('デモ練習メニューデータの取得に失敗しました:', error);
    return [];
  }
};

/**
 * デモモードのチャットルームデータを取得する
 * @returns {Promise<ChatRoom[]>} チャットルームデータ
 */
export const getDemoChatRooms = async (): Promise<ChatRoom[]> => {
  try {
    if (Platform.OS === 'web') {
      // Webの場合はローカルストレージから取得
      const storedRooms = await getLocalStorageItem(DEMO_CHAT_ROOMS_KEY);
      if (storedRooms) {
        return storedRooms;
      }
    } else {
      // モバイルの場合もAsyncStorageから取得
      const storedRooms = await getLocalStorageItem(DEMO_CHAT_ROOMS_KEY);
      if (storedRooms) {
        return storedRooms;
      }
    }
    
    // デフォルトデータを返す
    const defaultData = getDefaultDemoData();
    return defaultData.chatRooms.map(room => ({
      ...room,
      lastMessageTime: room.lastMessageTime instanceof Timestamp ? 
        new Date(room.lastMessageTime.toMillis()) : 
        new Date(room.lastMessageTime as any)
    }));
  } catch (error) {
    console.error('デモチャットルームデータの取得に失敗しました:', error);
    return [];
  }
};

/**
 * デモモードのチャットメッセージデータを取得する
 * @returns {Promise<ChatMessage[]>} チャットメッセージデータ
 */
export const getDemoChatMessages = async (): Promise<ChatMessage[]> => {
  try {
    if (Platform.OS === 'web') {
      // Webの場合はローカルストレージから取得
      const storedMessages = await getLocalStorageItem(DEMO_CHAT_MESSAGES_KEY);
      if (storedMessages) {
        return storedMessages;
      }
    } else {
      // モバイルの場合もAsyncStorageから取得
      const storedMessages = await getLocalStorageItem(DEMO_CHAT_MESSAGES_KEY);
      if (storedMessages) {
        return storedMessages;
      }
    }
    
    // デフォルトデータを返し、ChatをChatMessageに変換
    const defaultData = getDefaultDemoData();
    return defaultData.chatMessages.map(chat => ({
      id: chat.id,
      roomId: chat.roomId,
      content: chat.text, // Chatの'text'をChatMessageの'content'に変換
      isUser: chat.isUser,
      timestamp: chat.createdAt instanceof Timestamp ? 
        new Date(chat.createdAt.toMillis()) : 
        new Date(chat.createdAt as any)
    }));
  } catch (error) {
    console.error('デモチャットメッセージデータの取得に失敗しました:', error);
    return [];
  }
};

/**
 * AIとの新しい会話を開始する（デモモード）
 * @param message ユーザーメッセージ
 * @returns 応答メッセージ
 */
export const startDemoAIConversation = async (message: string) => {
  try {
    // デモモードではAI応答をランダムに返す
    const randomIndex = Math.floor(Math.random() * mockAIConversation.length / 2);
    const mockResponse = mockAIConversation[randomIndex * 2 + 1].content;
    
    // 適当な遅延を入れてAI応答の感覚を再現
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      role: 'assistant',
      content: mockResponse,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('デモAI会話の開始に失敗:', error);
    return {
      role: 'assistant',
      content: 'すみません、応答の生成に問題が発生しました。もう一度お試しください。',
      timestamp: new Date()
    };
  }
};

/**
 * デモモードで新しいチャットメッセージを追加する
 * @param roomId チャットルームID
 * @param message 追加するメッセージ
 */
export const addDemoChatMessage = async (roomId: string, message: any) => {
  try {
    const chatRooms = await getLocalStorageItem(DEMO_CHAT_ROOMS_KEY) || [];
    
    const updatedRooms = chatRooms.map((room: ChatRoom & {messages?: any[]}) => {
      if (room.id === roomId) {
        return {
          ...room,
          messages: [...(room.messages || []), message],
          lastMessage: message.content,
          lastMessageTime: message.timestamp
        };
      }
      return room;
    });
    
    await setLocalStorageItem(DEMO_CHAT_ROOMS_KEY, updatedRooms);
  } catch (error) {
    console.error('デモチャットメッセージの追加に失敗:', error);
  }
};

/**
 * デモモードで新しいチャットルームを作成する
 * @param room 作成するチャットルーム情報
 * @returns 作成したルームのID
 */
export const createDemoChatRoom = async (room: any) => {
  try {
    const chatRooms = await getLocalStorageItem(DEMO_CHAT_ROOMS_KEY) || [];
    const newRoom = {
      ...room,
      id: 'demo-room-' + Date.now(),
      messages: [],
      lastMessage: '',
      lastMessageTime: new Date()
    };
    
    const updatedRooms = [...chatRooms, newRoom];
    await setLocalStorageItem(DEMO_CHAT_ROOMS_KEY, updatedRooms);
    
    return newRoom.id;
  } catch (error) {
    console.error('デモチャットルームの作成に失敗:', error);
    return null;
  }
};

/**
 * デモモードのデータを操作するためのサービス
 */
class DemoModeService {
  /**
   * デモモードのレッスン一覧を取得する
   * @returns {Promise<Lesson[]>} レッスン一覧
   */
  async getLessons(): Promise<Lesson[]> {
    try {
      console.log('デモモードサービス: レッスン一覧を取得中...');
      const lessonsJson = await getLocalStorageItem(DEMO_LESSONS_KEY);
      console.log('デモモードサービス: ローカルストレージからの取得結果:', lessonsJson ? '成功' : '未設定');
      
      if (!lessonsJson) {
        // デフォルトデータをロード
        console.log('デモモードサービス: デフォルトデータを使用します');
        const defaultData = getDefaultDemoData();
        console.log(`デモモードサービス: デフォルトレッスン数 = ${defaultData.lessons.length}`);
        
        // デフォルトデータをDEMO_LESSONS_KEYに保存
        await this.saveLessons(defaultData.lessons);
        console.log('デモモードサービス: デフォルトデータを保存しました');
        
        return defaultData.lessons;
      }
      
      if (Array.isArray(lessonsJson) && lessonsJson.length > 0) {
        console.log(`デモモードサービス: ${lessonsJson.length}件のレッスンを取得しました`);
        return lessonsJson;
      } else {
        console.log('デモモードサービス: 有効なレッスンデータが取得できませんでした。デフォルトデータを使用します。');
        const defaultData = getDefaultDemoData();
        await this.saveLessons(defaultData.lessons);
        return defaultData.lessons;
      }
    } catch (error) {
      console.error('デモレッスンデータの取得に失敗しました:', error);
      console.log('デモモードサービス: エラー発生によりデフォルトデータを使用します');
      
      try {
        // エラー発生時はデフォルトデータを使用
        const defaultData = getDefaultDemoData();
        return defaultData.lessons;
      } catch (innerError) {
        console.error('デフォルトデータの取得にも失敗しました:', innerError);
        return [];
      }
    }
  }

  /**
   * レッスンデータをローカルストレージに保存
   * @param lessons 保存するレッスンの配列
   */
  async saveLessons(lessons: Lesson[]): Promise<void> {
    try {
      await setLocalStorageItem(DEMO_LESSONS_KEY, lessons);
    } catch (error) {
      console.error('デモレッスンデータの保存に失敗しました:', error);
    }
  }

  /**
   * 特定のレッスンをIDで取得
   * @param lessonId レッスンID
   * @returns Promise<Lesson | null> 該当するレッスンまたはnull
   */
  async getLessonById(lessonId: string): Promise<Lesson | null> {
    try {
      const lessons = await this.getLessons();
      return lessons.find(lesson => lesson.id === lessonId) || null;
    } catch (error) {
      console.error(`ID: ${lessonId} のレッスン取得に失敗しました:`, error);
      return null;
    }
  }

  /**
   * レッスンをお気に入りに設定/解除
   * @param lessonId レッスンID
   * @param isFavorite お気に入り状態
   */
  async toggleFavorite(lessonId: string, isFavorite: boolean): Promise<void> {
    try {
      const lessons = await this.getLessons();
      const updatedLessons = lessons.map(lesson => 
        lesson.id === lessonId ? { ...lesson, isFavorite } : lesson
      );
      await this.saveLessons(updatedLessons);
    } catch (error) {
      console.error(`レッスン ${lessonId} のお気に入り設定に失敗しました:`, error);
    }
  }

  /**
   * 練習メニューをローカルストレージから取得
   * @returns Promise<PracticeMenu[]> 練習メニューの配列
   */
  async getPracticeMenus(): Promise<PracticeMenu[]> {
    try {
      const menusJson = await getLocalStorageItem(DEMO_PRACTICE_MENUS_KEY);
      if (!menusJson) {
        // デフォルトデータをロード
        const defaultData = getDefaultDemoData();
        await this.savePracticeMenus(defaultData.practiceMenus);
        return defaultData.practiceMenus;
      }
      
      return menusJson;
    } catch (error) {
      console.error('デモ練習メニューデータの取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * 練習メニューデータをローカルストレージに保存
   * @param menus 保存する練習メニューの配列
   */
  async savePracticeMenus(menus: PracticeMenu[]): Promise<void> {
    try {
      await setLocalStorageItem(DEMO_PRACTICE_MENUS_KEY, menus);
    } catch (error) {
      console.error('デモ練習メニューデータの保存に失敗しました:', error);
    }
  }

  /**
   * 特定の練習メニューをIDで取得
   * @param menuId 練習メニューID
   * @returns Promise<PracticeMenu | null> 該当する練習メニューまたはnull
   */
  async getPracticeMenuById(menuId: string): Promise<PracticeMenu | null> {
    try {
      const menus = await this.getPracticeMenus();
      return menus.find(menu => menu.id === menuId) || null;
    } catch (error) {
      console.error(`ID: ${menuId} の練習メニュー取得に失敗しました:`, error);
      return null;
    }
  }

  /**
   * チャットルームをローカルストレージから取得
   * @returns Promise<ChatRoom[]> チャットルームの配列
   */
  async getChatRooms(): Promise<ChatRoom[]> {
    try {
      const roomsJson = await getLocalStorageItem(DEMO_CHAT_ROOMS_KEY);
      if (!roomsJson) {
        // デフォルトデータをロード
        const defaultData = getDefaultDemoData();
        await this.saveChatRooms(defaultData.chatRooms);
        return defaultData.chatRooms;
      }
      
      return roomsJson;
    } catch (error) {
      console.error('デモチャットルームデータの取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * チャットルームデータをローカルストレージに保存
   * @param rooms 保存するチャットルームの配列
   */
  async saveChatRooms(rooms: ChatRoom[]): Promise<void> {
    try {
      await setLocalStorageItem(DEMO_CHAT_ROOMS_KEY, rooms);
    } catch (error) {
      console.error('デモチャットルームデータの保存に失敗しました:', error);
    }
  }

  /**
   * 特定のチャットルームをIDで取得
   * @param roomId チャットルームID
   * @returns Promise<ChatRoom | null> 該当するチャットルームまたはnull
   */
  async getChatRoomById(roomId: string): Promise<ChatRoom | null> {
    try {
      const rooms = await this.getChatRooms();
      return rooms.find(room => room.id === roomId) || null;
    } catch (error) {
      console.error(`ID: ${roomId} のチャットルーム取得に失敗しました:`, error);
      return null;
    }
  }

  /**
   * 特定のチャットルームにメッセージを追加
   * @param roomId チャットルームID
   * @param message 追加するメッセージ
   */
  async addMessageToChatRoom(roomId: string, message: ChatMessage): Promise<void> {
    try {
      const rooms = await this.getChatRooms();
      const updatedRooms = rooms.map((room: any) => {
        if (room.id === roomId) {
          // 最新メッセージ情報を更新
          return {
            ...room,
            messages: [...(room.messages || []), message],
            lastMessage: message.content,
            lastMessageTime: message.timestamp
          };
        }
        return room;
      });
      
      await this.saveChatRooms(updatedRooms as ChatRoom[]);
      
      // チャットメッセージ全体にも追加
      const messages = await this.getAllChatMessages();
      await this.saveChatMessages([...messages, message]);
    } catch (error) {
      console.error(`チャットルーム ${roomId} へのメッセージ追加に失敗しました:`, error);
    }
  }

  /**
   * 全てのチャットメッセージを取得
   */
  async getAllChatMessages(): Promise<ChatMessage[]> {
    try {
      const messagesJson = await getLocalStorageItem(DEMO_CHAT_MESSAGES_KEY);
      if (!messagesJson) {
        // デフォルトのチャットメッセージを取得してChatMessageに変換
        const defaultData = getDefaultDemoData();
        const defaultMessages = defaultData.chatMessages.map((chat: Chat) => ({
          id: chat.id,
          roomId: chat.roomId,
          content: chat.text,
          isUser: chat.isUser,
          timestamp: chat.createdAt
        }));
        await this.saveChatMessages(defaultMessages);
        return defaultMessages;
      }
      
      return messagesJson;
    } catch (error) {
      console.error('デモチャットメッセージの取得に失敗しました:', error);
      return [];
    }
  }

  /**
   * チャットメッセージをローカルストレージに保存
   */
  async saveChatMessages(messages: ChatMessage[]): Promise<void> {
    try {
      await setLocalStorageItem(DEMO_CHAT_MESSAGES_KEY, messages);
    } catch (error) {
      console.error('デモチャットメッセージの保存に失敗しました:', error);
    }
  }

  /**
   * 新しいチャットルームを作成
   * @param title チャットルームのタイトル
   * @param userId ユーザーID（通常はデモユーザーID）
   */
  async createChatRoom(title: string, userId: string = 'demo-user'): Promise<ChatRoom> {
    try {
      const rooms = await this.getChatRooms();
      const newRoomId = `demo-room-${Date.now()}`;
      
      const newRoom: ChatRoom = {
        id: newRoomId,
        title,
        lastMessageTime: new Date(),
        isArchived: false
      };
      
      await this.saveChatRooms([...rooms, newRoom]);
      return newRoom;
    } catch (error) {
      console.error('チャットルームの作成に失敗しました:', error);
      throw error;
    }
  }

  /**
   * アプリプラットフォームに応じたローカルストレージをクリア
   */
  async clearAllDemoData(): Promise<void> {
    try {
      await removeLocalStorageItem(DEMO_LESSONS_KEY);
      await removeLocalStorageItem(DEMO_PRACTICE_MENUS_KEY);
      await removeLocalStorageItem(DEMO_CHAT_ROOMS_KEY);
      await removeLocalStorageItem(DEMO_CHAT_MESSAGES_KEY);
      console.log('全てのデモデータを削除しました');
    } catch (error) {
      console.error('デモデータの削除に失敗しました:', error);
    }
  }

  /**
   * デモデータをリセット（デフォルトに戻す）
   */
  async resetToDefaultData(): Promise<void> {
    try {
      // まず既存のデータをクリア
      await this.clearAllDemoData();
      
      // デフォルトデータをロード
      const defaultData = getDefaultDemoData();
      
      // 各データを保存
      await this.saveLessons(defaultData.lessons);
      await this.savePracticeMenus(defaultData.practiceMenus);
      await this.saveChatRooms(defaultData.chatRooms);
      
      // ChatをChatMessageに変換
      const chatMessages = defaultData.chatMessages.map((chat: Chat) => ({
        id: chat.id,
        roomId: chat.roomId,
        content: chat.text,
        isUser: chat.isUser,
        timestamp: chat.createdAt
      }));
      await this.saveChatMessages(chatMessages);
      
      console.log('デモデータをデフォルト値にリセットしました');
    } catch (error) {
      console.error('デモデータのリセットに失敗しました:', error);
    }
  }
}

// シングルトンインスタンスをエクスポート
export const demoModeService = new DemoModeService(); 