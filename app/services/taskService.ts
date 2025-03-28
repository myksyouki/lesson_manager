import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Task } from '../types/_task';

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
