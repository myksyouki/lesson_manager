import { create } from 'zustand';
import { Task } from '../types/_task';
import { db, auth } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp, 
  FieldValue 
} from 'firebase/firestore';

interface TaskCompletionHistory {
  taskId: string;
  taskTitle: string;
  completedAt: string;
  category?: string;
}

interface TaskStore {
  tasks: Task[];
  taskCompletionHistory: TaskCompletionHistory[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  generateTasksFromLessons: (userId: string, monthsBack: number) => Promise<void>;
  getCategoryCompletionCounts: () => Record<string, number>;
  getCategoryCompletionCount: (category: string) => number;
  getTaskCompletionCount: (taskTitle: string) => number;
  completeTask: (id: string) => Promise<{ taskTitle: string; category: string; completionCount: number }>;
  toggleTaskCompletion: (taskId: string) => void;
  getTaskStreakCount: () => number;
  getMonthlyPracticeCount: () => number;
  togglePin: (taskId: string) => Promise<boolean>;
  getPinnedTasks: () => Task[];
  canPinMoreTasks: () => boolean;
  updateTaskOrder: (tasks: Task[], taskType: 'incomplete' | 'completed') => Promise<void>;
  fetchTasksWhenAuthenticated: () => Promise<boolean>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  taskCompletionHistory: [],
  isLoading: false,
  error: null,

  fetchTasks: async (userId) => {
    try {
      console.log("タスク取得開始: ユーザーID =", userId);
      set({ isLoading: true, error: null });

      // ユーザーベースの構造を使用
      const tasksRef = collection(db, `users/${userId}/tasks`);
      console.log("タスクコレクションパス:", `users/${userId}/tasks`);
      
      // クエリを修正：orderBy指定を一時的に削除して全データを取得
      const q = query(
        tasksRef
        // orderByを一旦削除して全件取得
        // orderBy('displayOrder', 'asc'),
        // orderBy('updatedAt', 'desc')
      );
      console.log("クエリ実行前");
      const querySnapshot = await getDocs(q);
      console.log("クエリ実行後: ドキュメント数 =", querySnapshot.docs.length);

      // ドキュメントIDとデータ構造のデバッグ
      querySnapshot.docs.forEach(doc => {
        console.log("取得ドキュメントID:", doc.id);
        console.log("ドキュメント全データ:", JSON.stringify(doc.data()));
      });

      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log("タスクデータ取得:", doc.id, data);
        const task: Task = {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          dueDate: data.dueDate || '',
          completed: data.isCompleted || data.completed || false,
          isPinned: data.isPinned || false,
          practiceDate: data.practiceDate || null,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          attachments: data.attachments || [],
          userId: data.userId || '',
          lessonId: data.lessonId || '',
          chatRoomId: data.chatRoomId || '',
          tags: data.tags || [],
          priority: data.priority || 'medium',
          // 練習ステップを含める
          steps: Array.isArray(data.steps) ? data.steps.map((step: any) => ({
            id: step.id,
            title: step.title,
            description: step.description,
            duration: step.duration,
            orderIndex: step.orderIndex,
          })) : [],
          // displayOrderの代わりにorderまたはorderIndexを使用
          displayOrder: data.displayOrder ?? data.orderIndex ?? data.order ?? 0,
        } as Task;
        return task;
      }) as Task[];

      console.log("タスク変換完了: タスク数 =", tasks.length);
      set({ tasks, isLoading: false });
      console.log("タスクストア更新完了");
    } catch (error: any) {
      console.error('タスク取得エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addTask: async (taskData): Promise<Task> => {
    try {
      set({ isLoading: true, error: null });

      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');

      const task = {
        ...taskData,
        userId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        completed: false,
      };

      // ユーザーベースの構造を使用
      const docRef = await addDoc(collection(db, `users/${user.uid}/tasks`), task);
      
      // 新しいタスクをstateに追加
      const newTask: Task = {
        id: docRef.id,
        ...taskData,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completed: false,
        isPinned: false,
      };

      set(state => ({
        tasks: [...state.tasks, newTask],
        isLoading: false
      }));

      return newTask;
    } catch (error: any) {
      console.error('タスク追加エラー:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateTask: async (id, updates) => {
    try {
      set({ isLoading: true, error: null });
      
      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // ユーザーベースの構造を使用
      const taskRef = doc(db, `users/${user.uid}/tasks`, id);
      
      await updateDoc(taskRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });

      // stateを更新
      set(state => ({
        tasks: state.tasks.map(task => 
          task.id === id ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
        ),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('タスク更新エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  deleteTask: async (id) => {
    try {
      set({ isLoading: true, error: null });
      
      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // ユーザーベースの構造を使用
      const taskRef = doc(db, `users/${user.uid}/tasks`, id);
      await deleteDoc(taskRef);

      // stateから削除
      set(state => ({
        tasks: state.tasks.filter(task => task.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('タスク削除エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  generateTasksFromLessons: async (userId, monthsBack) => {
    try {
      set({ isLoading: true, error: null });
      
      // 現在の日付から指定した月数前の日付を計算
      const currentDate = new Date();
      const startDate = new Date();
      startDate.setMonth(currentDate.getMonth() - monthsBack);
      
      // レッスンデータを取得（ユーザーベースの構造）
      const lessonsRef = collection(db, `users/${userId}/lessons`);
      const q = query(
        lessonsRef, 
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const recentLessons = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          teacher: data.teacher || data.teacherName || '',
          date: data.date || '',
          piece: data.piece || '',
          summary: data.summary || '',
          notes: data.notes || '',
          tags: data.tags || [],
          created_at: data.created_at || data.createdAt || '',
        };
      });
      
      // 既存のタスクのタイトルを取得して重複を避ける
      const existingTaskTitles = get().tasks.map(task => task.title);
      
      // 各レッスンから課題を生成
      for (const lesson of recentLessons) {
        // レッスンのサマリーがない場合はスキップ
        if (!lesson.summary) continue;
        
        // レッスンの曲名から課題タイトルを作成
        const taskTitle = `${lesson.piece}の練習`;
        
        // 既に同じタイトルのタスクが存在する場合はスキップ
        if (existingTaskTitles.includes(taskTitle)) continue;
        
        // 課題の説明文を作成
        let taskDescription = '';
        if (lesson.summary) {
          // サマリーから練習ポイントを抽出
          const practicePoints = extractPracticePointsFromSummary(lesson.summary);
          taskDescription = practicePoints || lesson.summary;
        } else {
          taskDescription = `${lesson.piece}の練習を継続してください。`;
        }
        
        // 課題の期日を設定（現在の日付から1週間後）
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        const dueDateStr = dueDate.toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }).replace(/\s/g, '');
        
        // 新しい課題を作成
        const taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
          title: taskTitle,
          description: taskDescription,
          dueDate: dueDateStr,
          completed: false,
          isPinned: false,
          attachments: [],
          userId,
          tags: [],
          priority: 'medium'
        };
        
        // タスクを追加
        await get().addTask(taskData);
        
        // 重複チェック用の配列に追加
        existingTaskTitles.push(taskTitle);
      }
      
      set({ isLoading: false });
    } catch (error: any) {
      console.error('課題生成エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  getCategoryCompletionCounts: () => {
    const { tasks } = get();
    const completedTasks = tasks.filter(task => task.completed);
    
    // カテゴリごとにグループ化
    const categories: Record<string, number> = {};
    
    completedTasks.forEach(task => {
      if (task.tags && task.tags.length > 0) {
        task.tags.forEach(tag => {
          if (!categories[tag]) {
            categories[tag] = 0;
          }
          categories[tag]++;
        });
      } else {
        // タグがない場合は「その他」に分類
        if (!categories['その他']) {
          categories['その他'] = 0;
        }
        categories['その他']++;
      }
    });
    
    return categories;
  },

  getCategoryCompletionCount: (category: string) => {
    const categories = get().getCategoryCompletionCounts();
    return categories[category] || 0;
  },

  getTaskCompletionCount: (taskTitle: string) => {
    const state = get();
    return state.taskCompletionHistory.filter(
      history => history.taskTitle === taskTitle
    ).length;
  },

  completeTask: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      
      // タスクの情報を取得
      const task = get().tasks.find(t => t.id === id);
      if (!task) {
        throw new Error('タスクが見つかりません');
      }
      
      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // ユーザーベースの構造を使用
      const taskRef = doc(db, `users/${user.uid}/tasks`, id);
      await updateDoc(taskRef, {
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // ローカルのタスクを更新
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { 
            ...t, 
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString() 
          } : t
        ),
        isLoading: false
      }));
      
      // 完了履歴に追加
      const now = new Date().toISOString();
      const completionHistory: TaskCompletionHistory = {
        taskId: id,
        taskTitle: task.title,
        completedAt: now,
        category: task.tags?.[0] || 'その他'
      };
      
      set((state) => ({
        taskCompletionHistory: [
          ...state.taskCompletionHistory,
          completionHistory
        ]
      }));
      
      // 統計情報を返す
      const completionCount = get().getTaskCompletionCount(task.title) + 1;
      const category = task.tags?.[0] || 'その他';
      
      return {
        taskTitle: task.title,
        category,
        completionCount
      };
    } catch (error: any) {
      console.error('タスク完了エラー:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  toggleTaskCompletion: (taskId: string) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.completed) {
      // 完了状態の場合は未完了に戻す
      get().updateTask(taskId, { completed: false });
    } else {
      // 未完了状態の場合は完了にする
      get().completeTask(taskId);
    }
  },

  getTaskStreakCount: () => {
    const { taskCompletionHistory } = get();
    if (taskCompletionHistory.length === 0) return 0;
    
    // 完了日ごとにタスクをグループ化
    const completionsByDate: Record<string, number> = {};
    
    taskCompletionHistory.forEach(history => {
      const date = new Date(history.completedAt).toLocaleDateString('ja-JP');
      if (!completionsByDate[date]) {
        completionsByDate[date] = 0;
      }
      completionsByDate[date]++;
    });
    
    // 日付順に並べ替え
    const dates = Object.keys(completionsByDate).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });
    
    // 連続日数の計算
    let streakCount = 1; // 最低1日
    
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i - 1]);
      const currDate = new Date(dates[i]);
      
      // 日付の差を計算（ミリ秒）
      const diffTime = Math.abs(currDate.getTime() - prevDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // 連続している場合
        streakCount++;
      } else {
        // 連続が途切れた場合
        streakCount = 1;
      }
    }
    
    return streakCount;
  },

  getMonthlyPracticeCount: () => {
    const { taskCompletionHistory } = get();
    if (taskCompletionHistory.length === 0) return 0;
    
    // 現在の月のみのタスク完了数を取得
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const monthlyCompletions = taskCompletionHistory.filter(history => {
      const completionDate = new Date(history.completedAt);
      return (
        completionDate.getMonth() === currentMonth &&
        completionDate.getFullYear() === currentYear
      );
    });
    
    return monthlyCompletions.length;
  },

  togglePin: async (taskId: string) => {
    try {
      const tasks = get().tasks;
      const task = tasks.find(t => t.id === taskId);
      
      if (!task) {
        throw new Error('タスクが見つかりません');
      }
      
      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // 現在の状態を反転
      const newPinnedState = !task.isPinned;
      
      // ピン留めの上限チェック
      if (newPinnedState && !get().canPinMoreTasks()) {
        return false;
      }
      
      // ユーザーベースの構造を使用
      const taskRef = doc(db, `users/${user.uid}/tasks`, taskId);
      await updateDoc(taskRef, {
        isPinned: newPinnedState,
        updatedAt: serverTimestamp()
      });
      
      // ローカルステートを更新
      set(state => ({
        tasks: state.tasks.map(t => 
          t.id === taskId ? { ...t, isPinned: newPinnedState } : t
        )
      }));
      
      return true;
    } catch (error) {
      console.error('ピン留め変更エラー:', error);
      return false;
    }
  },

  getPinnedTasks: () => {
    return get().tasks.filter(task => task.isPinned);
  },

  canPinMoreTasks: () => {
    const MAX_PINNED_TASKS = 3;
    const pinnedCount = get().tasks.filter(task => task.isPinned).length;
    return pinnedCount < MAX_PINNED_TASKS;
  },

  updateTaskOrder: async (tasks, taskType) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('ユーザーが認証されていません');
      
      // バッチ処理が理想的ですが、簡易実装として順次更新
      for (const task of tasks) {
        const taskRef = doc(db, `users/${user.uid}/tasks`, task.id);
        await updateDoc(taskRef, {
          displayOrder: task.displayOrder,
          updatedAt: serverTimestamp()
        });
      }
      
      // ステートも更新
      set(state => {
        // 状態のタスクをコピー
        const updatedTasks = [...state.tasks];
        
        // 更新されたタスクの順序情報を適用
        tasks.forEach(updatedTask => {
          const index = updatedTasks.findIndex(t => t.id === updatedTask.id);
          if (index !== -1) {
            updatedTasks[index] = {
              ...updatedTasks[index],
              displayOrder: updatedTask.displayOrder
            };
          }
        });
        
        return { tasks: updatedTasks };
      });
    } catch (error: any) {
      console.error('タスク順序更新エラー:', error);
      set({ error: error.message });
    }
  },

  // 認証を待機してタスクを取得するメソッドを追加
  fetchTasksWhenAuthenticated: async () => {
    try {
      console.log("認証を待機してタスク取得開始...");
      set({ isLoading: true, error: null });
      
      // 認証状態が確立されるまで最大5回（合計で2.5秒）待機
      let attempts = 0;
      let userId = auth.currentUser?.uid;
      
      while (!userId && attempts < 5) {
        console.log(`認証待機中... 試行回数: ${attempts + 1}/5`);
        // 500ミリ秒待機
        await new Promise(resolve => setTimeout(resolve, 500));
        userId = auth.currentUser?.uid;
        attempts++;
      }
      
      if (!userId) {
        throw new Error("認証タイムアウト: ユーザーIDが取得できませんでした");
      }
      
      console.log("認証確認完了: ユーザーID =", userId);
      
      // 通常のfetchTasksを呼び出し
      await get().fetchTasks(userId);
      
      return true;
    } catch (error: any) {
      console.error('認証待機タスク取得エラー:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  }
}));

function extractPracticePointsFromSummary(summary: string): string {
  if (!summary) return '';
  
  // 練習ポイントが含まれていそうな部分を抽出
  const practiceSections = [
    { regex: /練習ポイント：([\s\S]*?)(?=\n\n|$)/i, priority: 1 },
    { regex: /練習すべきポイント[:：]([\s\S]*?)(?=\n\n|$)/i, priority: 2 },
    { regex: /ポイント[:：]([\s\S]*?)(?=\n\n|$)/i, priority: 3 },
    { regex: /重要な点[:：]([\s\S]*?)(?=\n\n|$)/i, priority: 4 },
    { regex: /今後の課題[:：]([\s\S]*?)(?=\n\n|$)/i, priority: 5 },
    { regex: /課題[:：]([\s\S]*?)(?=\n\n|$)/i, priority: 6 },
  ];
  
  let bestMatch = null;
  let highestPriority = Infinity;
  
  for (const section of practiceSections) {
    const match = summary.match(section.regex);
    if (match && match[1] && section.priority < highestPriority) {
      bestMatch = match[1].trim();
      highestPriority = section.priority;
    }
  }
  
  // 見つからない場合は最初の100文字ほどを抽出
  if (!bestMatch) {
    return summary.substring(0, 100) + '...';
  }
  
  return bestMatch;
}
