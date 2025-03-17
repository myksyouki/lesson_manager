import { create } from 'zustand';
import { Task } from '../types/task';
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
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  taskCompletionHistory: [],
  isLoading: false,
  error: null,

  fetchTasks: async (userId) => {
    try {
      set({ isLoading: true, error: null });

      const tasksRef = collection(db, 'tasks');
      const q = query(tasksRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);

      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          description: data.description || '',
          dueDate: data.dueDate || '',
          isCompleted: data.isCompleted || false,
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          attachments: data.attachments || [],
        };
      }) as Task[];

      set({ tasks, isLoading: false });
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
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'tasks'), task);
      
      // 新しいタスクをstateに追加
      const newTask: Task = { 
        id: docRef.id, 
        ...taskData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      set((state) => ({
        tasks: [newTask, ...state.tasks],
        isLoading: false
      }));

      return newTask;
    } catch (error: any) {
      console.error('タスク追加エラー:', error);
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateTask: async (id, taskData) => {
    try {
      set({ isLoading: true, error: null });

      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        ...taskData,
        updatedAt: serverTimestamp()
      });

      set((state) => ({
        tasks: state.tasks.map((task) =>
          task.id === id ? { ...task, ...taskData, updatedAt: new Date().toISOString() } : task
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

      await deleteDoc(doc(db, 'tasks', id));

      set((state) => ({
        tasks: state.tasks.filter((task) => task.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      console.error('タスク削除エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  generateTasksFromLessons: async (userId, monthsBack = 3) => {
    try {
      set({ isLoading: true, error: null });
      
      // 現在の日付から指定した月数前の日付を計算
      const currentDate = new Date();
      const startDate = new Date();
      startDate.setMonth(currentDate.getMonth() - monthsBack);
      
      // レッスンデータを取得
      const lessonsRef = collection(db, 'lessons');
      const q = query(
        lessonsRef, 
        where('user_id', '==', userId),
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
        const taskData = {
          title: taskTitle,
          description: taskDescription,
          dueDate: dueDateStr,
          isCompleted: false,
          attachments: []
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
    const completedTasks = tasks.filter(task => task.isCompleted || task.completed);
    
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
      
      // Firestoreのタスクを更新
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        isCompleted: true,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // ローカルのタスクを更新
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === id ? { 
            ...t, 
            isCompleted: true, 
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString() 
          } : t
        ),
        isLoading: false
      }));
      
      // 完了したタスクの情報を返す
      const category = task.tags && task.tags.length > 0 ? task.tags[0] : '';
      const completionCount = get().getTaskCompletionCount(task.title) + 1;
      
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

  // タスクの完了状態を切り替える
  toggleTaskCompletion: (taskId: string) => {
    set((state) => {
      const updatedTasks = state.tasks.map((task) => {
        if (task.id === taskId) {
          // タスクが完了状態になる場合、完了日時を記録
          const now = new Date();
          const completedAt = task.completed ? undefined : now.toISOString();
          
          // タスク完了履歴に追加
          if (!task.completed) {
            const taskCompletionHistory = [...state.taskCompletionHistory];
            taskCompletionHistory.push({
              taskId,
              taskTitle: task.title,
              completedAt: now.toISOString(),
              category: task.tags && task.tags.length > 0 ? task.tags[0] : undefined
            });
            state.taskCompletionHistory = taskCompletionHistory;
          }
          
          return {
            ...task,
            completed: !task.completed,
            completedAt
          };
        }
        return task;
      });
      
      return { ...state, tasks: updatedTasks };
    });
  },

  // 連続達成日数を取得
  getTaskStreakCount: () => {
    const state = get();
    if (state.taskCompletionHistory.length === 0) {
      return 0;
    }
    
    // 日付ごとにグループ化
    const completionsByDate: Record<string, boolean> = {};
    state.taskCompletionHistory.forEach(history => {
      const date = new Date(history.completedAt).toISOString().split('T')[0];
      completionsByDate[date] = true;
    });
    
    // 日付の配列を作成して降順にソート
    const dates = Object.keys(completionsByDate).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    if (dates.length === 0) return 0;
    
    // 最新の日付
    const latestDate = new Date(dates[0]);
    let streakCount = 1;
    
    // 連続日数をカウント
    for (let i = 1; i < 100; i++) { // 最大100日までチェック
      const prevDate = new Date(latestDate);
      prevDate.setDate(prevDate.getDate() - i);
      const dateString = prevDate.toISOString().split('T')[0];
      
      if (completionsByDate[dateString]) {
        streakCount++;
      } else {
        break;
      }
    }
    
    return streakCount;
  },

  // 今月の練習日数を取得
  getMonthlyPracticeCount: () => {
    const state = get();
    if (state.taskCompletionHistory.length === 0) {
      return 0;
    }
    
    // 現在の月の最初と最後の日を取得
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // 日付ごとにグループ化
    const completionsByDate: Record<string, boolean> = {};
    state.taskCompletionHistory.forEach(history => {
      const completionDate = new Date(history.completedAt);
      
      // 今月のデータのみをフィルタリング
      if (completionDate >= firstDayOfMonth && completionDate <= lastDayOfMonth) {
        const dateString = completionDate.toISOString().split('T')[0];
        completionsByDate[dateString] = true;
      }
    });
    
    // ユニークな日付の数をカウント（= 今月の練習日数）
    return Object.keys(completionsByDate).length;
  },
}));

// レッスンのサマリーから練習ポイントを抽出する関数
function extractPracticePointsFromSummary(summary: string): string {
  // サマリーから練習ポイントや改善点を抽出するロジック
  const practiceKeywords = [
    '練習', '改善', '課題', 'ポイント', '注意', '練習すべき', 
    '取り組む', '向上', '強化', '集中', '意識'
  ];
  
  const lines = summary.split(/[.。\n]/);
  const practicePoints = lines.filter(line => 
    practiceKeywords.some(keyword => line.includes(keyword))
  );
  
  if (practicePoints.length > 0) {
    return practicePoints.join('\n');
  }
  
  return summary;
}
