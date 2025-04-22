/**
 * GenKit/OpenAI連携モジュール
 */
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { FUNCTION_REGION } from '../config';
import { getOpenAIApiKey } from '../common/secret';
import * as logger from 'firebase-functions/logger';
import axios from 'axios';
import { getFirestore } from 'firebase-admin/firestore';
import { PracticeMenu, PracticeStep, DifficultyLevel, PracticeCategory } from './models';
import * as admin from 'firebase-admin';

// Firestore インスタンスを取得
const db = getFirestore();

/**
 * 関数の入力引数の型定義
 */
interface GeneratePracticeRecommendationArgs {
  practiceTheme: string;
  instrument?: string;
  level?: DifficultyLevel;
}

/**
 * OpenAI APIとの連携テスト
 */
export const testOpenAIConnection = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request) => {
    // 管理者権限チェック
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        '認証が必要です'
      );
    }

    // TODO: 本番環境では管理者チェックを実装
    // if (!isUserAdmin(request.auth.uid)) {
    //   throw new HttpsError(
    //     'permission-denied',
    //     '管理者権限が必要です'
    //   );
    // }

    try {
      logger.info('OpenAI API接続テスト開始');
      
      // APIキー取得
      const apiKey = await getOpenAIApiKey();
      
      if (!apiKey) {
        throw new Error('OpenAI APIキーの取得に失敗しました');
      }
      
      // OpenAI APIテスト呼び出し
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: '練習メニュー生成システムのテストです。'
            },
            {
              role: 'user',
              content: '接続テスト。簡単な応答を返してください。'
            }
          ],
          max_tokens: 50
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      logger.info('OpenAI API接続テスト成功');
      
      return {
        success: true,
        message: 'OpenAI APIとの接続テストに成功しました',
        response: response.data.choices[0].message.content
      };
    } catch (error) {
      logger.error('OpenAI API接続テストエラー:', error);
      throw new HttpsError(
        'internal',
        'OpenAI APIとの接続テストに失敗しました',
        error
      );
    }
  });

/**
 * レッスン要約からキーワードを抽出する関数
 */
async function extractKeywordsFromSummary(summary: string): Promise<string[]> {
  try {
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      logger.error('OpenAI APIキーが設定されていません');
      return ['基礎練習', 'テクニック', '練習', '音階'];
    }

    logger.info('OpenAI APIを使用してキーワード抽出開始');

    const prompt = `
      以下は音楽練習に関する内容です。この内容から、練習メニューを推薦するための重要なキーワードを5-10個抽出してください。
      キーワードは音楽練習に関連するものを優先し、技術的な用語や具体的な練習内容を抽出してください。
      カンマ区切りのリストで返してください。
      
      内容:
      ${summary}
      
      キーワード:
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: '音楽の練習内容と目標から重要なキーワードを抽出するアシスタントです。楽器の技術や練習方法に関するキーワードを優先的に抽出します。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 100
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const keywordsText = response.data.choices[0].message.content.trim();
    const keywords = keywordsText.split(/,\s*/).filter(Boolean);
    logger.info('抽出されたキーワード:', keywords);
    return keywords;

  } catch (error) {
    logger.error('キーワード抽出エラー:', error);
    
    // エラーの詳細をログに記録
    if (error instanceof Error) {
      logger.error(`エラー詳細: ${error.message}`);
      if ('response' in error && error.response) {
        const anyError = error as any;
        logger.error(`APIレスポンス: ${JSON.stringify(anyError.response?.data || {})}`);
      }
    }
    
    logger.info('デフォルトのキーワードを使用します');
    // エラー時はデフォルトのキーワードを返す
    return ['基礎練習', 'テクニック', '練習', '音階'];
  }
}

/**
 * キーワードに基づいて練習メニューの関連スコアを計算する関数
 */
function calculateRelevanceScore(
  menu: PracticeMenu,
  keywords: string[],
  instrument: string,
  level: DifficultyLevel
): number {
  let score = 0;
  
  // タイトルと説明内のキーワードマッチ
  for (const keyword of keywords) {
    // タイトル内のキーワードマッチ（高いウェイト）
    if (menu.title.toLowerCase().includes(keyword.toLowerCase())) {
      score += 3;
    }
    
    // 説明内のキーワードマッチ
    if (menu.description && menu.description.toLowerCase().includes(keyword.toLowerCase())) {
      score += 2;
    }
    
    // タグ内のキーワードマッチ
    if (menu.tags) {
      for (const tag of menu.tags) {
        if (tag.toLowerCase().includes(keyword.toLowerCase()) || 
            keyword.toLowerCase().includes(tag.toLowerCase())) {
          score += 2;
        }
      }
    }
    
    // ステップ内のキーワードマッチ
    if (menu.steps) {
      for (const step of menu.steps) {
        if (step.description.toLowerCase().includes(keyword.toLowerCase())) {
          score += 1;
        }
      }
    }
  }
  
  // 楽器の一致（重要）
  if (menu.instrument === instrument) {
    score += 5;
  }
  
  // 難易度の一致
  if (menu.difficulty === level) {
    score += 2;
  } else if (
    (menu.difficulty === DifficultyLevel.INTERMEDIATE && 
     (level === DifficultyLevel.BEGINNER || level === DifficultyLevel.ADVANCED)) ||
    ((menu.difficulty === DifficultyLevel.BEGINNER || menu.difficulty === DifficultyLevel.ADVANCED) && 
     level === DifficultyLevel.INTERMEDIATE)
  ) {
    // 難易度が1段階違うだけの場合
    score += 1;
  }
  
  return score;
}

/**
 * 既存の練習メニューからレコメンデーションを検索する関数
 * @param lessonSummary 検索キーワードとなるテキスト（レッスン要約やユーザーの具体的な目標）
 * @param instrument 楽器ID
 * @param level 難易度（省略可）
 * @param limit 取得する結果の数（デフォルト10）
 */
async function searchPracticeMenuRecommendations(
  lessonSummary: string,
  instrument: string,
  level: DifficultyLevel = DifficultyLevel.INTERMEDIATE,
  limit: number = 10
): Promise<PracticeMenu[]> {
  try {
    // 要約からキーワードを抽出
    const keywords = await extractKeywordsFromSummary(lessonSummary);
    
    // キーワードが取得できなかった場合のデフォルト値
    if (!keywords || keywords.length === 0) {
      logger.warn('キーワードが抽出できませんでした。デフォルトのキーワードを使用します。');
      keywords.push('基礎練習', 'テクニック');
    }
    
    logger.info(`検索キーワード: ${keywords.join(', ')}`);
    
    // Firestoreから練習メニューを検索
    const menus: PracticeMenu[] = [];
    
    // 階層構造に合わせて検索: practiceMenus > 楽器別 > カテゴリ別 > 各練習メニュー
    const instrumentRef = db.collection('practiceMenus').doc(instrument);
    const instrumentDoc = await instrumentRef.get();
    
    if (!instrumentDoc.exists) {
      logger.warn(`指定された楽器「${instrument}」の練習メニューが見つかりませんでした`);
      return [];
    }
    
    // その楽器の全カテゴリを取得
    const categoriesSnapshot = await instrumentRef.collection('categories').get();
    
    if (categoriesSnapshot.empty) {
      logger.warn(`楽器「${instrument}」のカテゴリが見つかりませんでした`);
      return [];
    }
    
    // 各カテゴリ内のメニューを取得
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.id;
      logger.info(`カテゴリ「${categoryName}」のメニューを検索中...`);
      
      const menusSnapshot = await categoryDoc.ref.collection('menus').get();
      
      if (menusSnapshot.empty) {
        logger.info(`カテゴリ「${categoryName}」にメニューはありません`);
        continue;
      }
      
      // 各メニューを取得してリストに追加
      for (const menuDoc of menusSnapshot.docs) {
        const menuData = menuDoc.data() as PracticeMenu;
        
        // sheetMusicサブコレクションからURLを取得
        try {
          // サブコレクションからシートミュージックデータを取得
          const sheetMusicSnapshot = await menuDoc.ref.collection('sheetMusic').doc('default').get();
          
          if (sheetMusicSnapshot.exists) {
            const sheetMusicData = sheetMusicSnapshot.data();
            // imageUrlフィールドをsheetMusicUrlとして設定
            if (sheetMusicData && sheetMusicData.imageUrl) {
              menuData.sheetMusicUrl = sheetMusicData.imageUrl;
              logger.info(`メニュー「${menuData.title}」の楽譜URL取得成功: ${menuData.sheetMusicUrl?.substring(0, 50) || ''}...`);
            } else {
              logger.info(`メニュー「${menuData.title}」に楽譜URLがありません`);
            }
          } else {
            logger.info(`メニュー「${menuData.title}」に楽譜データがありません`);
          }
        } catch (error) {
          logger.warn(`メニュー「${menuData.title}」の楽譜URL取得エラー:`, error);
        }
        
        menus.push({
          ...menuData,
          id: menuDoc.id,
          category: categoryName // カテゴリ情報を追加
        });
      }
    }
    
    logger.info(`取得した練習メニュー数: ${menus.length}`);
    
    // 数値難易度によるフィルタリング
    let minLevel = 0, maxLevel = 100;
    switch (level) {
      case DifficultyLevel.BEGINNER:
        minLevel = 0; maxLevel = 40; break;
      case DifficultyLevel.INTERMEDIATE:
        minLevel = 30; maxLevel = 70; break;
      case DifficultyLevel.ADVANCED:
        minLevel = 60; maxLevel = 100; break;
    }
    const filteredMenus = menus.filter(menu => {
      const diffVal = typeof menu.difficulty === 'number' ? menu.difficulty : Number(menu.difficulty);
      return diffVal >= minLevel && diffVal <= maxLevel;
    });
    logger.info(`難易度フィルタ後のメニュー数: ${filteredMenus.length}/${menus.length}`);
    if (filteredMenus.length === 0) {
      logger.warn(`指定レベル(${level})の範囲内に合致するメニューが見つかりませんでした`);
      return [];
    }

    // 関連スコアに基づいてメニューをソート
    const scoredMenus = filteredMenus.map(menu => ({
      menu,
      score: calculateRelevanceScore(menu, keywords, instrument, level)
    }));
    
    scoredMenus.sort((a, b) => b.score - a.score);
    
    // 常に指定された件数（デフォルト3件）を返す
    // 結果が指定件数より少ない場合は、すべての結果を返す
    const limitedMenus = scoredMenus.slice(0, Math.min(limit, scoredMenus.length)).map(item => item.menu);
    logger.info(`返却する練習メニュー数: ${limitedMenus.length}/${scoredMenus.length}`);
    
    // メニュー詳細ログ出力（デバッグ用）
    limitedMenus.forEach((menu, index) => {
      logger.info(`メニュー[${index}] 詳細:`, {
        id: menu.id,
        title: menu.title,
        category: menu.category,
        sheetMusicUrl: menu.sheetMusicUrl || '未設定',
        sheetMusicUrlType: menu.sheetMusicUrl ? typeof menu.sheetMusicUrl : 'undefined',
        stepsCount: menu.steps ? menu.steps.length : 0
      });
    });
    
    return limitedMenus;
    
  } catch (error) {
    logger.error('練習メニュー検索エラー:', error);
    // エラーをスローするのではなく空配列を返す
    return [];
  }
}

/**
 * 練習メニューを検索する
 * データベースに登録済みの既存の練習メニューを検索してユーザーに提供する機能。
 * AIを使用して新しい練習メニューを生成するのではなく、既存のメニューから最適なものを検索します。
 */
export const generatePracticeRecommendation = onCall({
  enforceAppCheck: false, // 本番環境ではtrueにする
  region: FUNCTION_REGION, // asia-northeast1を明示的に指定
}, async (request) => {
  try {
    // 受信データをログに出力
    logger.info('generatePracticeRecommendation: リクエスト受信', {
      data: request.data,
      auth: request.auth ? 'あり' : 'なし'
    });
    
    // パラメータを取得
    const practiceTheme = request.data?.practiceTheme || '';
    const instrument = request.data?.instrument || 'piano';
    const level = request.data?.level || '中級';
    const specificGoals = request.data?.specificGoals || '';
    
    logger.info('パラメータ解析完了', { 
      practiceTheme, 
      instrument,
      level,
      specificGoals
    });
    
    // 難易度をEnumに変換
    let difficultyLevel: DifficultyLevel;
    switch (level) {
      case '初級':
        difficultyLevel = DifficultyLevel.BEGINNER;
        break;
      case '上級':
        difficultyLevel = DifficultyLevel.ADVANCED;
        break;
      case '中級':
      default:
        difficultyLevel = DifficultyLevel.INTERMEDIATE;
        break;
    }

    // 検索キーワードの作成（practiceThemeとspecificGoalsを組み合わせる）
    const searchText = [practiceTheme, specificGoals].filter(Boolean).join(' ');
    logger.info(`検索テキスト作成: "${searchText}"`);

    // Firestoreから関連する練習メニューを検索 - 楽器IDをそのまま使用
    logger.info(`Firestoreからの練習メニュー検索開始 (楽器ID: ${instrument})`);
    const existingMenus = await searchPracticeMenuRecommendations(
      searchText,
      instrument,
      difficultyLevel,
      10 // 最大10件まで取得するように変更
    );
    logger.info(`Firestoreから${existingMenus.length}件の練習メニューを取得`);

    // キーワードを抽出（ログ目的）
    const keywords = await extractKeywordsFromSummary(searchText);
    logger.info(`抽出されたキーワード: ${keywords.join(', ')}`);

    if (existingMenus.length === 0) {
      logger.warn('適切な練習メニューが見つかりませんでした');
      return {
        success: false,
        recommendations: [],
        message: '適切な練習メニューが見つかりませんでした',
        debug: {
          receivedTheme: practiceTheme?.substring(0, 30),
          receivedInstrument: instrument,
          receivedLevel: level,
          receivedGoals: specificGoals?.substring(0, 30),
          keywordsUsed: keywords
        }
      };
    }
    
    // 成功レスポンス
    return {
      success: true,
      recommendations: existingMenus,
      message: '練習メニューを検索しました',
      debug: {
        receivedTheme: practiceTheme?.substring(0, 30),
        receivedInstrument: instrument,
        receivedLevel: level,
        receivedGoals: specificGoals?.substring(0, 30),
        keywordsUsed: keywords,
        foundMenus: existingMenus.length
      }
    };
  } catch (error) {
    logger.error('練習メニュー生成エラー:', error);
    
    return {
      success: false,
      recommendations: [],
      message: 'エラーが発生しました',
      error: error instanceof Error ? error.message : '未知のエラー',
      debug: {
        timestamp: new Date().toISOString()
      }
    };
  }
}); 

// 新規: レッスン詳細画面のAIサマリーからタスクを生成するCloud Functionを追加
export const generateTasksFromLesson = onCall({
  enforceAppCheck: false, // 本番環境ではtrueに設定
  region: FUNCTION_REGION,
}, async (request) => {
  // 認証チェック
  if (!request.auth) {
    throw new HttpsError('unauthenticated', '認証が必要です');
  }
  const userId = request.auth.uid;
  // パラメータ取得
  const {
    lessonId,
    aiSummary,
    tags,
    instrument,
    difficulty
  } = request.data as {
    lessonId: string;
    aiSummary: string;
    tags: string[];
    instrument: string;
    difficulty?: string;
  };
  logger.info('generateTasksFromLesson: リクエスト受信', { userId, lessonId, instrument, difficulty, tags });

  // 難易度をEnumに変換
  let level: DifficultyLevel;
  switch (difficulty) {
    case DifficultyLevel.BEGINNER:
    case '初級':
      level = DifficultyLevel.BEGINNER;
      break;
    case DifficultyLevel.ADVANCED:
    case '上級':
      level = DifficultyLevel.ADVANCED;
      break;
    default:
      level = DifficultyLevel.INTERMEDIATE;
      break;
  }

  // Firestoreから練習メニューを検索（最大5件）
  const menus = await searchPracticeMenuRecommendations(aiSummary, instrument, level, 5);

  // レスポンスを返却
  return { menus };
}); 