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
以下は楽器レッスンの要約です。この内容から重要なキーワードを3つ抽出してください。
各キーワードは単語単位（1〜2単語まで）で、レッスン内容で最も重要な要素を表すものにしてください。

楽器の種類: ${instrumentName}

要約テキスト:
${text.length > 3000 ? text.substring(0, 3000) + '...(省略)' : text}

回答は以下のようなJSONフォーマットで返してください:

{
  "tags": ["タグ1", "タグ2", "タグ3"]
}

必ず3つのタグを生成してください。各タグは単語または短いフレーズで、日本語で表してください。
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
        if (Array.isArray(jsonData.tags) && jsonData.tags.length > 0) {
          // 最大3つのタグを返す
          return {
            success: true,
            tags: jsonData.tags.slice(0, 3)
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
        // タグが3つ未満の場合は楽器名などで補う
        const tags = [...extractedTags];
        while (tags.length < 3) {
          if (!tags.includes(instrumentName)) {
            tags.push(instrumentName);
          } else if (!tags.includes('レッスン')) {
            tags.push('レッスン');
          } else {
            tags.push('練習');
            break;
          }
        }
        
        return {
          success: true,
          tags: tags.slice(0, 3) // 最大3つまでに制限
        };
      }
    }
    
    // タグを見つけられなかった場合
    console.warn('[Gemini] タグを抽出できませんでした:', textResponse);
    return {
      success: false,
      tags: [instrumentName, 'レッスン', '音楽'],
      error: 'タグを生成できませんでした'
    };
    
  } catch (error) {
    console.error('[Gemini] タグ生成エラー:', error);
    return {
      success: false,
      tags: [instrumentName, 'レッスン', '音楽'],
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}
