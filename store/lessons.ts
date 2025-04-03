import { create } from 'zustand';
import { db, auth } from '../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, FieldValue } from 'firebase/firestore';

export interface Lesson {
  id: string;
  date: string;
  teacher: string;
  pieces?: string[];
  summary: string;
  notes: string;
  tags: string[];
  user_id: string;
  audioUrl?: string;
  transcription?: string;
  status?: string;
  isFavorite?: boolean;
  isDeleted?: boolean;
  duplicate?: boolean;
  processingId?: string; // レッスン処理の一意識別子
  created_at?: FieldValue | string;
  updated_at?: FieldValue | string;
  piece?: string;
  audioPath?: string;
  fileName?: string;
  error?: string;
  isArchived?: boolean; // アーカイブフラグ
  archivedDate?: string; // アーカイブ日付（YYYY-MM形式）
  priority: 'high' | 'medium' | 'low';
}

interface LessonStore {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;
  fetchLessons: (userId: string) => Promise<void>;
  addLesson: (lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>) => Promise<string>;
  updateLesson: (lesson: Lesson) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  getFavorites: () => Lesson[];
  setLessons: (lessons: Lesson[]) => void;
  updateLocalLesson: (id: string, lessonData: Partial<Lesson>) => void;
  setState: (updater: (state: LessonStore) => Partial<LessonStore>) => void;
  archiveLesson: (id: string) => Promise<void>; // アーカイブメソッド
  unarchiveLesson: (id: string) => Promise<void>; // アーカイブ解除メソッド
  getArchivedLessons: () => { all: Lesson[], byMonth: Record<string, Lesson[]> }; // アーカイブされたレッスンを取得
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      console.log(`ユーザーID: ${userId} のレッスンデータを取得します`);

      const lessonsRef = collection(db, `users/${userId}/lessons`);
      const q = query(lessonsRef);
      const querySnapshot = await getDocs(q);

      console.log(`Firestoreから取得したドキュメント数: ${querySnapshot.size}`);
      
      if (querySnapshot.empty) {
        console.log(`ユーザーID: ${userId} のレッスンが見つかりませんでした`);
        set({ lessons: [], isLoading: false });
        return;
      }
      
      // 各ドキュメントの構造を確認
      querySnapshot.docs.forEach((doc, index) => {
        if (index < 3) { // 最初の3つだけログ出力（大量になりすぎないように）
          console.log(`ドキュメントID: ${doc.id}, データ構造:`, 
            Object.keys(doc.data()).join(', '));
        }
      });

      const lessons = querySnapshot.docs.map(doc => {
        const data = doc.data();
        
        // データ構造が想定と異なる場合のデバッグ情報
        if (!data.teacher && !data.teacherName) {
          console.log(`警告: ドキュメント ${doc.id} に講師名が含まれていません:`, data);
        }
        
        return {
          id: doc.id,
          user_id: data.user_id || data.userId || '',
          teacher: data.teacher || data.teacherName || '',
          date: data.date || '',
          piece: data.piece || '',
          pieces: Array.isArray(data.pieces) ? data.pieces : [],
          summary: data.summary || '',
          notes: data.notes || '',
          tags: Array.isArray(data.tags) ? data.tags : [],
          isFavorite: Boolean(data.isFavorite),
          status: data.status || 'pending',
          transcription: data.transcription || '',
          audioUrl: data.audioUrl || '',
          audioPath: data.audioPath || '',
          fileName: data.fileName || data.audioFileName || '',
          error: data.error || '',
          processingId: data.processingId || '',
          created_at: data.created_at || data.createdAt || '',
          updated_at: data.updated_at || data.updatedAt || '',
          isDeleted: Boolean(data.isDeleted),
          duplicate: Boolean(data.duplicate),
          isArchived: Boolean(data.isArchived),
          archivedDate: data.archivedDate || '',
          priority: data.priority || 'low'
        };
      }).filter(lesson => {
        // 削除済みレッスンと重複レッスンのみをフィルタリング（アーカイブはフィルタリングしない）
        return (lesson.status !== 'duplicate' && lesson.isDeleted !== true);
      });

      // レッスン日付の降順でソート
      lessons.sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return b.date.localeCompare(a.date);
      });

      console.log(`有効なレッスン数: ${lessons.length}`);
      const archivedCount = lessons.filter(lesson => lesson.isArchived === true).length;
      console.log(`うちアーカイブされたレッスン: ${archivedCount}件`);
      
      if (lessons.length > 0) {
        console.log('最初のレッスンサンプル:', {
          id: lessons[0].id,
          teacher: lessons[0].teacher,
          date: lessons[0].date,
          pieces: lessons[0].pieces,
          status: lessons[0].status,
          summaryExists: !!lessons[0].summary,
          tagsCount: lessons[0].tags?.length || 0,
          isArchived: lessons[0].isArchived
        });
      }

      set({ lessons, isLoading: false });
    } catch (error: any) {
      console.error('レッスンデータ取得エラー:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  addLesson: async (lesson): Promise<string> => {
    try {
      set({ isLoading: true, error: null });

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const lessonData: Omit<Lesson, 'id'> = {
        ...lesson,
        user_id: user.uid,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, `users/${user.uid}/lessons`), lessonData);
      const newLesson: Lesson = { id: docRef.id, ...lessonData };

      set((state) => ({
        lessons: [...state.lessons, newLesson],
        isLoading: false
      }));

      return docRef.id;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error; // エラーを再スローして呼び出し元で処理できるようにする
    }
  },

  updateLesson: async (updatedLesson) => {
    try {
      set({ isLoading: true, error: null });

      const { id, ...lessonData } = updatedLesson;
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const lessonRef = doc(db, `users/${user.uid}/lessons`, id);

      await updateDoc(lessonRef, {
        ...lessonData,
        updated_at: serverTimestamp()
      });

      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === updatedLesson.id ? updatedLesson : lesson
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  deleteLesson: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // Firestoreのドキュメントを削除する代わりに、isDeletedフラグを更新する
      const lessonRef = doc(db, `users/${user.uid}/lessons`, id);
      await updateDoc(lessonRef, {
        isDeleted: true,
        updated_at: serverTimestamp()
      });

      // ローカルのレッスンリストから削除
      set((state) => ({
        lessons: state.lessons.filter((lesson) => lesson.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  toggleFavorite: (id) => {
    set((state) => ({
      lessons: state.lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, isFavorite: !lesson.isFavorite } : lesson
      ),
    }));
  },

  getFavorites: () => {
    return get().lessons.filter((lesson) => lesson.isFavorite);
  },

  setLessons: (lessons) => {
    set({ lessons });
  },

  // ローカルストアのレッスンデータを更新するメソッド（Firestoreには保存しない）
  updateLocalLesson: (id: string, lessonData: Partial<Lesson>) => {
    set((state) => ({
      lessons: state.lessons.map((lesson) =>
        lesson.id === id ? { ...lesson, ...lessonData } : lesson
      ),
    }));
  },

  setState: (updater) => {
    set(updater);
  },

  archiveLesson: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      // アーカイブ日を現在の年月で記録（YYYY-MM形式）
      const now = new Date();
      const archivedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const lessonRef = doc(db, `users/${user.uid}/lessons`, id);
      await updateDoc(lessonRef, {
        isArchived: true,
        archivedDate: archivedDate,
        updated_at: serverTimestamp()
      });

      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === id ? { ...lesson, isArchived: true, archivedDate: archivedDate } : lesson
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  unarchiveLesson: async (id) => {
    try {
      set({ isLoading: true, error: null });

      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');

      const lessonRef = doc(db, `users/${user.uid}/lessons`, id);
      await updateDoc(lessonRef, {
        isArchived: false,
        archivedDate: null,
        updated_at: serverTimestamp()
      });

      set((state) => ({
        lessons: state.lessons.map((lesson) =>
          lesson.id === id ? { ...lesson, isArchived: false, archivedDate: undefined } : lesson
        ),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  getArchivedLessons: () => {
    const allArchivedLessons = get().lessons.filter((lesson) => 
      lesson.isArchived === true && lesson.isDeleted !== true
    );
    
    const byMonth: Record<string, Lesson[]> = {};

    allArchivedLessons.forEach((lesson) => {
      // archivedDateがない場合は現在の年月を使用
      const archivedDate = lesson.archivedDate || 
        `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
      
      if (!byMonth[archivedDate]) {
        byMonth[archivedDate] = [];
      }
      byMonth[archivedDate].push(lesson);
    });

    // 年月でソート（新しい順）
    const sortedByMonth: Record<string, Lesson[]> = {};
    Object.keys(byMonth)
      .sort((a, b) => b.localeCompare(a))
      .forEach(month => {
        // 各月ごとのレッスンを日付の降順でソート
        byMonth[month].sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });
        sortedByMonth[month] = byMonth[month];
      });

    return { all: allArchivedLessons, byMonth: sortedByMonth };
  },
}));
