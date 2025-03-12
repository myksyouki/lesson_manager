/**
 * レッスンデータの型定義
 */
export interface Lesson {
  id: string;
  user_id: string;
  teacher: string;
  date: string;
  piece?: string;
  pieces?: string[];
  summary?: string;
  notes?: string;
  tags?: string[];
  isFavorite?: boolean;
  status?: 'pending' | 'processing' | 'transcribed' | 'completed' | 'error';
  transcription?: string;
  audioUrl?: string;
  audioPath?: string;
  error?: string;
  processingId?: string; // レッスン処理の一意識別子
  created_at: Date | any; // Firestoreのタイムスタンプ型に対応
  updated_at: Date | any; // Firestoreのタイムスタンプ型に対応
}

/**
 * レッスンのステータス表示用の設定
 */
export interface LessonStatusConfig {
  color: string;
  text: string;
  icon: string;
}

/**
 * レッスンフォームのデータ型
 */
export interface LessonFormData {
  id?: string;
  teacher: string;
  date: string;
  piece?: string;
  pieces?: string[];
  notes?: string;
  tags?: string[];
  audioFile?: Blob;
}

/**
 * レッスン一覧のフィルタリング条件
 */
export interface LessonFilter {
  searchText?: string;
  tags?: string[];
  favorites?: boolean;
  startDate?: Date;
  endDate?: Date;
  status?: string[];
}

/**
 * レッスン一覧のソート条件
 */
export type LessonSortOption = 'date_desc' | 'date_asc' | 'title_asc' | 'title_desc';
