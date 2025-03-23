/**
 * Gemini APIクライアント
 * 
 * Gemini APIを使用してタグ生成を行う
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './config';

/**
 * タグ生成結果の型
 */
interface TagResult {
  success: boolean;
  tags: string[];
  error?: string;
}

/**
 * 文字起こしからタグを生成する関数
 */
export async function generateTags(
  text: string, 
  instrumentName: string
): Promise<TagResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || geminiApiKey.value();
    
    if (!apiKey) {
      throw new Error('Gemini API Key が設定されていません');
    }
    
    // Gemini APIクライアントを初期化
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // タグ生成のためのプロンプト
    const prompt = `
以下は楽器レッスンの文字起こしです。この内容を表すタグを5～10個生成してください。
楽器の種類: ${instrumentName}

文字起こし:
${text.length > 3000 ? text.substring(0, 3000) + '...(省略)' : text}

タグとしては、レッスンで扱われた楽曲名、テクニック、音楽用語、レベル、感情表現などが適切です。
回答は以下のようなJSONフォーマットで返してください:

{
  "tags": ["タグ1", "タグ2", "タグ3", ...]
}

タグは単語または短いフレーズにし、それぞれ日本語で20文字以内にしてください。
`;
    
    // Gemini APIを呼び出し
    const result = await model.generateContent(prompt);
    const response = result.response;
    const textResponse = response.text();
    
    // JSONを抽出して解析
    const jsonMatch = textResponse.match(/{[\s\S]*?}/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[0]);
        if (Array.isArray(jsonData.tags)) {
          return {
            success: true,
            tags: jsonData.tags.slice(0, 15) // 最大15個までに制限
          };
        }
      } catch (parseError) {
        console.error('[Gemini] JSONパース失敗:', parseError);
      }
    }
    
    // JSONが取得できなかった場合は正規表現でタグを抽出
    const tagMatches = textResponse.match(/「([^」]+)」|"([^"]+)"|『([^』]+)』|'([^']+)'|タグ[：:]\s*([^\n,]+)/g);
    if (tagMatches) {
      const extractedTags = tagMatches
        .map(tag => tag.replace(/[「」『』""'':：タグ\s]/g, ''))
        .filter(tag => tag.length > 0 && tag.length <= 20);
      
      if (extractedTags.length > 0) {
        return {
          success: true,
          tags: extractedTags.slice(0, 15) // 最大15個までに制限
        };
      }
    }
    
    // タグを見つけられなかった場合
    console.warn('[Gemini] タグを抽出できませんでした:', textResponse);
    return {
      success: false,
      tags: [],
      error: 'タグを生成できませんでした'
    };
    
  } catch (error) {
    console.error('[Gemini] タグ生成エラー:', error);
    return {
      success: false,
      tags: [],
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}
