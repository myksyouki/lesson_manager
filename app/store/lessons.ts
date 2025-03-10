import { create } from 'zustand';
import { db, auth } from '../config/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, FieldValue } from 'firebase/firestore';

export interface Lesson {
  id: string;
  date: string;
  teacher: string;
  piece: string;
  summary: string;
  notes: string;
  tags: string[];
  user_id: string;
  audioUrl?: string;
  isFavorite?: boolean;
  created_at?: FieldValue | string;
  updated_at?: FieldValue | string;
}

interface LessonStore {
  lessons: Lesson[];
  isLoading: boolean;
  error: string | null;
  fetchLessons: (userId: string) => Promise<void>;
  addLesson: (lesson: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateLesson: (lesson: Lesson) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => void;
  getFavorites: () => Lesson[];
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  isLoading: false,
  error: null,

  fetchLessons: async (userId) => {
    try {
      set({ isLoading: true, error: null });

      const lessonsRef = collection(db, 'lessons');
      const q = query(lessonsRef, where('user_id', '==', userId));
      const querySnapshot = await getDocs(q);

      const lessons = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Lesson[];

      set({ lessons, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addLesson: async (lesson): Promise<void> => {
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

      const docRef = await addDoc(collection(db, 'lessons'), lessonData);
      const newLesson: Lesson = { id: docRef.id, ...lessonData };

      set((state) => ({
        lessons: [...state.lessons, newLesson],
        isLoading: false
      }));

    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  updateLesson: async (updatedLesson) => {
    try {
      set({ isLoading: true, error: null });

      const { id, ...lessonData } = updatedLesson;
      const lessonRef = doc(db, 'lessons', id);

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

      await deleteDoc(doc(db, 'lessons', id));

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
    return get().lessons.filter(lesson => lesson.isFavorite);
  }
}));
