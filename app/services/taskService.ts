import { auth, db, storage, functions, firebaseConfig } from '../config/firebase';
import firebaseApp from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc, limit } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';

// タスクの型定義
export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | Date | { seconds: number; nanoseconds: number };
  isCompleted: boolean;
  createdAt: string | Date | { seconds: number; nanoseconds: number };
  updatedAt: string | Date | { seconds: number; nanoseconds: number };
  tags?: string[];
  attachments?: {
    type: 'text' | 'pdf';
    url: string;
  }[];
  userId?: string;
  lessonId?: string;
  chatRoomId?: string;
  source?: string;
}

// ユーザーベース構造を常に使用する
let useNewStructure = true;

// 新しいデータ構造の使用を設定する関数（互換性のために残す）
export const setUseNewStructure = (useNew: boolean): void => {
  // 常にtrueに設定（引数は無視）
  useNewStructure = true;
};

// タスクの作成
export const createTask = async (
  userId: string,
  title: string,
  description: string,
  dueDate?: string,
  attachments?: Array<{ type: 'text' | 'pdf'; url: string }>
): Promise<Task> => {
  try {
    const taskData = {
      title,
      description,
      dueDate: dueDate || '',
      isCompleted: false,
      userId,
      attachments: attachments || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // ユーザーベース構造でタスクを作成
    const docRef = await addDoc(collection(db, `users/${userId}/tasks`), taskData);
    
    return {
      id: docRef.id,
      ...taskData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('タスク作成中にエラーが発生しました:', error);
    throw new Error('タスクの作成に失敗しました。後でもう一度お試しください。');
  }
};

// AIチャットから練習メニューをタスクとして作成
export const createTaskFromPracticeMenu = async (
  userId: string,
  practiceMenu: string,
  chatRoomId: string
): Promise<Task[]> => {
  try {
    console.log('練習メニューからタスク作成開始:', { userId, chatRoomId });
    
    // dbオブジェクトが正しく初期化されているか確認
    if (!db) {
      console.error('Firestoreデータベースが初期化されていません');
      throw new Error('データベース接続エラー');
    }
    
    // 練習メニューを複数のメニューに分割
    // 「# 」で始まる行を区切りとして使用
    const menuSections = practiceMenu.split(/(?=^# )/gm);
    console.log(`検出された練習メニュー数: ${menuSections.length}`);
    
    // 空のセクションを除外
    const validMenuSections = menuSections.filter(section => section.trim().length > 0);
    
    if (validMenuSections.length === 0) {
      throw new Error('有効な練習メニューが見つかりませんでした');
    }
    
    // 各メニューをタスクとして保存
    const createdTasks: Task[] = [];
    
    for (const menuSection of validMenuSections) {
      // 各メニューのタイトルと説明を分離
      const lines = menuSection.trim().split('\n');
      const title = lines[0].replace(/^#+\s*/, ''); // マークダウンの見出し記号を削除
      const description = lines.slice(1).join('\n').trim();
      
      console.log('タスクデータ準備:', { title });
      
      // カテゴリを抽出（タイトルから推測）
      let category = '練習メニュー';
      if (title.includes('ロングトーン')) category = 'ロングトーン';
      else if (title.includes('スケール')) category = 'スケール';
      else if (title.includes('テクニック')) category = 'テクニック';
      else if (title.includes('曲練習')) category = '曲練習';
      else if (title.includes('リズム')) category = 'リズム';
      else if (title.includes('表現')) category = '表現';
      else if (title.includes('ペダル')) category = 'ペダル';
      else if (title.includes('音色')) category = '音色';
      else if (title.includes('強弱')) category = '強弱';
      
      // タスクデータを作成
      const taskData = {
        title,
        description,
        dueDate: '',
        isCompleted: false,
        userId,
        tags: [category], // カテゴリをタグとして追加
        attachments: [{
          type: 'text' as const,
          url: `/chatRooms/${chatRoomId}` // チャットルームへの参照
        }],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'ai-practice-menu',
        chatRoomId
      };
      
      // ユーザーベース構造でタスクを作成
      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), taskData);
      
      console.log('タスク保存成功:', docRef.id);
      
      // 作成したタスクを配列に追加
      createdTasks.push({
        id: docRef.id,
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    console.log(`${createdTasks.length}個のタスクを作成しました`);
    return createdTasks;
  } catch (error) {
    console.error('練習メニューからのタスク作成中にエラーが発生しました:', error);
    throw new Error('練習メニューからのタスク作成に失敗しました。後でもう一度お試しください。');
  }
};

// ユーザーのタスク一覧を取得
export const getUserTasks = async (userId: string): Promise<Task[]> => {
  try {
    // ユーザーベース構造でタスクを取得
    const tasksRef = collection(db, `users/${userId}/tasks`);
    const q = query(tasksRef, orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate || '',
        isCompleted: data.isCompleted || false,
        attachments: data.attachments || [],
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate().toISOString() 
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate().toISOString() 
          : data.updatedAt,
      } as Task;
    });
  } catch (error) {
    console.error('タスク一覧取得中にエラーが発生しました:', error);
    throw new Error('タスク一覧の取得に失敗しました。後でもう一度お試しください。');
  }
};

// タスクの更新
export const updateTask = async (
  taskId: string,
  updates: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>,
  userId: string
): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // ユーザーベース構造でタスクを更新
    const docRef = doc(db, `users/${userId}/tasks`, taskId);
    
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('タスク更新中にエラーが発生しました:', error);
    throw new Error('タスクの更新に失敗しました。後でもう一度お試しください。');
  }
};

// タスクの削除
export const deleteTask = async (taskId: string, userId: string): Promise<void> => {
  try {
    if (!userId) {
      throw new Error('ユーザーIDが指定されていません');
    }
    
    // ユーザーベース構造でタスクを削除
    const docRef = doc(db, `users/${userId}/tasks`, taskId);
    
    await deleteDoc(docRef);
  } catch (error) {
    console.error('タスク削除中にエラーが発生しました:', error);
    throw new Error('タスクの削除に失敗しました。後でもう一度お試しください。');
  }
};

// レッスンからAIを使用してタスクを生成し保存する
export const createTaskFromLessonSummary = async (
  lessonId: string,
  summary: string,
  pieces: string[] = [],
  teacher: string = ""
): Promise<Task[]> => {
  try {
    console.log('レッスンからのタスク作成開始:', { lessonId, summary: summary.substring(0, 50) + '...' });
    
    // 現在のユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('ユーザーが認証されていません');
      throw new Error('認証が必要です。ログインしてください。');
    }
    
    // Cloud Function呼び出し
    const createTaskFunction = httpsCallable(functions, 'createTaskFromLesson');
    
    // Cloud Functionに送信するデータ - 簡素化
    const functionData = {
      lessonId,
      summary,
      pieces,
      teacher,
      roomId: `lesson-${lessonId}`
    };
    
    // Cloud Function呼び出し
    console.log('Cloud Function呼び出し準備:', functionData);
    const result = await createTaskFunction(functionData);
    console.log('Cloud Function応答:', result.data);
    
    // レスポンスデータの取得
    const responseData = result.data as { 
      success: boolean;
      tasks: string;
      conversationId: string;
    };
    
    if (!responseData.success) {
      throw new Error('タスク生成に失敗しました');
    }
    
    // タスクテキストをパースして個別のタスクに分割
    const taskTexts = parseTasksFromMarkdown(responseData.tasks);
    console.log(`${taskTexts.length}個のタスクを検出しました`);
    
    // 各タスクをFirestoreに保存
    const createdTasks: Task[] = [];
    
    for (const task of taskTexts) {
      // タスクデータを作成
      const taskData = {
        title: task.title,
        description: task.description,
        dueDate: '',  // 期日は未設定
        isCompleted: false,
        userId,
        lessonId, // 関連するレッスンID
        tags: ['レッスン', '練習課題'], // デフォルトのタグ
        attachments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'ai-lesson-task'
      };
      
      // ユーザーベース構造でタスクを作成
      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), taskData);
      
      console.log('タスク保存成功:', docRef.id);
      
      // 作成したタスクを配列に追加
      createdTasks.push({
        id: docRef.id,
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    console.log(`${createdTasks.length}個のタスクを作成しました`);
    return createdTasks;
  } catch (error) {
    console.error('レッスンからのタスク作成中にエラーが発生しました:', error);
    throw error;
  }
};

/**
 * マークダウン形式のタスクテキストをパースして個別のタスクに分割する
 */
function parseTasksFromMarkdown(markdown: string): Array<{ title: string; description: string }> {
  const tasks: Array<{ title: string; description: string }> = [];
  
  // # で始まる行でタスクを分割
  const taskBlocks = markdown.split(/(?=^# )/gm);
  
  for (const block of taskBlocks) {
    // 空のブロックをスキップ
    if (!block.trim()) continue;
    
    // 各ブロックを行に分割
    const lines = block.trim().split('\n');
    
    // 最初の行がタイトル (# から始まる)
    let title = lines[0].replace(/^#+\s*/, '').trim();
    
    // 残りの行が説明
    const description = lines.slice(1).join('\n').trim();
    
    // title が空の場合はスキップ
    if (!title) continue;
    
    tasks.push({ title, description });
  }
  
  return tasks;
}

// チャットメッセージの型定義
interface ChatMessage {
  sender: string;
  content: string;
  timestamp?: any;
}

// JSONをパースする補助関数
function tryParseJSON(jsonString: string): any {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

// チャットからタスクを生成する（Cloud Functions経由）
export const createTaskFromChatUsingFunction = async (
  messages: ChatMessage[],
  chatTitle: string,
  chatTopic: string,
  additionalData?: {
    instrument?: string;
    skill_level?: string;
    practice_content?: string;
    specific_goals?: string;
    roomId?: string;
  }
): Promise<{ success: boolean; message?: string; taskIds?: string[] }> => {
  try {
    console.log('チャットからのタスク生成開始：', {
      messagesCount: messages.length,
      chatTitle,
      chatTopic,
      additionalData: additionalData 
        ? { instrument: additionalData.instrument, specific_goals: additionalData.specific_goals ? additionalData.specific_goals.substring(0, 20) + '...' : undefined }
        : undefined
    });
    
    // 現在のユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('ユーザーが認証されていません');
      return { success: false, message: '認証が必要です。ログインしてください。' };
    }
    
    // Cloud Functions URL
    const endpoint = `https://asia-northeast1-${firebaseConfig.projectId}.cloudfunctions.net/createTaskFromChat`;
    
    console.log('📝 タスク生成APIエンドポイント:', endpoint);
    
    // 送信データを準備 - 必要最小限のパラメータのみを含める
    const requestData = {
      messages,
      chatTitle,
      chatTopic,
      // 必須パラメータ
      instrument: additionalData?.instrument || undefined,
      skill_level: additionalData?.skill_level || undefined,
      practice_content: additionalData?.practice_content || undefined,
      specific_goals: additionalData?.specific_goals || chatTopic,
      roomId: additionalData?.roomId || `chat-task-${Date.now()}`
    };
    
    // リクエストボディを準備 - dataオブジェクトで囲む（Cloud Functionsの期待する形式）
    const requestBody = JSON.stringify({
      data: requestData
    });
    
    console.log('📦 リクエストデータ準備完了:', {
      endpoint,
      messagesCount: messages.length,
      chatTitle,
      chatTopic,
      instrument: requestData.instrument,
      skill_level: requestData.skill_level,
      bodyLength: requestBody.length,
      bodyPreview: requestBody.substring(0, 100) + '...'
    });
    
    // タイムアウト制御
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏱️ HTTP呼び出しタイムアウト - リクエストをアボート');
      controller.abort();
    }, 60000);
    
    try {
      // Firebase Cloud Functionを呼び出す
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: requestBody,
        signal: controller.signal
      });
      
      // タイムアウトクリア
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ HTTP応答エラー:', response.status, errorData);
        return { success: false, message: `サーバーエラー: ${response.status} ${errorData}` };
      }
      
      // レスポンスをJSONとして解析
      const responseData = await response.json();
      console.log('✅ タスク生成APIレスポンス:', responseData);
      
      // レスポンスの検証
      if (responseData && responseData.result) {
        const taskData = typeof responseData.result.tasks === 'string' 
          ? tryParseJSON(responseData.result.tasks)
          : null;
        
        // タスクデータが見つかった場合の処理
        if (taskData) {
          return {
            success: true,
            message: "タスクが正常に生成されました"
          };
        }
      }
      
      // エラーケース
      return {
        success: false,
        message: "タスクデータを処理できませんでした"
      };
    } catch (httpError) {
      // HTTPリクエストエラーの処理
      clearTimeout(timeoutId);
      console.error('❌ HTTP通信エラー:', httpError);
      
      return { 
        success: false, 
        message: `サーバーとの通信中にエラーが発生しました: ${httpError instanceof Error ? httpError.message : '不明なエラー'}`
      };
    }
  } catch (error) {
    console.error('❌ チャットからのタスク作成中にエラーが発生しました:', error);
    return {
      success: false,
      message: 'タスク生成に失敗しました。後でもう一度お試しください。'
    };
  }
};
