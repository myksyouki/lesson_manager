export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | Date | { seconds: number; nanoseconds: number };
  isCompleted: boolean;
  completed?: boolean; // isCompletedと互換性を持たせるため
  createdAt: string | Date | { seconds: number; nanoseconds: number };
  updatedAt: string | Date | { seconds: number; nanoseconds: number };
  priority?: string; // 優先度（高、中、低）
  tags?: string[]; // タグのリスト
  attachments?: {
    type: 'text' | 'pdf';
    url: string;
  }[];
  userId?: string; // ユーザーID
  lessonId?: string; // 関連するレッスンID（存在する場合）
  chatRoomId?: string; // 関連するチャットルームID（存在する場合）
}
