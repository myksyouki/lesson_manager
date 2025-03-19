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
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async (userId) => {
    try {
      set({ isLoading: true, error: null });

      const lessonsRef = collection(db, `users/${userId}/lessons`);
      const q = query(lessonsRef);
      const querySnapshot = await getDocs(q);

      const lessons = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          user_id: data.user_id || data.userId || '',
          teacher: data.teacher || data.teacherName || '',
          date: data.date || '',
          piece: data.piece || '',
          pieces: data.pieces || [],
          summary: data.summary || '',
          notes: data.notes || '',
          tags: data.tags || [],
          isFavorite: data.isFavorite || false,
          status: data.status || 'pending',
          transcription: data.transcription || '',
          audioUrl: data.audioUrl || '',
          audioPath: data.audioPath || '',
          fileName: data.fileName || data.audioFileName || '',
          error: data.error || '',
          processingId: data.processingId || '',
          created_at: data.created_at || '',
          updated_at: data.updated_at || ''
        };
      }).filter(lesson => {
        // 削除済みレッスンと重複レッスンをフィルタリング
        return (lesson.status !== 'duplicate');
      });

      set({ lessons, isLoading: false });
    } catch (error: any) {
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
}));
