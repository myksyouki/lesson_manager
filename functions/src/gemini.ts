/**
 * Gemini API 連携モジュール
 * 
 * Google Gemini APIを使用してタグ生成と補足機能を提供します。
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKey } from './index';

/**
 * タグ生成結果の型定義
 */
export interface TagResult {
  success: boolean;
  tags: string[];
  error?: string;
}

// Gemini APIクライアント
let genAI: GoogleGenerativeAI;

/**
 * Gemini APIクライアント初期化
 */
function initGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || geminiApiKey.value();
    
    if (!apiKey) {
      throw new Error('Gemini APIキーが設定されていません');
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
    console.log('Gemini API初期化完了');
  }
  
  return genAI;
}

/**
 * サマリーからタグを生成
 * 
 * @param summary レッスンの要約テキスト
 * @param instrumentName 楽器名
 * @returns 生成されたタグ情報
 */
export async function generateTags(summary: string, instrumentName: string): Promise<TagResult> {
  try {
    // パラメータチェック
    if (!summary) {
      console.error('サマリーが提供されていません');
      return {
        success: false,
        tags: [],
        error: 'サマリーが空です'
      };
    }

    // Gemini API初期化
    const genAI = initGeminiClient();
    console.log('タグ生成開始:', { summaryLength: summary.length, instrument: instrumentName });

    // Gemini 1.5 Flashモデルを使用
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // タグ生成用のプロンプト
    const prompt = `
あなたは音楽レッスンの内容からタグを抽出する専門家です。以下の音楽レッスンの内容を分析し、関連するタグを抽出してください。

1. タグの条件:
- 必ず3つのタグを抽出すること（多くても少なくても不可）
- 各タグは単語1語のみで構成すること（複合語や句は不可）
- 全て日本語で出力すること

2. タグ選定の方針:
- 文脈を重視し、レッスン全体で繰り返し言及されているキーワードを優先すること
- レッスン内容の重要概念や核心となるスキル、テクニックを最優先すること
- 一般的な用語よりも、そのレッスンに特有の専門用語を優先すること
- 楽器の種類に関わらず、音楽教育全般に通じる重要概念を選ぶこと

レッスン内容:
${summary}

楽器: ${instrumentName}

以下の形式でJSON形式で3つのタグのみを返してください:
{"tags": ["タグ1", "タグ2", "タグ3"]}
`;

    // Gemini APIを呼び出す
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // レスポンスからJSONを抽出
    let tags: string[] = extractTagsFromResponse(responseText);
    
    // タグが3つより少ない場合、フォールバック処理
    if (tags.length < 3) {
      tags = applyFallbackTagGeneration(tags, instrumentName);
    }
    
    // 最終的に3つのタグのみになるよう調整
    tags = tags.slice(0, 3);
    
    console.log('生成されたタグ:', tags);
    
    return {
      success: true,
      tags
    };
    
  } catch (error) {
    console.error('Gemini APIでのタグ生成エラー:', error);
    
    // エラー時は空のタグ配列を返す
    return {
      success: false,
      tags: [],
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

/**
 * Gemini APIレスポンスからタグを抽出
 */
function extractTagsFromResponse(responseText: string): string[] {
  try {
    // JSONブロックを抽出
    const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[0];
      const parsedData = JSON.parse(jsonStr);
      
      if (Array.isArray(parsedData.tags)) {
        return parsedData.tags
          .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag: string) => {
            // プレフィックスを削除して整形
            return tag.trim().replace(/^[A-Z]:\s*/, '').replace(/^G:\s*/, '');
          });
      }
    }
    return [];
  } catch (parseError) {
    console.error('Gemini APIレスポンスの解析エラー:', parseError);
    return [];
  }
}

/**
 * タグが十分でない場合のフォールバック処理
 */
function applyFallbackTagGeneration(currentTags: string[], instrumentName: string): string[] {
  console.log(`十分なタグが取得できませんでした(${currentTags.length}/3)。フォールバック処理を適用します。`);
  
  // プロンプトに合わせたフォールバック用の音楽関連タグリスト
  const fallbackTags = {
    // 各カテゴリの代表的なタグ
    composers: ['ショパン', 'ベートーヴェン', 'バッハ', 'モーツァルト', 'ドビュッシー'],
    musicForms: ['ノクターン', 'コンチェルト', 'ソナタ', 'エチュード', 'バラード'],
    techniques: ['レガート', 'スタッカート', 'ビブラート', 'ピッキング', 'トリル'],
    expressions: ['フレージング', 'アーティキュレーション', 'リズム', 'ダイナミクス', 'テンポ'],
    theory: ['和音', '音階', '調性', 'コード', '転調']
  };
  
  const tags = [...currentTags];
  const categories = Object.keys(fallbackTags) as Array<keyof typeof fallbackTags>;
  
  // 楽器に関連する可能性が高いカテゴリを優先
  const priorityCategories: (keyof typeof fallbackTags)[] = getPriorityCategories(instrumentName);
  
  // 優先カテゴリから順にタグを追加
  for (const category of priorityCategories) {
    if (tags.length >= 3) break;
    
    const categoryTags = fallbackTags[category];
    const randomTag = categoryTags[Math.floor(Math.random() * categoryTags.length)];
    
    if (!tags.includes(randomTag)) {
      tags.push(randomTag);
    }
  }
  
  // それでも足りない場合は残りのカテゴリからランダムに選択
  while (tags.length < 3) {
    const remainingCategories = categories.filter(c => !priorityCategories.includes(c));
    if (remainingCategories.length === 0) break;
    
    const randomCategory = remainingCategories[Math.floor(Math.random() * remainingCategories.length)];
    const categoryTags = fallbackTags[randomCategory];
    const randomTag = categoryTags[Math.floor(Math.random() * categoryTags.length)];
    
    if (!tags.includes(randomTag)) {
      tags.push(randomTag);
    }
  }
  
  // それでも3つに満たない場合は、すべてのカテゴリから選択
  while (tags.length < 3) {
    const allTags = Object.values(fallbackTags).flat();
    const randomIndex = Math.floor(Math.random() * allTags.length);
    
    if (!tags.includes(allTags[randomIndex])) {
      tags.push(allTags[randomIndex]);
    }
  }
  
  return tags;
}

/**
 * 楽器に基づいた優先カテゴリを取得
 */
function getPriorityCategories(instrumentName: string): (keyof { 
  composers: string[]; 
  musicForms: string[]; 
  techniques: string[]; 
  expressions: string[]; 
  theory: string[]; 
})[] {
  const instrumentLower = instrumentName.toLowerCase();
  
  if (instrumentLower.includes('ピアノ') || instrumentLower.includes('piano')) {
    return ['techniques', 'expressions', 'theory'];
  }
  
  if (instrumentLower.includes('ギター') || instrumentLower.includes('guitar') || 
      instrumentLower.includes('ベース') || instrumentLower.includes('bass')) {
    return ['techniques', 'expressions', 'theory'];
  }
  
  if (instrumentLower.includes('バイオリン') || instrumentLower.includes('violin') || 
      instrumentLower.includes('チェロ') || instrumentLower.includes('cello') || 
      instrumentLower.includes('ビオラ') || instrumentLower.includes('viola')) {
    return ['techniques', 'expressions', 'composers'];
  }
  
  if (instrumentLower.includes('ボーカル') || instrumentLower.includes('vocal') || 
      instrumentLower.includes('歌') || instrumentLower.includes('voice')) {
    return ['expressions', 'techniques', 'musicForms'];
  }
  
  // デフォルト
  return ['techniques', 'expressions', 'theory'];
}
