export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  isPinned: boolean;
  attachments: any[];
  userId: string;
  lessonId?: string;
  chatRoomId?: string;
  tags: string[];
  priority: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
} 