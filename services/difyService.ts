import { auth } from '../config/firebase';
import { Task } from '../types/_task';

export const getRecommendedTasks = async (userId: string): Promise<Task[]> => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('ユーザーが認証されていません');

    // Dify APIのエンドポイント
    const DIFY_API_URL = process.env.EXPO_PUBLIC_DIFY_API_URL;
    const DIFY_API_KEY = process.env.EXPO_PUBLIC_DIFY_API_KEY;

    if (!DIFY_API_URL || !DIFY_API_KEY) {
      throw new Error('Dify APIの設定が不足しています');
    }

    // ユーザーのプロフィール情報を取得
    const userProfile = await user.getIdTokenResult();
    const instrument = userProfile.claims.instrument || '楽器';

    // Dify APIにリクエストを送信
    const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DIFY_API_KEY}`,
      },
      body: JSON.stringify({
        inputs: {
          instrument,
          userId,
        },
        query: `${instrument}の練習メニューを3つ提案してください。各メニューは具体的な練習内容と目標を含めてください。`,
        response_mode: 'blocking',
        conversation_id: '',
        user: userId,
      }),
    });

    if (!response.ok) {
      throw new Error('Dify APIからのレスポンスが不正です');
    }

    const data = await response.json();
    
    // レスポンスをタスク形式に変換
    const recommendedTasks: Task[] = data.answer
      .split('\n')
      .filter((line: string) => line.trim())
      .map((line: string, index: number) => ({
        id: `recommended-${Date.now()}-${index}`,
        title: line.split(':')[0]?.trim() || `推奨練習 ${index + 1}`,
        content: line.split(':')[1]?.trim() || line,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1週間後
        completed: false,
        tags: ['練習', 'AI推奨'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

    return recommendedTasks;
  } catch (error) {
    console.error('AIレコメンデーションの取得に失敗しました:', error);
    return [];
  }
}; 