import { auth, db } from '../config/firebase';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { Task } from '../_ignore/types/_task';
import { getFunctions, httpsCallable } from 'firebase/functions';

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

const functions = getFunctions();

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
    
    // Cloud Functionに送信するデータ
    const functionData = {
      lessonId,
      summary,
      pieces,
      teacher
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
        tags: [], // タグは未設定
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

// チャットからタスクを生成する
export const createTaskFromChat = async (
  messageContent: string,
  chatTitle: string,
  chatTopic: string
): Promise<{ success: boolean; message?: string; taskIds?: string[] }> => {
  try {
    console.log('チャットからのタスク作成開始:', { 
      messageContent: messageContent.substring(0, 50) + '...',
      chatTitle,
      chatTopic
    });
    
    // 現在のユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('ユーザーが認証されていません');
      return { success: false, message: '認証が必要です。ログインしてください。' };
    }
    
    // 内容からタスクに変換
    const taskItems = parseTasksFromMessageContent(messageContent);
    
    if (taskItems.length === 0) {
      return { success: false, message: 'メッセージからタスクを抽出できませんでした。' };
    }
    
    // タスクを保存
    const taskIds: string[] = [];
    
    for (const item of taskItems) {
      const taskData = {
        title: item.title,
        description: item.description,
        dueDate: '',
        isCompleted: false,
        userId,
        tags: ['AI', 'チャット'],
        source: 'chat',
        chatTitle,
        chatTopic,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // ユーザーベース構造でタスクを作成
      const docRef = await addDoc(collection(db, `users/${userId}/tasks`), taskData);
      taskIds.push(docRef.id);
      
      console.log('タスク保存成功:', docRef.id);
    }
    
    console.log(`${taskIds.length}個のタスクを作成しました`);
    return {
      success: true,
      taskIds,
      message: `${taskIds.length}個のタスクを作成しました`
    };
  } catch (error) {
    console.error('チャットからのタスク作成中にエラーが発生しました:', error);
    return {
      success: false,
      message: 'タスク作成に失敗しました。後でもう一度お試しください。'
    };
  }
};

// AIメッセージ内容からタスクを抽出する
function parseTasksFromMessageContent(messageContent: string): Array<{ title: string; description: string }> {
  const tasks: Array<{ title: string; description: string }> = [];
  
  // 行ごとに分割
  const lines = messageContent.split('\n');
  
  let currentTitle = '';
  let currentDescription = '';
  let inTaskSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 空行は無視
    if (line.length === 0) continue;
    
    // タスクのセクション/項目を示す可能性がある行を探す
    if (line.match(/^([1-9][0-9]*\.|[-•*]|タスク|練習項目|課題|練習課題|次回までの課題)/i)) {
      // 前のタスクがあれば保存
      if (currentTitle) {
        tasks.push({
          title: currentTitle,
          description: currentDescription.trim()
        });
      }
      
      // 新しいタスクのタイトル
      // 番号/記号を削除してタイトルだけを取り出す
      currentTitle = line.replace(/^([1-9][0-9]*\.|-|•|\*|タスク|練習項目|課題|練習課題|次回までの課題):?\s*/i, '');
      currentDescription = '';
      inTaskSection = true;
    } 
    // タスクセクション内の追加情報の行
    else if (inTaskSection) {
      // 次のタスク項目でなければ、現在のタスクの説明に追加
      currentDescription += line + '\n';
    }
  }
  
  // 最後のタスクを追加
  if (currentTitle) {
    tasks.push({
      title: currentTitle,
      description: currentDescription.trim()
    });
  }
  
  // タスクが見つからなかった場合、メッセージ全体を単一のタスクとして扱う
  if (tasks.length === 0 && messageContent.trim().length > 0) {
    // 最初の行または「」を含む行をタイトルとして使用
    const lines = messageContent.trim().split('\n');
    let title = lines[0];
    
    // タイトルとして先頭行が長すぎる場合は切り詰める
    if (title.length > 50) {
      title = title.substring(0, 47) + '...';
    }
    
    tasks.push({
      title,
      description: messageContent.trim()
    });
  }
  
  return tasks;
}

// チャットルームのメッセージからCloud Functionを使ってタスクを生成する
export const createTaskFromChatUsingFunction = async (
  messages: { sender: string; content: string; timestamp?: any }[],
  chatTitle: string,
  chatTopic: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('チャットからのタスク作成開始 (Cloud Function):', { 
      messageCount: messages.length,
      chatTitle,
      chatTopic
    });
    
    // 現在のユーザーIDを取得
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error('ユーザーが認証されていません');
      return { success: false, message: '認証が必要です。ログインしてください。' };
    }

    // AI応答のみを使用（最後のAIメッセージ）
    const lastAiMessage = [...messages].reverse().find(msg => msg.sender === 'ai');
    
    if (!lastAiMessage) {
      return { success: false, message: 'AIからのメッセージが見つかりません。タスクを作成できません。' };
    }

    console.log('最後のAIメッセージを使用:', {
      contentPreview: lastAiMessage.content.substring(0, 50) + '...'
    });

    // Cloud Function呼び出し
    const createTaskFunction = httpsCallable(functions, 'createTaskFromLesson');
    
    // Cloud Functionに送信するデータ（レッスンと同じパラメータフォーマットに合わせる）
    const functionData = {
      summary: lastAiMessage.content, // 最後のAIメッセージのみ使用
      pieces: [],
      teacher: "",
      chatTitle,
      chatTopic,
      isFromChat: true
    };
    
    // Cloud Function呼び出し
    console.log('Cloud Function呼び出し準備:', {
      ...functionData,
      summaryLength: functionData.summary.length
    });
    
    // リトライロジックを追加（最大3回）
    let response = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`試行 ${attempts}/${maxAttempts} - Cloud Function呼び出し開始`);
        const result = await createTaskFunction(functionData);
        console.log(`試行 ${attempts}/${maxAttempts} - Cloud Function応答:`, result.data);
        
        // 応答があればループを抜ける
        if (result.data && Object.keys(result.data).length > 0) {
          response = result.data;
          break;
        } else {
          // 空の応答の場合は一時停止してから再試行
          console.log(`空の応答。${attempts < maxAttempts ? '再試行します...' : '最大試行回数に達しました。'}`);
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempts)); // 徐々に長くなる待機時間
          }
        }
      } catch (error) {
        console.error(`試行 ${attempts}/${maxAttempts} - エラー:`, error);
        if (attempts >= maxAttempts) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    
    if (!response) {
      return { success: false, message: '応答がありませんでした。後で再試行してください。' };
    }
    
    // レスポンスデータの取得
    const responseData = response as { 
      success: boolean;
      tasks: string;
      conversationId: string;
    };
    
    if (!responseData.success || !responseData.tasks) {
      console.error('Cloud Functionからの不正なレスポンス:', responseData);
      return { success: false, message: 'タスク生成に失敗しました' };
    }

    console.log('レスポンスからタスクデータを取得:', {
      success: responseData.success,
      tasksPreview: responseData.tasks.substring(0, 50) + '...'
    });

    // タスクテキストをパースして個別のタスクに分割
    const taskTexts = parseTasksFromMarkdown(responseData.tasks);
    console.log(`${taskTexts.length}個のタスクを検出しました`);
    
    if (taskTexts.length === 0) {
      console.warn('パース可能なタスクが見つかりませんでした');
      // タスクが見つからない場合でも、元のテキストを1つのタスクとして扱う
      taskTexts.push({
        title: 'AIからのタスク',
        description: responseData.tasks
      });
    }
    
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
        chatTitle,
        chatTopic,
        tags: ['AI', 'チャット'],
        attachments: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        source: 'ai-chat-task'
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
    
    return { 
      success: true, 
      message: `${createdTasks.length}個のタスクを作成しました`
    };
  } catch (error) {
    console.error('チャットからのタスク作成中にエラーが発生しました:', error);
    return { 
      success: false, 
      message: 'タスク作成に失敗しました。後でもう一度お試しください。' 
    };
  }
};
