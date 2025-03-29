import { Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'assistant' | 'system';
  timestamp: Timestamp;
}

export interface ChatRoom {
  id: string;
  title: string;
  topic: string;
  initialMessage?: string;
  userId: string;
  modelType: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  messages?: ChatMessage[];
  lessonData?: any;
  conversationId?: string;
} 