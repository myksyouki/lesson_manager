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

interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: (userId: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTask: (id: string, taskData: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  generateTasksFromLessons: (userId: string, monthsBack: number) => Promise<void>;
  getCategoryCompletionCounts: () => Record<string, number>;
  getCategoryCompletionCount: (category: string) => number;
  getTaskCompletionCount: (taskTitle: string, category?: string) => number;
  completeTask: (id: string) => Promise<{ taskTitle: string; category: string; completionCount: number }>;
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
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

  addTask: async (taskData): Promise<string> => {
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

      return docRef.id;
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

  getTaskCompletionCount: (taskTitle: string, category?: string) => {
    const { tasks } = get();
    const completedTasks = tasks.filter(task => 
      (task.isCompleted || task.completed) && 
      task.title === taskTitle &&
      (!category || (task.tags && task.tags.includes(category)))
    );
    
    return completedTasks.length;
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
      const completionCount = get().getTaskCompletionCount(task.title, category) + 1;
      
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
  }
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
