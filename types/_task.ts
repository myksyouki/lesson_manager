export interface Task {
  id: string;
  title: string;
  content: string;
  dueDate: Date;
  completed: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
} 