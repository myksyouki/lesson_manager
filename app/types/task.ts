export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  attachments?: {
    type: 'text' | 'pdf';
    url: string;
  }[];
}
