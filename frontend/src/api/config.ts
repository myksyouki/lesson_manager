/**
 * API設定を管理するモジュール
 */

// APIの設定情報インターフェース
export interface ApiConfig {
  difyApiKey: string;
  difyApiUrl: string;
  cloudFunctionBaseUrl: string;
}

/**
 * API設定を取得する
 * 環境変数または設定ファイルから設定を読み込む
 */
export async function getConfiguration(): Promise<ApiConfig> {
  // 実際の実装では環境変数や設定ファイルから読み込む
  // このシンプルな実装ではダミー値を返す
  return {
    difyApiKey: process.env.NEXT_PUBLIC_DIFY_API_KEY || '',
    difyApiUrl: process.env.NEXT_PUBLIC_DIFY_API_URL || 'https://api.dify.ai/v1',
    cloudFunctionBaseUrl: process.env.NEXT_PUBLIC_CLOUD_FUNCTION_URL || 'https://us-central1-lesson-manager-99ab9.cloudfunctions.net'
  };
} 