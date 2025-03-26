import axios from 'axios';

// APIの設定
// 注: これらは環境変数として管理することをお勧めします
const DIFY_API_BASE_URL = 'https://api.dify.ai/v1';
const PRACTICE_MENU_API_KEY = 'your_dify_api_key'; // 実際のAPIキーに置き換えてください

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
          'Authorization': `Bearer ${PRACTICE_MENU_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // APIレスポンスのパース
    return parseDifyResponse(response.data);
  } catch (error) {
    console.error('練習メニューAPI エラー:', error);
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