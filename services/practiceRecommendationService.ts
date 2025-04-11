import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth, functions } from '../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { Task } from '../types/_task';

interface PracticeRecommendationResponse {
  success: boolean;
  recommendations?: any[];
  message?: string;
}

// レッスンサマリーとチャット内容から練習メニューをレコメンドする関数
export const getAIRecommendedPracticeMenus = async (userId: string): Promise<Task[]> => {
  try {
    if (!userId) {
      console.error('ユーザーIDが指定されていません');
      return [];
    }

    console.log('AIレコメンド: 練習メニュー検索開始', { userId });
    
    // 1. 過去のレッスンサマリーを取得（直近5件）
    const lessonSummaries = await fetchRecentLessonSummaries(userId, 5);
    
    // 2. 過去のチャット内容を取得（直近3件）
    const chatMessages = await fetchRecentChatMessages(userId, 3);
    
    // 3. テキストからキーワードを抽出
    const combinedText = [
      ...lessonSummaries.map(summary => summary.text),
      ...chatMessages.map(message => message.text)
    ].join(' ');
    
    if (!combinedText.trim()) {
      console.log('AIレコメンド: 分析対象のテキストが見つかりませんでした');
      return getDefaultRecommendations();
    }
    
    console.log('AIレコメンド: テキスト分析', { 
      textLength: combinedText.length,
      summariesCount: lessonSummaries.length,
      chatsCount: chatMessages.length
    });
    
    // ユーザープロフィールから楽器情報を取得
    const userProfileRef = collection(db, 'userProfiles');
    const userProfileQuery = query(userProfileRef, where('userId', '==', userId));
    const userProfileSnapshot = await getDocs(userProfileQuery);
    
    let instrument = 'ピアノ'; // デフォルト値
    
    if (!userProfileSnapshot.empty) {
      const userProfileData = userProfileSnapshot.docs[0].data();
      instrument = userProfileData.selectedInstrument || 'ピアノ';
    }
    
    // Cloud Functionsを使用して練習メニューを検索
    const generatePracticeRecommendation = httpsCallable<
      { lessonSummary: string; instrument: string; level: string },
      PracticeRecommendationResponse
    >(
      functions,
      'generatePracticeRecommendation'
    );
    
    const result = await generatePracticeRecommendation({
      lessonSummary: combinedText,
      instrument: instrument,
      level: 'INTERMEDIATE'
    });
    
    console.log('AIレコメンド: 検索結果', { 
      success: result.data.success, 
      count: result.data.recommendations?.length || 0 
    });
    
    // 検索に失敗した場合はデフォルトのレコメンドを返す
    if (!result.data.success || !result.data.recommendations || result.data.recommendations.length === 0) {
      return getDefaultRecommendations();
    }
    
    // 検索結果をタスクに変換
    const recommendations = result.data.recommendations;
    const tasks: Task[] = recommendations.map((menu: any, index: number) => {
      // ステップの概要を作成
      let stepsDescription = '';
      if (menu.steps && menu.steps.length > 0) {
        stepsDescription = menu.steps.map((step: any, i: number) => 
          `${i+1}. ${step.title}: ${step.description.substring(0, 60)}...`
        ).join('\n');
      }
      
      return {
        id: `recommended-${Date.now()}-${index}`,
        title: menu.title,
        content: `${menu.description}\n\n練習ステップ:\n${stepsDescription}`,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
        completed: false,
        tags: menu.tags || ['練習', 'AI推奨'],
        category: menu.category || 'practice',
        isRecommended: true,
        difficulty: menu.difficulty || 'INTERMEDIATE',
        steps: menu.steps || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        originalMenu: menu,
      };
    });
    
    return tasks;
  } catch (error) {
    console.error('AIレコメンドの取得に失敗しました:', error);
    return getDefaultRecommendations();
  }
};

// 過去のレッスンサマリーを取得
const fetchRecentLessonSummaries = async (userId: string, count: number = 5): Promise<{id: string, text: string}[]> => {
  try {
    const lessonsRef = collection(db, `users/${userId}/lessons`);
    const lessonsQuery = query(
      lessonsRef,
      where('isDeleted', '==', false),
      where('summary', '!=', ''),
      orderBy('summary'),
      orderBy('createdAt', 'desc'),
      limit(count)
    );
    
    const lessonsSnapshot = await getDocs(lessonsQuery);
    
    if (lessonsSnapshot.empty) {
      return [];
    }
    
    return lessonsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        text: data.summary || ''
      };
    }).filter(item => item.text.trim() !== '');
  } catch (error) {
    console.error('レッスンサマリーの取得に失敗しました:', error);
    return [];
  }
};

// 過去のチャットメッセージを取得
const fetchRecentChatMessages = async (userId: string, count: number = 3): Promise<{id: string, text: string}[]> => {
  try {
    // ユーザーのチャットルームを取得
    const chatRoomsRef = collection(db, `chatRooms`);
    const chatRoomsQuery = query(
      chatRoomsRef,
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc'),
      limit(count)
    );
    
    const chatRoomsSnapshot = await getDocs(chatRoomsQuery);
    
    if (chatRoomsSnapshot.empty) {
      return [];
    }
    
    // チャットルームからメッセージを取得
    const allMessages: {id: string, text: string}[] = [];
    
    for (const chatRoomDoc of chatRoomsSnapshot.docs) {
      const messagesRef = collection(db, `chatRooms/${chatRoomDoc.id}/messages`);
      const messagesQuery = query(
        messagesRef,
        where('sender', '==', 'user'),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      
      const messagesSnapshot = await getDocs(messagesQuery);
      
      if (!messagesSnapshot.empty) {
        const messages = messagesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            text: data.content || ''
          };
        }).filter(item => item.text.trim() !== '');
        
        allMessages.push(...messages);
      }
    }
    
    return allMessages.slice(0, count * 3); // チャットルーム数 × 3 メッセージまで
  } catch (error) {
    console.error('チャットメッセージの取得に失敗しました:', error);
    return [];
  }
};

// デフォルトのレコメンデーションを生成
const getDefaultRecommendations = (): Task[] => {
  const defaultRecommendations = [
    {
      title: '基本練習メニュー',
      description: '基礎力を強化するための練習セット',
      steps: [
        { title: 'ウォームアップ', description: '指の柔軟性を高めるための簡単な運指練習', duration: 5 },
        { title: '音階練習', description: 'メジャースケールとマイナースケールの練習', duration: 10 },
        { title: '表現練習', description: '強弱とリズムに焦点を当てた短い曲の練習', duration: 15 }
      ]
    },
    {
      title: 'テクニック向上練習',
      description: '演奏技術を向上させるための集中練習',
      steps: [
        { title: '指の独立練習', description: '各指の独立した動きを強化するハノン練習', duration: 10 },
        { title: 'アルペジオ練習', description: '和音の分散練習で両手の協調性を高める', duration: 10 },
        { title: '和音練習', description: '正確な和音演奏のための練習', duration: 10 }
      ]
    },
    {
      title: '表現力強化メニュー',
      description: '音楽的表現力を高めるための練習',
      steps: [
        { title: 'リズム練習', description: '複雑なリズムパターンの練習', duration: 10 },
        { title: 'フレージング', description: '音楽的なフレーズの作り方の練習', duration: 15 },
        { title: '強弱表現', description: 'ダイナミクスを使った表現力の練習', duration: 10 }
      ]
    }
  ];
  
  return defaultRecommendations.map((rec, index) => ({
    id: `default-${Date.now()}-${index}`,
    title: rec.title,
    content: `${rec.description}\n\n練習ステップ:\n${rec.steps.map((step, i) => 
      `${i+1}. ${step.title}: ${step.description} (約${step.duration}分)`
    ).join('\n')}`,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
    completed: false,
    tags: ['練習', 'AI推奨'],
    category: 'practice',
    isRecommended: true,
    difficulty: 'INTERMEDIATE',
    steps: rec.steps,
    createdAt: new Date(),
    updatedAt: new Date(),
    originalMenu: rec,
  }));
};

// タスクをFirestoreに保存
export const savePracticeMenuAsTask = async (menu: any, userId: string): Promise<string> => {
  try {
    const tasksRef = collection(db, `users/${userId}/tasks`);
    
    // ステップの概要を作成
    let stepsDescription = '';
    if (menu.steps && menu.steps.length > 0) {
      stepsDescription = menu.steps.map((step: any, i: number) => 
        `## ${i+1}. ${step.title}\n${step.description}\n所要時間: 約${step.duration}分\n`
      ).join('\n');
    }
    
    // タスクデータを作成
    const taskData = {
      title: menu.title,
      description: `${menu.description}\n\n# 練習ステップ\n\n${stepsDescription}`,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
      isCompleted: false,
      userId,
      tags: [...(menu.tags || []), '練習メニュー', 'AI推奨'],
      source: 'ai-recommendation',
      createdAt: new Date(),
      updatedAt: new Date(),
      menuData: menu, // オリジナルのメニューデータを保存
    };
    
    // Firestoreに保存
    const docRef = await addDoc(tasksRef, taskData);
    return docRef.id;
  } catch (error) {
    console.error('タスクの保存に失敗しました:', error);
    throw error;
  }
};

// FirestoreのaddDoc関数をインポート
import { addDoc } from 'firebase/firestore'; 