/**
 * Gemini API 連携モジュール
 * 
 * Google Gemini APIを使用してタグを生成する機能を提供します。
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiApiKeyParam } from './config';
import { onInit } from 'firebase-functions/v2';

/**
 * タグ生成結果の型
 */
export interface TagResult {
  success: boolean;
  tags: string[];
  error?: string;
}

// Gemini APIクライアントの変数宣言
let genAI: GoogleGenerativeAI;

// 初期化関数
onInit(() => {
  // Gemini APIクライアントの初期化（実行時に行われる）
  genAI = new GoogleGenerativeAI(geminiApiKeyParam.value());
  console.log('Gemini API初期化完了:', { apiKeyExists: !!geminiApiKeyParam.value() });
});

/**
 * サマリーからタグを生成する
 * 
 * @param summary レッスンの要約テキスト
 * @param instrumentName 楽器名
 * @returns 生成されたタグと結果
 */
export async function generateTags(summary: string, instrumentName: string): Promise<TagResult> {
  try {
    // summaryパラメータのチェック
    if (!summary) {
      console.error('サマリーが提供されていません');
      return {
        success: false,
        tags: [],
        error: 'サマリーがnullまたはundefinedです'
      };
    }

    // APIキーチェック
    if (!geminiApiKeyParam.value()) {
      console.error('Gemini APIキーが設定されていません');
      return {
        success: false,
        tags: [],
        error: 'APIキーが設定されていません'
      };
    }

    // genAIが初期化されていない場合は初期化
    if (!genAI) {
      genAI = new GoogleGenerativeAI(geminiApiKeyParam.value());
    }

    console.log('Gemini APIでタグ生成開始:', { 
      summaryLength: summary.length, 
      instrument: instrumentName 
    });

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

3. タグの種類と例:
- 音楽理論: 「和音」「音階」「調性」「コード」「転調」「即興」「テンション」「リズム」
- 演奏技術: 「レガート」「スタッカート」「ビブラート」「アーティキュレーション」「運指」「呼吸」
- 音楽表現: 「フレージング」「ダイナミクス」「ニュアンス」「音色」「表現」「強弱」
- 音楽形式: 「ソナタ」「協奏曲」「前奏曲」「変奏曲」「即興」「フュージョン」「ジャズ」
- 練習方法: 「基礎」「エチュード」「反復」「テクニック」「スケール」「トレーニング」

4. タグ選定のプロセス:
- まず文章全体を読み、最も頻繁に言及されているキーワードをリストアップする
- 次に、レッスンの主要な目的や焦点となっている概念を特定する
- 上記を総合的に判断し、最も重要度の高い3つのタグを選定する
- 楽器が特定されている場合でも、他の楽器のレッスンにも応用できる普遍的な概念を優先する

レッスン内容:
${summary}

楽器: ${instrumentName}（参考情報として使用し、タグは汎用的なものを選択してください）

以下の形式でJSON形式で3つのタグのみを返してください:
{"tags": ["タグ1", "タグ2", "タグ3"]}
`;

    // Gemini APIを呼び出す
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    console.log('Gemini API応答受信:', { 
      responseTextLength: responseText.length
    });

    // レスポンスからJSONを抽出
    let tags: string[] = [];
    try {
      // JSONブロックを抽出
      const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData.tags)) {
          tags = parsedData.tags
            .filter((tag: any) => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag: string) => {
              // "G:"や他のプレフィックスを削除
              return tag.trim().replace(/^[A-Z]:\s*/, '').replace(/^G:\s*/, '');
            });
          
          console.log('Gemini APIから抽出したタグ:', tags);
        }
      }
    } catch (parseError) {
      console.error('Gemini API応答のJSON解析エラー:', parseError);
    }

    // タグが3つより少ない場合、フォールバック処理
    if (tags.length < 3) {
      console.log(`Gemini APIから十分なタグが取得できませんでした(${tags.length}/3)。フォールバック処理を適用します。`);
      
      // プロンプトに合わせたフォールバック用の音楽関連タグリスト
      const fallbackTags = {
        // 作曲家（プロンプトに合わせる）
        composers: ['ショパン', 'ベートーヴェン', 'バッハ', 'モーツァルト', 'ドビュッシー', 'ブラームス'],
        
        // 曲名（プロンプトに合わせる）
        musicForms: ['ノクターン', 'コンチェルト', 'ソナタ', 'エチュード', 'バラード', '前奏曲'],
        
        // 演奏技術（プロンプトに合わせる）
        techniques: ['レガート', 'スタッカート', 'ビブラート', 'ピッキング', 'トリル', 'スラー'],
        
        // 音楽表現（プロンプトに合わせる）
        expressions: ['フレージング', 'アーティキュレーション', 'リズム', 'ダイナミクス', 'テンポ', '表現'],
        
        // 音楽理論（プロンプトに合わせる）
        theory: ['和音', '音階', '調性', 'コード', '転調', '終止形']
      };
      
      // サマリーから意味のある単語を抽出する代わりに、各カテゴリからバランスよく選択する
      const categories = Object.keys(fallbackTags) as Array<keyof typeof fallbackTags>;
      
      // 楽器に関連する可能性が高いカテゴリを優先
      let priorityCategories: (keyof typeof fallbackTags)[] = [];
      
      switch(instrumentName.toLowerCase()) {
        case 'ピアノ':
          priorityCategories = ['techniques', 'expressions', 'theory'];
          break;
        case 'ギター':
        case 'ベース':
          priorityCategories = ['techniques', 'expressions', 'theory'];
          break;
        case 'バイオリン':
        case 'チェロ':
        case 'ビオラ':
          priorityCategories = ['techniques', 'expressions', 'composers'];
          break;
        case 'ボーカル':
        case '歌':
          priorityCategories = ['expressions', 'techniques', 'musicForms'];
          break;
        default:
          priorityCategories = ['techniques', 'expressions', 'theory'];
      }
      
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
    }
    
    // 最終的に3つのタグのみになるよう調整
    tags = tags.slice(0, 3);
    
    console.log('最終的なタグ:', tags);
    
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
