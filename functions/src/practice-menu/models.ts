import { Timestamp } from 'firebase-admin/firestore';

// 練習メニューコレクション
export interface PracticeMenu {
  id: string;                // ドキュメントID
  title: string;             // メニュータイトル
  description: string;       // 詳細説明
  instrument: string;        // 対象楽器
  category: string;          // カテゴリ（基礎練習/テクニック/表現など）
  difficulty: string;        // 難易度（初級/中級/上級）
  duration: number;          // 所要時間（分）
  sheetMusicUrl?: string;    // 楽譜URL
  videoUrl?: string;         // 解説動画URL（オプション）
  steps: PracticeStep[];     // 練習ステップ
  tags: string[];            // 検索用タグ
  createdAt: Timestamp;      // 作成日時
  updatedAt: Timestamp;      // 更新日時
}

// 練習ステップ
export interface PracticeStep {
  id: string;                // ステップID
  title: string;             // ステップ名
  description: string;       // 詳細説明
  duration: number;          // 所要時間（分）
  orderIndex: number;        // 順序
}

// ユーザー練習記録
export interface PracticeRecord {
  id: string;                // 記録ID
  userId: string;            // ユーザーID
  menuId: string;            // 実施したメニューID
  completedAt: Timestamp;    // 完了日時
  feedback?: string;         // ユーザーフィードバック
  difficulty?: number;       // 体感難易度（1-5）
}

// 楽譜データモデル
export interface SheetMusic {
  id: string;                // 楽譜ID
  title: string;             // タイトル
  svgContent: string;        // SVG形式の楽譜データ
  instrumentId: string;      // 対象楽器ID
  difficulty: string;        // 難易度
  tags: string[];            // 検索用タグ
  createdAt: Timestamp;      // 作成日時
  updatedAt: Timestamp;      // 更新日時
}

// 難易度の列挙型
export enum DifficultyLevel {
  BEGINNER = '初級',
  INTERMEDIATE = '中級',
  ADVANCED = '上級'
}

// カテゴリの列挙型
export enum PracticeCategory {
  BASIC = '基礎練習',
  TECHNIQUE = 'テクニック',
  EXPRESSION = '表現',
  RHYTHM = 'リズム',
  TONE = '音色',
  PIECE = '曲練習'
} 