import { doc, setDoc, updateDoc, getDoc, collection, query, where, orderBy, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../app/config/firebase';
import { Task } from '../../types/task';

/**
 * タスク関連のAPI操作を行うサービスクラス
 */
class TaskService {
  /**
   * タスクを取得する
   * @param taskId タスクID
   * @returns タスクデータ
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', taskId));
      
      if (!taskDoc.exists()) {
        throw new Error('タスクが見つかりません');
      }
      
      return {
        id: taskDoc.id,
        ...taskDoc.data(),
      } as Task;
    } catch (error) {
      console.error('タスクの取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * ユーザーのタスク一覧を取得する
   * @param userId ユーザーID
   * @param includeCompleted 完了済みのタスクを含めるかどうか
   * @returns タスク一覧
   */
  async getUserTasks(userId: string, includeCompleted: boolean = true): Promise<Task[]> {
    try {
      let tasksQuery = query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        orderBy('dueDate', 'asc')
      );
      
      if (!includeCompleted) {
        tasksQuery = query(
          tasksQuery,
          where('isCompleted', '==', false)
        );
      }
      
      const tasksSnapshot = await getDocs(tasksQuery);
      
      return tasksSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Task[];
    } catch (error) {
      console.error('タスク一覧の取得に失敗しました:', error);
      throw error;
    }
  }

  /**
   * 新しいタスクを作成する
   * @param taskData タスクデータ
   * @returns 作成されたタスクのID
   */
  async createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> & { userId: string }): Promise<string> {
    try {
      const newTaskRef = doc(collection(db, 'tasks'));
      const now = new Date().toISOString();
      
      await setDoc(newTaskRef, {
        ...taskData,
        createdAt: now,
        updatedAt: now,
      });
      
      return newTaskRef.id;
    } catch (error) {
      console.error('タスクの作成に失敗しました:', error);
      throw error;
    }
  }

  /**
   * タスクを更新する
   * @param taskId タスクID
   * @param taskData 更新するタスクデータ
   */
  async updateTask(taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        ...taskData,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('タスクの更新に失敗しました:', error);
      throw error;
    }
  }

  /**
   * タスクを削除する
   * @param taskId タスクID
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (error) {
      console.error('タスクの削除に失敗しました:', error);
      throw error;
    }
  }

  /**
   * タスクの完了状態を切り替える
   * @param taskId タスクID
   * @param isCompleted 完了状態
   */
  async toggleTaskCompletion(taskId: string, isCompleted: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        isCompleted,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('タスクの完了状態の更新に失敗しました:', error);
      throw error;
    }
  }

  /**
   * レッスンから自動的にタスクを生成する
   * @param userId ユーザーID
   * @param lessonId 関連するレッスンID
   * @param taskTitle タスクのタイトル
   * @param taskDescription タスクの説明
   * @param dueDate 期限日
   * @returns 作成されたタスクのID
   */
  async createTaskFromLesson(
    userId: string,
    lessonId: string,
    taskTitle: string,
    taskDescription: string,
    dueDate: string
  ): Promise<string> {
    try {
      const newTaskRef = doc(collection(db, 'tasks'));
      const now = new Date().toISOString();
      
      await setDoc(newTaskRef, {
        title: taskTitle,
        description: taskDescription,
        dueDate,
        isCompleted: false,
        createdAt: now,
        updatedAt: now,
        userId,
        lessonId, // 関連するレッスンIDを保存
        attachments: [],
      });
      
      return newTaskRef.id;
    } catch (error) {
      console.error('レッスンからのタスク作成に失敗しました:', error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
export const taskService = new TaskService();
