import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";
import { getCurrentUserProfile } from "./userProfileService";

// 練習メニュー生成のためのリクエスト型定義
export interface PracticeMenuRequest {
  instrument: string;      // 楽器の種類
  skill_level: string;     // 初心者、中級者、上級者など
  practice_duration: number; // 練習時間（分）
  practice_content?: string; // 練習したい内容
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
 * Firebase Cloud Functionsを使用して練習メニューを生成する
 */
export const generatePracticeMenu = async (request: PracticeMenuRequest): Promise<PracticeMenuResponse> => {
  try {
    // リクエストからinstrumentが空の場合は、ユーザープロファイルから取得する
    if (!request.instrument) {
      const profile = await getCurrentUserProfile();
      if (profile && profile.selectedInstrument) {
        request.instrument = profile.selectedInstrument;
      } else {
        throw new Error('楽器情報が設定されていません。プロフィール設定から楽器を選択してください。');
      }
    }

    // Firebase Cloud Functionを呼び出す
    const generateMenuFunction = httpsCallable<PracticeMenuRequest, PracticeMenuResponse>(
      functions, 
      'generatePracticeMenu'
    );
    
    // Cloud Functionに渡すデータを準備
    const result = await generateMenuFunction(request);
    
    // 結果を返す（Cloud Functionのレスポンスはresult.dataに格納されている）
    return result.data;
    
  } catch (error: any) {
    console.error('練習メニュー生成エラー:', error);
    
    // エラーメッセージがある場合はそれを表示、なければ一般的なエラーメッセージ
    const errorMessage = error.message || '練習メニューの生成に失敗しました';
    throw new Error(errorMessage);
  }
};

/**
 * ローカルフォールバック用のプロンプト生成関数
 * 本番環境ではCloud Functionに移行するため、ここでは使用しない
 */
const createPromptFromRequest = (request: PracticeMenuRequest): string => {
  const { instrument, skill_level, practice_duration, practice_content, specific_goals } = request;
  
  let prompt = `${instrument}の${skill_level}向けの、${practice_duration}分間の練習メニューを作成してください。`;
  
  if (practice_content && practice_content.trim()) {
    prompt += ` 特に「${practice_content}」に重点を置いてください。`;
  }
  
  if (specific_goals) {
    prompt += ` 目標: ${specific_goals}`;
  }
  
  prompt += ` 各練習項目には、タイトル、詳細な説明、目安時間（分）、カテゴリ（ロングトーン、音階、曲練習などから選択）を含めてください。JSON形式で返してください。`;
  
  return prompt;
}; 