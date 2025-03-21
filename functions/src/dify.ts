/**
 * Dify API連携モジュール
 * 
 * Dify APIとの連携を担当するモジュールです。
 * APIリクエストとレスポンスの処理を実装します。
 */
import axios from 'axios';
import { DIFY_CONFIG } from './config';

/**
 * Dify APIからのレスポンス構造
 */
export interface DifyResponse {
  transcription: string;  // 文字起こし
  summary: string;        // 要約
  tags: string[];         // タグ
}

/**
 * サマリー生成結果の型
 */
export interface SummaryResult {
  success: boolean;
  summary: string;
  tags: string[];
  error?: string;
}

// Dify API設定（環境変数から読み込めるように拡張）
const DIFY_API_URL = DIFY_CONFIG.API_URL;
const DIFY_SUMMARY_API_KEY = DIFY_CONFIG.SUMMARY_API_KEY;
const DIFY_SUMMARY_API_ENDPOINT = `${DIFY_API_URL}/chat-messages`;

/**
 * Dify APIを呼び出す
 * 
 * @param audioUrl オーディオファイルのURL
 * @param lessonId レッスンID
 * @param userId ユーザーID
 * @param instrumentName 楽器名
 * @returns Dify APIレスポンス
 */
export async function callDifyAPI(
  audioUrl: string,
  lessonId: string,
  userId: string,
  instrumentName: string = 'standard'
): Promise<DifyResponse> {
  console.log('Dify API呼び出し開始:', {
    lessonId,
    instrumentName,
    audioUrlPrefix: audioUrl.substring(0, 30) + '...'
  });
  
  // APIリクエストデータを構築
  const apiUrl = `${DIFY_CONFIG.API_URL}/chat-messages`;
  
  const requestData = {
    inputs: {
      instrument: instrumentName,
      file_url: encodeURI(audioUrl),
      user_id: userId,
      lesson_id: lessonId
    },
    query: "この音声ファイルを文字起こししてください。",
    response_mode: "blocking",
    user: userId,
    conversation_id: ""
  };
  
  console.log('Dify APIリクエスト:', {
    url: apiUrl,
    apiKey: DIFY_CONFIG.SUMMARY_API_KEY.substring(0, 5) + '...',
    instrument: instrumentName
  });
  
  // 完全なリクエストデータをログに出力（機密情報は一部マスク）
  console.log('Dify APIリクエスト詳細:', {
    ...requestData,
    query: requestData.query
  });
  
  try {
    // APIリクエストを送信
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        "Authorization": `Bearer ${DIFY_CONFIG.SUMMARY_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 300000, // 5分のタイムアウト（ミリ秒）
    });
    
    // レスポンスのステータスコードをチェック
    if (response.status !== 200) {
      throw new Error(`Dify APIエラー: ステータスコード ${response.status}`);
    }
    
    console.log('Dify APIレスポンス受信:', {
      status: response.status,
      dataType: typeof response.data,
      dataLength: JSON.stringify(response.data).length
    });
    
    // レスポンスを解析
    return parseDifyResponse(response.data);
    
  } catch (error) {
    console.error('Dify API呼び出し中にエラーが発生しました:', error);
    
    // エラーの詳細情報を取得して記録
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
    }
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('Dify APIレスポンスエラー:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    throw new Error(`Dify API呼び出しエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * Dify APIレスポンスを解析する
 * 
 * @param data APIレスポンスデータ
 * @returns 解析されたレスポンス
 */
function parseDifyResponse(data: any): DifyResponse {
  let transcription = '';
  let summary = '';
  let tags: string[] = [];
  
  try {
    // レスポンスの形式によって処理を分岐
    if (data && data.answer) {
      const answer = data.answer;
      
      // JSONデータかどうかを確認して解析
      try {
        if (answer.startsWith('{') && answer.endsWith('}')) {
          const jsonData = JSON.parse(answer);
          transcription = jsonData.transcription || '';
          summary = jsonData.summary || '';
          tags = jsonData.tags || [];
        } else {
          // JSON形式でない場合は要約として扱う
          summary = answer;
        }
      } catch (jsonError) {
        // JSONとして解析できない場合は要約として扱う
        console.log('JSONとして解析できないため、要約として扱います:', jsonError);
        summary = answer;
      }
    } else if (data && typeof data === 'string') {
      // 直接レスポンスが文字列の場合
      summary = data;
    } else if (data && data.text) {
      // データにtextプロパティがある場合
      summary = data.text;
    }
    
    return {
      transcription,
      summary,
      tags
    };
  } catch (error) {
    console.error('Dify APIレスポンス解析エラー:', error);
    
    // エラーが発生した場合でも、データを最大限抽出して返す
    return {
      transcription: transcription || '',
      summary: summary || `解析エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      tags: tags
    };
  }
}

/**
 * Dify APIテスト用関数
 * 
 * @param audioUrl オーディオファイルのURL
 * @param userId ユーザーID
 * @param instrumentName 楽器名
 * @returns テスト結果
 */
export async function testDifyAPI(
  audioUrl: string,
  userId: string,
  instrumentName: string = 'standard'
): Promise<any> {
  console.log('Dify APIテスト開始:', {
    instrumentName,
    audioUrlPrefix: audioUrl.substring(0, 30) + '...'
  });
  
  // APIリクエストデータを構築（テスト用）
  const apiUrl = `${DIFY_CONFIG.API_URL}/chat-messages`;
  const requestData = {
    inputs: {
      instrument: instrumentName,
      file_url: encodeURI(audioUrl),
      user_id: userId,
      lesson_id: 'test-' + Date.now()
    },
    query: "この音声ファイルを文字起こししてください。",
    response_mode: "blocking",
    user: userId,
    conversation_id: ""
  };
  
  try {
    // APIリクエストを送信
    const response = await axios.post(apiUrl, requestData, {
      headers: {
        "Authorization": `Bearer ${DIFY_CONFIG.SUMMARY_API_KEY}`,
        "Content-Type": "application/json"
      },
      timeout: 120000, // 2分のタイムアウト（ミリ秒）
      validateStatus: null // すべてのステータスコードを許可
    });
    
    console.log('Dify APIテスト成功:', {
      status: response.status,
      statusText: response.statusText
    });

    // 結果を返す
    return {
      result: (response.data as any).answer,
      success: true
    };
  } catch (error) {
    console.error('Dify APIテストエラー:', error);
    
    // エラーの詳細情報を取得して記録
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
    }
    
    if (axios.isAxiosError(error) && error.response) {
      return {
        result: '',
        success: false,
        error: `エラー: ${error.response.status} ${error.response.statusText}`
      };
    }
    
    return {
      result: '',
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
}

// サマリーとタグを生成する関数
export async function createLessonSummary(
  transcription: string, 
  userId: string, 
  lessonId: string, 
  instrumentName: string
): Promise<SummaryResult> {
  try {
    // Dify APIでサマリーとタグを生成
    const requestData = {
      inputs: {
        transcription: transcription,
        instrument: instrumentName,
        user_id: userId,
        lesson_id: lessonId
      },
      query: "この文字起こしから重要なポイントをまとめたサマリーとタグを生成してください。サマリーは400文字程度で、タグは5-10個程度作成してください。形式は「サマリー：(サマリー内容)\n\nタグ：#タグ1 #タグ2 #タグ3」の形でお願いします。",
      response_mode: "blocking",
      user: userId
    };
    
    console.log('Dify サマリーAPIリクエスト:', {
      url: DIFY_SUMMARY_API_ENDPOINT,
      userIdPrefix: userId.substring(0, 5) + '...',
      lessonId,
      instrument: instrumentName
    });
    
    // API呼び出し
    const response = await axios.post(DIFY_SUMMARY_API_ENDPOINT, requestData, {
      headers: {
        'Authorization': `Bearer ${DIFY_SUMMARY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseData = response.data;
    console.log('Dify サマリーAPI応答成功:', { lessonId });
    
    // サマリーとタグを分離
    const answer = responseData.answer || '';
    let summary = '';
    let tags: string[] = [];
    
    // 応答からサマリーとタグを抽出（ES2018以降互換の正規表現）
    const summaryMatch = answer.match(/サマリー[:：]([\s\S]*?)(?=\n\nタグ|$)/);
    const tagsMatch = answer.match(/タグ[:：]([\s\S]*?)$/);
    
    if (summaryMatch && summaryMatch[1]) {
      summary = summaryMatch[1].trim();
    } else {
      summary = answer; // 形式が合わない場合は全体を使用
    }
    
    if (tagsMatch && tagsMatch[1]) {
      // タグを配列に変換（#タグ1 #タグ2 #タグ3 の形式を想定）
      tags = tagsMatch[1].trim().split(/\s+/).filter((tag: string) => tag.startsWith('#')).map((tag: string) => tag.substring(1));
    } else {
      // タグが見つからない場合は、テキスト内の重要なキーワードをタグとして自動生成
      console.log('タグが見つからないため、自動生成します');
      // 単語を基本形に分解して頻出語を抽出（単純アプローチ）
      const words = summary.replace(/[。、,.!?]/g, ' ').split(/\s+/).filter(word => 
        word.length >= 2 && // 2文字以上の単語のみ
        !['です', 'ます', 'した', 'ない', 'れる', 'られる', 'など', 'ので', 'から', 'して'].includes(word) // 助詞や助動詞を除外
      );
      
      // 頻度カウント
      const wordCount: Record<string, number> = {};
      words.forEach(word => {
        wordCount[word] = (wordCount[word] || 0) + 1;
      });
      
      // 頻度順にソートして上位をタグとして使用
      tags = Object.entries(wordCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([word]) => word);
    }
    
    console.log(`サマリーとタグを生成しました。サマリー(${summary.length}文字)、タグ(${tags.length}個): ${tags.join(', ')}`);
    
    return {
      success: true,
      summary,
      tags
    };
  } catch (error) {
    console.error('サマリー生成中にエラーが発生:', error);
    
    if (axios.isAxiosError(error) && error.response) {
      console.error('Dify API サマリーエラー詳細:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー',
      summary: '',
      tags: []
    };
  }
} 