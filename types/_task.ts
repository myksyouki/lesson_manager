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
  createdAt: string;           // 作成日時
  updatedAt: string;           // 更新日時
} 