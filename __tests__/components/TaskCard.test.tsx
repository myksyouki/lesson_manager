import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TaskCard from '../../app/components/TaskCard';
import { router } from 'expo-router';

// モック
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// taskモジュールをモック
jest.mock('../../_ignore/types/_task', () => ({
  Task: {}, // 定義だけしておく
}));

// Taskのインターフェースを定義（実際のコンポーネントで使用される型に合わせて）
type AttachmentType = 'text' | 'pdf';

interface Attachment {
  type: AttachmentType;
  url: string;
  name?: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string | { seconds: number; nanoseconds: number };
  isCompleted: boolean;
  attachments?: Attachment[];
  userId: string;
  createdAt: { seconds: number; nanoseconds: 0 };
  updatedAt: { seconds: number; nanoseconds: 0 };
}

describe('TaskCardコンポーネント', () => {
  // テスト前にrouterのモックをリセット
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // タスクモックデータ
  const mockTask: Task = {
    id: 'task1',
    title: 'テストタスク',
    description: 'これはテスト用のタスク説明です',
    dueDate: '2023年12月31日',
    isCompleted: false,
    attachments: [],
    userId: 'user1',
    createdAt: { seconds: 1630000000, nanoseconds: 0 },
    updatedAt: { seconds: 1630000000, nanoseconds: 0 },
  };

  const mockAITask: Task = {
    ...mockTask,
    id: 'task2',
    attachments: [
      { type: 'text', url: '/chatRooms/chat1', name: 'AIチャット' }
    ],
  };

  test('通常のタスクが正しくレンダリングされる', () => {
    const { getByText, queryByText } = render(<TaskCard task={mockTask} />);
    
    // タイトルと説明が表示されていることを確認
    expect(getByText('テストタスク')).toBeTruthy();
    expect(getByText('これはテスト用のタスク説明です')).toBeTruthy();
    expect(getByText('期日: 2023年12月31日')).toBeTruthy();
    
    // AI練習メニューの表示がないことを確認
    expect(queryByText('AI練習メニュー')).toBeNull();
  });

  test('AIタスクが正しくレンダリングされる', () => {
    const { getByText } = render(<TaskCard task={mockAITask} />);
    
    // タイトルと説明が表示されていることを確認
    expect(getByText('テストタスク')).toBeTruthy();
    expect(getByText('これはテスト用のタスク説明です')).toBeTruthy();
    
    // AI練習メニューの表示があることを確認
    expect(getByText('AI練習メニュー')).toBeTruthy();
  });

  test('タスクをタップするとルーターが呼び出される', () => {
    const { getByText } = render(<TaskCard task={mockTask} />);
    
    // タイトルをタップ
    fireEvent.press(getByText('テストタスク'));
    
    // router.pushが正しいパラメータで呼び出されたか確認
    expect(router.push).toHaveBeenCalledWith({
      pathname: '/task-detail',
      params: { id: 'task1' },
    });
  });
});