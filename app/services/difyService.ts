import axios from 'axios';

// Dify API設定
const DIFY_API_BASE_URL = process.env.EXPO_PUBLIC_DIFY_API_URL || 'https://api.dify.ai/v1';
const LESSON_AI_API_KEY = process.env.EXPO_PUBLIC_DIFY_LESSON_API_KEY || '';
const PRACTICE_MENU_AI_API_KEY = process.env.EXPO_PUBLIC_DIFY_PRACTICE_MENU_API_KEY || '';
const LESSON_APP_ID = process.env.EXPO_PUBLIC_DIFY_LESSON_APP_ID || '';
const PRACTICE_MENU_APP_ID = process.env.EXPO_PUBLIC_DIFY_PRACTICE_MENU_APP_ID || '';

// チャットメッセージの型定義
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// 練習メニューの型定義
export interface PracticeMenu {
  title: string;
  goals: string[];
  practiceItems: string[];
  notes: string[];
}

// 練習メニュー生成の戻り値の型定義
export interface PracticeMenuResponse {
  practiceMenus: PracticeMenu[];
  rawContent: string;
}

// レッスンAIとのチャット
export const sendMessageToLessonAI = async (
  message: string, 
  conversationId?: string
): Promise<{ 
  answer: string; 
  conversationId: string; 
}> => {
  try {
    console.log('Dify API呼び出し:', {
      url: `${DIFY_API_BASE_URL}/chat-messages`,
      apiKey: LESSON_AI_API_KEY ? LESSON_AI_API_KEY.substring(0, 10) + '...' : 'なし',
      message,
      conversationId
    });

    if (!LESSON_AI_API_KEY) {
      throw new Error('Dify APIキーが設定されていません。.envファイルを確認してください。');
    }

    // ストリーミングモードではなくブロッキングモードを使用
    const response = await axios.post(
      `${DIFY_API_BASE_URL}/chat-messages`,
      {
        inputs: {},
        query: message,
        response_mode: 'blocking', // streamingからblockingに戻す
        conversation_id: conversationId,
        user: 'user'
      },
      {
        headers: {
          'Authorization': `Bearer ${LESSON_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Dify API応答:', {
      status: response.status,
      conversation_id: response.data.conversation_id,
      answer_length: response.data.answer?.length || 0
    });

    // レスポンスが空の場合のエラーメッセージ
    if (!response.data.answer) {
      console.error('Dify APIからの応答が空です');
    }

    return {
      answer: response.data.answer || 'AIからの応答を取得できませんでした。もう一度お試しください。',
      conversationId: response.data.conversation_id || conversationId || ''
    };
  } catch (error: any) {
    console.error('レッスンAIへのメッセージ送信中にエラーが発生しました:', error);
    
    if (error.response) {
      console.error('エラーステータス:', error.response.status);
      console.error('エラーレスポンス:', error.response.data);
    }
    
    // APIキーが間違っている可能性があるエラーメッセージ
    if (error.response?.status === 401) {
      throw new Error('認証エラー: APIキーが無効です。Difyダッシュボードで正しいシークレットキーを確認してください。');
    } else if (error.response?.status === 404) {
      throw new Error('エンドポイントが見つかりません。Dify APIのURLが正しいか確認してください。');
    } else if (error.response?.status === 405) {
      // Method Not Allowed - APIが特定のHTTPメソッドを受け付けない場合
      throw new Error('APIエラー: このエンドポイントはこのメソッドをサポートしていません。Dify APIのドキュメントを確認してください。');
    }
    
    throw new Error(`AIとの通信に失敗しました: ${error.message}`);
  }
};

// 練習メニュー生成
export const createPracticeMenu = async (chatHistory: ChatMessage[]): Promise<PracticeMenuResponse> => {
  try {
    // チャット履歴が空の場合
    if (!chatHistory || chatHistory.length === 0) {
      return {
        practiceMenus: [],
        rawContent: '練習メニューを生成するためのチャット履歴がありません。'
      };
    }

    console.log('練習メニュー生成API呼び出し:', {
      apiKey: PRACTICE_MENU_AI_API_KEY.substring(0, 10) + '...',
      chatHistoryLength: chatHistory.length,
      url: `${DIFY_API_BASE_URL}/chat-messages`
    });

    // チャット履歴のサンプルを表示（デバッグ用）
    if (chatHistory.length > 0) {
      console.log('チャット履歴サンプル（最初と最後のメッセージ）:');
      console.log('最初:', chatHistory[0].content);
      console.log('最後:', chatHistory[chatHistory.length - 1].content);
    }

    // チャット履歴からトピックを抽出
    const topics = extractTopicsFromChatHistory(chatHistory);
    console.log('抽出されたトピック:', topics);

    // 会話の要約を作成
    const summary = `これまでの会話では${chatHistory.length}回のやり取りがありました。主なトピック: ${topics.join(', ')}。最新の質問は「${chatHistory[chatHistory.length - 1].content.substring(0, 100)}...」でした。`;

    // チャット履歴を文字列に変換
    const chatHistoryString = chatHistory.map(msg => 
      `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
    ).join('\n\n');
    
    const requestBody = {
      inputs: {
        chat_history: chatHistoryString
      },
      query: `以下は音楽レッスンに関する会話の要約です：${summary}\n\nこの会話内容に基づいて、具体的な練習メニューを作成してください。各練習メニューは「# 」で始まるタイトルから開始し、以下の形式で作成してください：
1. 「## 目標」セクション（箇条書き）
2. 「## 練習内容」セクション（番号付きリスト）
3. 「## 注意点」セクション（箇条書き）

異なる種類の練習（テクニック練習、表現練習、理論学習など）は、それぞれ別の練習メニューとして作成してください。`,
      response_mode: 'blocking',
      user: 'user'
    };
    
    console.log('リクエストボディ:', JSON.stringify(requestBody, null, 2));
    
    const response = await axios.post(
      `${DIFY_API_BASE_URL}/chat-messages`,
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${PRACTICE_MENU_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('レスポンスヘッダー:', response.headers);
    console.log('API応答:', {
      status: response.status,
      answer_length: response.data.answer?.length || 0
    });

    const rawContent = response.data.answer || '練習メニューを生成できませんでした。もう一度お試しください。';
    const practiceMenus = parsePracticeMenus(rawContent);

    return {
      practiceMenus,
      rawContent
    };

  } catch (error: any) {
    console.error('練習メニュー作成中にエラーが発生しました:', error);
    
    if (error.response) {
      console.error('エラーステータス:', error.response.status);
      console.error('エラーレスポンス:', error.response.data);
      
      // メソッド1が失敗した場合、メソッド2を試す
      try {
        console.log('メソッド1が失敗しました。メソッド2を試します...');
        
        // チャット履歴を文字列に変換
        const chatHistoryString = chatHistory.map(msg => 
          `${msg.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${msg.content}`
        ).join('\n\n');
        
        // チャット履歴からトピックを抽出
        const fallbackTopics = extractTopicsFromChatHistory(chatHistory);
        
        // 会話の要約を作成
        const fallbackSummary = `これまでの会話では${chatHistory.length}回のやり取りがありました。主なトピック: ${fallbackTopics.join(', ')}。最新の質問は「${chatHistory[chatHistory.length - 1].content.substring(0, 100)}...」でした。`;
        
        // メソッド2: 会話履歴を送信せず、直接クエリに含める
        const completionRequestBody = {
          inputs: {
            chat_history: chatHistoryString
          },
          query: `以下は音楽レッスンに関する会話の要約です：${fallbackSummary}\n\nこの会話内容に基づいて、具体的な練習メニューを作成してください。各練習メニューは「# 」で始まるタイトルから開始し、以下の形式で作成してください：
1. 「## 目標」セクション（箇条書き）
2. 「## 練習内容」セクション（番号付きリスト）
3. 「## 注意点」セクション（箇条書き）

異なる種類の練習（テクニック練習、表現練習、理論学習など）は、それぞれ別の練習メニューとして作成してください。`,
          response_mode: 'blocking',
          user: 'user'
        };
        
        console.log('フォールバックメソッドリクエストボディ:', JSON.stringify(completionRequestBody, null, 2));
        
        const completionResponse = await axios.post(
          `${DIFY_API_BASE_URL}/completion-messages`,
          completionRequestBody,
          {
            headers: {
              'Authorization': `Bearer ${PRACTICE_MENU_AI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        console.log('メソッド2 API応答:', {
          status: completionResponse.status,
          answer_length: completionResponse.data.answer?.length || 0
        });
        
        const rawContent = completionResponse.data.answer || '練習メニューを生成できませんでした。もう一度お試しください。';
        const practiceMenus = parsePracticeMenus(rawContent);
        
        return {
          practiceMenus,
          rawContent
        };
      } catch (fallbackError: any) {
        console.error('フォールバックメソッドも失敗しました:', fallbackError);
        throw new Error(`APIエラー: ${fallbackError.message}`);
      }
    }
    
    throw new Error(`APIエラー: ${error.message}`);
  }
};

// 練習メニューをパースする関数
const parsePracticeMenus = (content: string): PracticeMenu[] => {
  if (!content) return [];
  
  // 各練習メニューを分割（「# 」で始まる行で区切る）
  const menuBlocks = content.split(/(?=^# )/m).filter(block => block.trim().length > 0);
  
  return menuBlocks.map(block => {
    // タイトルを抽出（「# 」で始まる行）
    const titleMatch = block.match(/^# (.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : '練習メニュー';
    
    // 目標を抽出（「## 目標」セクション内の箇条書き）
    const goalsMatch = block.match(/## 目標\s*\n((?:[-*•]\s*.+\n?)+)/m);
    const goalsText = goalsMatch ? goalsMatch[1] : '';
    const goals = goalsText
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    // 練習内容を抽出（「## 練習内容」セクション内の番号付きリスト）
    const practiceItemsMatch = block.match(/## 練習内容\s*\n((?:\d+\.\s*.+\n?)+)/m);
    const practiceItemsText = practiceItemsMatch ? practiceItemsMatch[1] : '';
    const practiceItems = practiceItemsText
      .split('\n')
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0);
    
    // 注意点を抽出（「## 注意点」セクション内の箇条書き）
    const notesMatch = block.match(/## 注意点\s*\n((?:[-*•]\s*.+\n?)+)/m);
    const notesText = notesMatch ? notesMatch[1] : '';
    const notes = notesText
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0);
    
    return {
      title,
      goals,
      practiceItems,
      notes
    };
  });
};

// チャット履歴からトピックを抽出するヘルパー関数
function extractTopicsFromChatHistory(chatHistory: ChatMessage[]): string[] {
  // 単純な実装: ユーザーメッセージから頻出単語を抽出
  const userMessages = chatHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content);
  
  // 全てのユーザーメッセージを結合
  const allText = userMessages.join(' ');
  
  // 音楽関連の一般的なキーワードリスト
  const musicKeywords = [
    'スケール', 'アルペジオ', 'コード', 'リズム', 'テンポ', '表現', 'テクニック',
    'ソルフェージュ', '音程', '和声', '楽譜', '練習', 'レッスン', '演奏', '音色',
    'フレーズ', 'メロディ', '即興', '理論', '曲', '作曲', '編曲'
  ];
  
  // テキスト内に出現するキーワードを抽出
  const foundTopics = musicKeywords.filter(keyword => 
    allText.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // トピックが見つからない場合のデフォルト値
  return foundTopics.length > 0 ? foundTopics : ['音楽練習', '演奏技術'];
}
