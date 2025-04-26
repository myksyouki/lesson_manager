export interface Task {
  id: string;                  // ドキュメントID
  title: string;               // タスクのタイトル
  description: string;         // タスクの説明
  dueDate: string;             // 期限日
  completed: boolean;          // 完了状態 (Firestoreでは completed または isCompleted)
  isPinned: boolean;           // ピン留め状態
  attachments: any[];          // 添付ファイル
  userId: string;              // 所有者ID
  lessonId?: string;           // 関連するレッスンID
  chatRoomId?: string;         // 関連するチャットルームID
  tags: string[];              // タグリスト
  priority: string;            // 優先度
  displayOrder?: number;       // 表示順序 (Firestoreでは orderIndex または order の場合もある)
  // 練習予定日
  practiceDate?: string | { seconds: number; nanoseconds: number } | Date | null;
  // 練習ステップの配列（任意）
  steps?: Array<{ id?: string; title: string; description: string; duration?: number; orderIndex?: number }>;
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
  practiceInfo?: {             // 練習情報
    key?: string;              // 調号
    keyJp?: string;            // 調号（日本語表記）
    scaleType?: string;        // スケールタイプ
    instrumentId?: string;     // 楽器ID
    menuId?: string;           // メニューID
  };
  practiceDate?: string | Date; // 練習日
  steps?: Array<{              // 練習ステップ
    id?: string;
    title: string;
    description?: string;
    duration?: number;
    orderIndex?: number;
  }>;
} 