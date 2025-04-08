export interface Lesson {
  id: string;
  title: string;
  date: Date;
  instrument: string;
  audioUrl?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
  summaryRequired: boolean;
  summaryInProgress: boolean;
  transcriptionCompleteTime?: Date;
  transcriptionId?: string;
  processingId?: string;
  lockAcquiredAt?: Date;
  isArchived: boolean;
  archivedDate?: Date;
  pieces?: string;
  aiInstructions?: string;
} 