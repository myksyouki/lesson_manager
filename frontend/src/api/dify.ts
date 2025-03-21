import axios from 'axios';
import { getConfiguration } from './config';

// Dify APIの設定
export const difyApi = {
  /**
   * Dify APIを使用してレッスンの文字起こしと要約を実行する
   * @param lesson レッスンデータ
   * @param userId ユーザーID
   * @returns APIレスポンス
   */
  processLessonAudio: async (lesson: any, userId: string) => {
    try {
      const config = await getConfiguration();
      if (!config.difyApiKey || !config.difyApiUrl) {
        throw new Error('Dify API設定が見つかりません');
      }

      // 公開URLを優先的に使用
      const audioUrl = lesson.publicAudioUrl || lesson.audioUrl;
      if (!audioUrl) {
        throw new Error('オーディオURLが見つかりません');
      }

      // APIリクエストを構築
      const requestData = {
        lesson_id: lesson.id,
        user_id: userId,
        file_url: audioUrl,
        instrument: lesson.instrument || 'standard'
      };

      // 関数URLを構築
      const functionUrl = `${config.cloudFunctionBaseUrl}/testDifyAPI`;
      
      console.log('Dify API処理リクエスト:', {
        functionUrl,
        requestData
      });

      // Cloud Function経由でDify APIを呼び出す
      const response = await axios.post(functionUrl, requestData);
      return response.data;
    } catch (error: any) {
      console.error('Dify API呼び出しエラー:', error);
      throw new Error(`Dify API呼び出しに失敗しました: ${error.message}`);
    }
  },

  /**
   * レッスンに対してDifyチャットAPIを呼び出す
   * @param lesson レッスンデータ
   * @param userId ユーザーID
   * @param query 質問テキスト
   * @returns チャットレスポンス
   */
  chatWithLesson: async (lesson: any, userId: string, query: string) => {
    try {
      const config = await getConfiguration();
      if (!config.difyApiKey || !config.difyApiUrl) {
        throw new Error('Dify API設定が見つかりません');
      }

      // チャットリクエストを構築
      const requestData = {
        lesson_id: lesson.id,
        lesson_data: {
          transcription: lesson.transcription || '',
          summary: lesson.summary || '',
          tags: lesson.tags || []
        },
        user_id: userId,
        query: query
      };

      // 関数URLを構築
      const functionUrl = `${config.cloudFunctionBaseUrl}/chatWithLesson`;
      
      console.log('レッスンチャットリクエスト:', {
        functionUrl,
        requestData: {
          ...requestData,
          lesson_data: '(省略)'
        }
      });

      // Cloud Function経由でDify Chat APIを呼び出す
      const response = await axios.post(functionUrl, requestData);
      return response.data;
    } catch (error: any) {
      console.error('Difyチャット呼び出しエラー:', error);
      throw new Error(`Difyチャット呼び出しに失敗しました: ${error.message}`);
    }
  }
}; 