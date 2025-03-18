import axios from 'axios';
import { getDifyConfig } from './userProfileService';

// Dify APIの設定
// 注: これらは環境変数として管理することをお勧めします
const DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
const PRACTICE_MENU_AI_API_KEY = 'your_dify_api_key'; // 実際のAPIキーに置き換えてください

// フォールバック用のAPIキー（将来的に削除）
const LESSON_AI_API_KEY = process.env.EXPO_PUBLIC_DIFY_LESSON_API_KEY || '';
const PRACTICE_MENU_AI_API_KEY_FALLBACK = process.env.EXPO_PUBLIC_DIFY_PRACTICE_MENU_API_KEY || '';

// フォールバック用のAPP ID（将来的に削除）
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

// ユーザー設定に基づいてAPIキーとAPP IDを取得
const getDifySettings = async (): Promise<{ apiKey: string; appId: string }> => {
  try {
    // ユーザープロファイルからDify設定を取得
    const difyConfig = await getDifyConfig();
    
    if (difyConfig && difyConfig.apiKey && difyConfig.appId) {
      return {
        apiKey: difyConfig.apiKey,
        appId: difyConfig.appId
      };
    }
    
    // フォールバック（ユーザー設定が取得できなかった場合や設定が不完全な場合）
    console.warn('ユーザー設定からDify設定が取得できなかったため、デフォルト設定を使用します');
    return {
      apiKey: LESSON_AI_API_KEY,
      appId: LESSON_APP_ID
    };
  } catch (error) {
    console.error('Dify設定の取得に失敗しました:', error);
    
    // エラー時はフォールバック
    return {
      apiKey: LESSON_AI_API_KEY,
      appId: LESSON_APP_ID
    };
  }
};

// レッスンAIとのチャット
export const sendMessageToLessonAI = async (
  message: string, 
  conversationId?: string
): Promise<{ 
  answer: string; 
  conversationId: string; 
}> => {
  try {
    // ユーザー設定に基づいたDify設定を取得
    const { apiKey } = await getDifySettings();
    
    console.log('Dify API呼び出し:', {
      url: `${DIFY_API_BASE_URL}/chat-messages`,
      apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'なし',
      message,
      conversationId
    });

    if (!apiKey) {
      throw new Error('Dify APIキーが設定されていません。.envファイルまたはユーザー設定を確認してください。');
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
          'Authorization': `Bearer ${apiKey}`,
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

// 練習メニュー生成のためのDify設定を取得
const getPracticeMenuDifySettings = async (): Promise<{ apiKey: string }> => {
  // 練習メニュー生成のために特定のAPIキーを取得（ここでは固定のAPIキーを使用）
  return {
    apiKey: PRACTICE_MENU_AI_API_KEY_FALLBACK
  };
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

    // 練習メニュー生成用の設定を取得
    const { apiKey } = await getPracticeMenuDifySettings();

    console.log('練習メニュー生成API呼び出し:', {
      apiKey: apiKey.substring(0, 10) + '...',
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
          'Authorization': `Bearer ${apiKey}`,
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
        
        // 練習メニュー生成用の設定を取得
        const { apiKey } = await getPracticeMenuDifySettings();
        
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
              'Authorization': `Bearer ${apiKey}`,
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
      } catch (fallbackError) {
        console.error('フォールバックメソッドでも失敗しました:', fallbackError);
        throw fallbackError;
      }
    }
    
    throw error;
  }
};

// 練習メニューのパース処理
const parsePracticeMenus = (content: string): PracticeMenu[] => {
  // content の例:
  // # テクニック練習
  // ## 目標
  // - 明瞭なタンギングの習得
  // ## 練習内容
  // 1. スケール練習
  // ## 注意点
  // - 音が途切れないように注意

  const practiceMenus: PracticeMenu[] = [];
  const menuSections = content.split(/(?=# )/g);
  
  for (const section of menuSections) {
    if (!section.trim()) continue;
    
    const titleMatch = section.match(/# (.*)/);
    const title = titleMatch ? titleMatch[1].trim() : '無題のメニュー';
    
    const goalsSection = section.match(/## 目標([\s\S]*?)(?=##|$)/);
    const goals = goalsSection 
      ? goalsSection[1].split(/\n-/).slice(1).map(g => g.trim()).filter(Boolean)
      : [];
    
    const practiceItemsSection = section.match(/## 練習内容([\s\S]*?)(?=##|$)/);
    const practiceItems = practiceItemsSection
      ? practiceItemsSection[1].split(/\n\d+\./).slice(1).map(p => p.trim()).filter(Boolean)
      : [];
    
    const notesSection = section.match(/## 注意点([\s\S]*?)(?=##|$)/);
    const notes = notesSection
      ? notesSection[1].split(/\n-/).slice(1).map(n => n.trim()).filter(Boolean)
      : [];
    
    practiceMenus.push({
      title,
      goals,
      practiceItems,
      notes
    });
  }
  
  return practiceMenus;
};

// チャット履歴からトピックを抽出
function extractTopicsFromChatHistory(chatHistory: ChatMessage[]): string[] {
  const allText = chatHistory.map(msg => msg.content).join(' ');
  
  // 音楽関連の重要キーワードのリスト
  const keywords = [
    'タンギング', 'アーティキュレーション', 'リズム', '音色', '表現', 'ビブラート',
    'テンポ', 'ダイナミクス', '音程', 'スラー', 'スタッカート', 'レガート',
    '呼吸', 'ブレス', 'フレージング', '音階', 'スケール', 'テクニック',
    '練習', 'エチュード', '曲', '楽譜', '指使い', 'ポジション',
    'トリル', 'ロングトーン'
  ];
  
  // 出現するキーワードをカウント
  const topicCounts: { [topic: string]: number } = {};
  
  for (const keyword of keywords) {
    const regex = new RegExp(keyword, 'gi');
    const matches = allText.match(regex);
    if (matches) {
      topicCounts[keyword] = matches.length;
    }
  }
  
  // カウント数でソートしてトップ3を返す
  return Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(entry => entry[0]);
}

// 練習メニュー生成のためのリクエスト型定義
export interface PracticeMenuRequest {
  instrument: string;      // 楽器の種類
  skill_level: string;     // 初心者、中級者、上級者など
  practice_duration: number; // 練習時間（分）
  focus_areas?: string[];  // 重点を置きたい分野（音色、リズム、表現力など）
  specific_goals?: string; // 具体的な目標があれば
}

// 生成された練習メニューの型定義
export interface PracticeMenuItem {
  title: string;           // 練習項目のタイトル
  description: string;     // 詳細説明
  duration: number;        // 目安時間（分）
  category?: string;       // カテゴリ（ロングトーン、音階、曲練習など）
}

export interface PracticeMenuResponse {
  practice_menu: PracticeMenuItem[];
  summary: string;         // メニュー全体の概要
}

/**
 * Dify APIを使用して練習メニューを生成する
 */
export const generatePracticeMenu = async (request: PracticeMenuRequest): Promise<PracticeMenuResponse> => {
  try {
    // ユーザーのリクエストからプロンプトを生成
    const prompt = createPromptFromRequest(request);
    
    // Dify APIにリクエスト
    const response = await axios.post(
      `${DIFY_API_BASE_URL}/chat-messages`,
      {
        inputs: {
          prompt: prompt
        },
        query: prompt,
        response_mode: 'blocking',
        user: 'anonymous'
      },
      {
        headers: {
          'Authorization': `Bearer ${PRACTICE_MENU_AI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // APIレスポンスのパース
    return parseDifyResponse(response.data);
  } catch (error) {
    console.error('Dify API エラー:', error);
    throw new Error('練習メニューの生成に失敗しました');
  }
};

/**
 * ユーザーのリクエストから適切なプロンプトを生成
 */
const createPromptFromRequest = (request: PracticeMenuRequest): string => {
  const { instrument, skill_level, practice_duration, focus_areas, specific_goals } = request;
  
  let prompt = `${instrument}の${skill_level}向けの、${practice_duration}分間の練習メニューを作成してください。`;
  
  if (focus_areas && focus_areas.length > 0) {
    prompt += ` 特に${focus_areas.join('、')}に重点を置いてください。`;
  }
  
  if (specific_goals) {
    prompt += ` 目標: ${specific_goals}`;
  }
  
  prompt += ` 各練習項目には、タイトル、詳細な説明、目安時間（分）、カテゴリ（ロングトーン、音階、曲練習などから選択）を含めてください。JSON形式で返してください。`;
  
  return prompt;
};

/**
 * Dify APIのレスポンスをパースして使いやすい形式に変換
 */
const parseDifyResponse = (response: any): PracticeMenuResponse => {
  try {
    // レスポンスからJSONを抽出（通常はmarkdown形式のJSONとして返されることが多い）
    const content = response.answer || '';
    const jsonMatch = content.match(/```json([\s\S]*?)```/) || content.match(/{[\s\S]*?}/);
    
    let jsonStr = '';
    if (jsonMatch) {
      jsonStr = jsonMatch[1] || jsonMatch[0];
    } else {
      jsonStr = content;
    }
    
    // 文字列からJSONをパース
    const cleanJsonStr = jsonStr.replace(/```json|```/g, '').trim();
    const data = JSON.parse(cleanJsonStr);
    
    // データのフォーマットを整える
    const practiceMenu: PracticeMenuItem[] = [];
    
    if (data.practice_menu && Array.isArray(data.practice_menu)) {
      data.practice_menu.forEach((item: any) => {
        practiceMenu.push({
          title: item.title || '無題の練習',
          description: item.description || '',
          duration: parseInt(item.duration) || 10,
          category: item.category || '一般練習'
        });
      });
    } else if (data.items && Array.isArray(data.items)) {
      // 代替のフォーマット
      data.items.forEach((item: any) => {
        practiceMenu.push({
          title: item.title || item.name || '無題の練習',
          description: item.description || item.details || '',
          duration: parseInt(item.duration) || parseInt(item.time) || 10,
          category: item.category || item.type || '一般練習'
        });
      });
    }
    
    return {
      practice_menu: practiceMenu,
      summary: data.summary || data.overview || '練習メニュー'
    };
  } catch (error) {
    console.error('レスポンスのパースエラー:', error);
    return {
      practice_menu: [],
      summary: '練習メニューの解析に失敗しました'
    };
  }
};
