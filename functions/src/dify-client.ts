/**
 * Dify APIクライアント
 * 
 * Dify AIとの連携で、文字起こしの要約を行う（タグ生成はGemini APIに一本化）
 */

import axios from 'axios';
import * as functions from 'firebase-functions/v1';
import { difyApiUrl, difySummaryApiKey, difySummaryAppId } from './config';
import { generateTags } from './gemini'; // Gemini API用の関数をインポート

// 最大トランスクリプション長（文字数）
const MAX_TRANSCRIPTION_LENGTH = 30000;

/**
 * トランスクリプションが長すぎる場合に分割する
 */
function splitTranscription(transcription: string, maxLength: number): string[] {
  if (transcription.length <= maxLength) {
    return [transcription];
  }
  
  console.log(`トランスクリプションが長すぎるため分割します: ${transcription.length}文字 -> ${maxLength}文字ずつ`);
  
  // 文単位で分割するための正規表現
  const sentenceRegex = /([。．！？\.\!\?])/g;
  const parts: string[] = [];
  let currentPart = '';
  
  // 文を分割
  const sentences = transcription.split(sentenceRegex);
  
  for (let i = 0; i < sentences.length; i++) {
    // 句読点と次の文をセットで追加
    const sentencePart = sentences[i] + (sentences[i+1] || '');
    i++; // 句読点をスキップ
    
    // 現在のパートに文を追加した場合の長さをチェック
    if (currentPart.length + sentencePart.length <= maxLength) {
      currentPart += sentencePart;
    } else {
      // 現在のパートが最大長を超える場合、新しいパートを開始
      if (currentPart.length > 0) {
        parts.push(currentPart);
      }
      currentPart = sentencePart;
    }
  }
  
  // 最後のパートを追加
  if (currentPart.length > 0) {
    parts.push(currentPart);
  }
  
  console.log(`トランスクリプション分割完了: ${parts.length}個のパートに分割`);
  return parts;
}

/**
 * Difyに文字起こしを送信し、要約を取得する
 * タグの生成は常にGemini APIを使用する
 */
export async function generateSummaryWithDify(
  transcription: string, 
  instrumentName: string,
  lessonId: string,
  pieces?: string[], // レッスン曲情報を追加
  aiInstructions?: string // AI指示を追加
): Promise<{summary: string, tags: string[], lessonId: string}> {
  console.log(`Difyを使用して要約生成開始: ${instrumentName} (${transcription.length}文字), レッスンID: ${lessonId}, 曲: ${pieces?.join(', ') || 'なし'}, AI指示: ${aiInstructions || 'なし'}`);

  try {
    // 設定値を取得
    const apiUrl = difyApiUrl.value() || process.env.DIFY_API_URL || 'https://api.dify.ai/v1';
    const apiKey = difySummaryApiKey.value() || process.env.DIFY_SUMMARY_API_KEY || '';
    const appId = difySummaryAppId.value() || process.env.DIFY_SUMMARY_APP_ID || '';
    
    // デバッグ: 設定情報をログ出力
    console.log(`[DEBUG-DIFY] 設定情報:
      API URL: ${apiUrl}
      API Key存在: ${apiKey ? 'あり' : 'なし'} 
      App ID存在: ${appId ? 'あり' : 'なし'}
      環境変数DIFY_API_URL: ${process.env.DIFY_API_URL || 'なし'}
      環境変数DIFY_SUMMARY_API_KEY: ${process.env.DIFY_SUMMARY_API_KEY ? 'あり' : 'なし'}
      環境変数DIFY_SUMMARY_APP_ID: ${process.env.DIFY_SUMMARY_APP_ID || 'なし'}`
    );
    
    if (!apiKey || !appId) {
      console.error('[DEBUG-DIFY] エラー: Dify API設定が不足しています');
      throw new Error('Dify API設定が不足しています');
    }
    
    // トランスクリプションが長すぎる場合は分割
    const transcriptionParts = splitTranscription(transcription, MAX_TRANSCRIPTION_LENGTH);
    let combinedSummary = '';
    
    // 各パートを処理
    for (let i = 0; i < transcriptionParts.length; i++) {
      const part = transcriptionParts[i];
      console.log(`[DEBUG-DIFY] パート${i+1}/${transcriptionParts.length}を処理中 (${part.length}文字)`);
      
      // クエリの準備 - AI指示があればそれを使用、なければデフォルトのクエリ
      const queryText = aiInstructions && aiInstructions.trim() !== '' 
        ? aiInstructions.substring(0, 100) // 100文字までに制限
        : transcription.substring(0, 30) + "...";
      
      // リクエストデータを作成
      const requestData = {
        query: queryText,
        app_id: appId,
        inputs: {
          transcription: part,
          instrument: instrumentName,
          lesson_id: lessonId,
          part_info: transcriptionParts.length > 1 ? `パート ${i+1}/${transcriptionParts.length}` : undefined,
          pieces: pieces && pieces.length > 0 ? JSON.stringify(pieces) : undefined // 曲情報を文字列化して追加
        },
        response_mode: 'blocking',
        response_format: 'json_schema', // JSONレスポンス形式を明示的に指定
        user: 'lesson-manager-system',
        // JSON Schema定義を追加（タグは不要になったので削除）
        json_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "文字起こしの要約文"
            },
            lesson_id: {
              type: "string",
              description: "処理対象のレッスンID"
            }
          },
          required: ["summary", "lesson_id"]
        },
        retrieval_model: {
          weights: {
            weight_type: "semantic"
          }
        }
      };
      
      console.log(`[DEBUG-DIFY] リクエスト送信準備:
        URL: ${apiUrl}/chat-messages
        データ構造: ${JSON.stringify(requestData, (key, value) => 
          key === 'transcription' ? `${value.length}文字の文字起こし` : 
          key === 'query' ? `${value.length}文字のクエリ` : value
        )}
        曲情報: ${pieces ? pieces.join(', ') : 'なし'}
      `);
      
      // Dify APIにリクエスト送信
      const response = await axios({
        method: 'POST',
        url: `${apiUrl}/chat-messages`,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        data: requestData,
        timeout: 180000 // 3分タイムアウトに延長
      });
      
      console.log(`[DEBUG-DIFY] APIレスポンス受信: ステータス=${response.status}`);
      
      // レスポンスを解析
      const difyResponse = response.data;
      
      if (!difyResponse.answer) {
        throw new Error('Difyからの応答に要約が含まれていません');
      }
      
      // 要約の取得
      let partSummary = '';
      
      try {
        // JSON形式のレスポンスを解析
        if (difyResponse.answer) {
          // JSON文字列を検出して解析
          const jsonMatch = difyResponse.answer.match(/{[\s\S]*?}/);
          if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            if (jsonData.summary) {
              partSummary = jsonData.summary;
            } else {
              // 構造化されていない場合は全体を要約として扱う
              partSummary = difyResponse.answer;
            }
            
            // レッスンIDをログに出力
            if (jsonData.lesson_id) {
              console.log(`[DEBUG-DIFY] レスポンスからレッスンID確認: ${jsonData.lesson_id}`);
            }
            
            console.log(`[DEBUG-DIFY] JSON解析成功: summary=${partSummary.length}文字`);
          } else {
            // JSONが見つからない場合は全体を要約として扱う
            partSummary = difyResponse.answer;
            console.log(`[DEBUG-DIFY] JSONが見つからないため全体を要約として扱います: ${partSummary.length}文字`);
          }
        }
      } catch (error) {
        console.error('[DEBUG-DIFY] JSON解析エラー:', error);
        // 例外が発生した場合は全体を要約として扱う
        partSummary = difyResponse.answer;
      }
      
      // 要約が空または極端に短い場合はエラー
      if (!partSummary || partSummary.length < 30) {
        console.error(`[DEBUG-DIFY] エラー: 要約が極端に短いまたは空です (${partSummary.length}文字): "${partSummary}"`);
        
        // 再試行のためのエラー
        if (i < transcriptionParts.length - 1) {
          console.log('[DEBUG-DIFY] 処理を続行して次のパートを試みます');
          continue;
        }
        
        throw new Error(`要約生成が極端に短くなりました(${partSummary.length}文字)。再試行してください。`);
      }
      
      combinedSummary += (combinedSummary ? '\n\n' : '') + partSummary;
      
      console.log(`[DEBUG-DIFY] パート${i+1}処理完了: ${partSummary.length}文字`);
    }
    
    console.log(`Dify要約生成完了: ${combinedSummary.length}文字, レッスンID: ${lessonId}`);
    
    // Gemini APIを使用してタグを生成（Difyのタグ生成は使用せず、常にGeminiを使用）
    console.log('[DEBUG] Geminiを使用してタグを生成開始');
    try {
      const geminiResult = await generateTags(combinedSummary, instrumentName);
      if (geminiResult.success && geminiResult.tags.length > 0) {
        console.log('[DEBUG-GEMINI] Geminiからタグ取得成功:', geminiResult.tags);
        return {
          summary: combinedSummary,
          tags: geminiResult.tags,
          lessonId: lessonId
        };
      } else {
        console.error('[DEBUG-GEMINI] Geminiタグ生成失敗:', geminiResult.error || 'タグなし');
        // タグ生成に失敗した場合は空の配列を返す
        return {
          summary: combinedSummary,
          tags: [],
          lessonId: lessonId
        };
      }
    } catch (geminiError) {
      console.error('[DEBUG-GEMINI] Geminiタグ生成エラー:', geminiError);
      return {
        summary: combinedSummary,
        tags: [],
        lessonId: lessonId
      };
    }
  } catch (error) {
    console.error('Dify API呼び出しエラー:', error);
    
    // エラーレスポンスの詳細をログに出力
    if (axios.isAxiosError(error) && error.response) {
      console.error(`Dify APIエラーステータス: ${error.response.status}`);
      console.error(`Dify APIエラーデータ:`, error.response.data);
    }
    
    // エラー時もGeminiでタグ生成を試みる
    try {
      console.log('[DEBUG] Difyエラー後、Geminiを使用したタグ生成を試みます');
      const geminiResult = await generateTags(transcription, instrumentName);
      
      if (geminiResult.success && geminiResult.tags.length > 0) {
        return {
          summary: `エラーが発生したため要約を生成できませんでした: ${error instanceof Error ? error.message : '不明なエラー'}`,
          tags: geminiResult.tags,
          lessonId: lessonId
        };
      }
    } catch (geminiError) {
      console.error('[DEBUG-GEMINI-ERROR] エラー時のGeminiタグ生成にも失敗:', geminiError);
    }
    
    // 最終的なエラーハンドリング
    throw new functions.https.HttpsError(
      'internal',
      'Dify APIでの要約生成に失敗しました',
      error instanceof Error ? error.message : '不明なエラー'
    );
  }
} 