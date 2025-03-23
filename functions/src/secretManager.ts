/**
 * Secret Manager操作を担当するモジュール
 */
import {SecretManagerServiceClient} from '@google-cloud/secret-manager';

// シークレットマネージャークライアントの初期化
const secretManagerClient = new SecretManagerServiceClient();
const projectId = process.env.GCLOUD_PROJECT || 'lesson-manager-99ab9';

/**
 * 指定されたシークレット名のシークレットを取得する
 * シークレットが見つからない場合は環境変数から取得を試みる
 */
export async function getSecret(secretName: string): Promise<string> {
  try {
    console.log(`シークレット "${secretName}" の取得を試みています...`);
    
    // 環境変数からの取得を最初に試みる（開発やデバッグ用）
    // シークレット名を環境変数名の形式に変換（ハイフンをアンダースコアに、すべて大文字に）
    const envVarName = `EXPO_PUBLIC_${secretName.replace(/-/g, '_').toUpperCase()}`;
    console.log(`環境変数 ${envVarName} の確認`);
    
    // 環境変数が存在する場合はそれを使用
    if (process.env[envVarName]) {
      console.log(`環境変数 ${envVarName} から値を取得しました`);
      return process.env[envVarName] as string;
    }
    
    // Dify特有の命名規則の対応（例：dify-summary-app-id → EXPO_PUBLIC_DIFY_SUMMARY_APP_ID）
    if (secretName.startsWith('dify-')) {
      // 例: dify-summary-api-key → DIFY_SUMMARY_API_KEY
      const difyEnvName = `EXPO_PUBLIC_${secretName.substring(5).replace(/-/g, '_').toUpperCase()}`;
      console.log(`Dify環境変数 ${difyEnvName} の確認`);
      
      if (process.env[difyEnvName]) {
        console.log(`Dify環境変数 ${difyEnvName} から値を取得しました`);
        return process.env[difyEnvName] as string;
      }
    }
    
    console.log(`環境変数からシークレット ${secretName} が見つかりませんでした。Secret Managerを使用します...`);

    // Secret Managerから取得
    const secretPath = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    const [version] = await secretManagerClient.accessSecretVersion({
      name: secretPath
    });
    
    const payload = version.payload?.data?.toString();
    if (!payload) {
      throw new Error(`シークレット ${secretName} のペイロードが空です`);
    }
    
    console.log(`シークレット "${secretName}" を正常に取得しました`);
    return payload;
  } catch (error) {
    console.error(`シークレット "${secretName}" の取得に失敗しました:`, error);
    
    // 環境変数からの取得を代替手段として再試行
    const envVarName = `EXPO_PUBLIC_${secretName.replace(/-/g, '_').toUpperCase()}`;
    if (process.env[envVarName]) {
      console.log(`環境変数 ${envVarName} からフォールバック値を取得しました`);
      return process.env[envVarName] as string;
    }
    
    // Dify特有の命名規則の対応（例：dify-summary-app-id → EXPO_PUBLIC_DIFY_SUMMARY_APP_ID）
    if (secretName.startsWith('dify-')) {
      const difyEnvName = `EXPO_PUBLIC_${secretName.substring(5).replace(/-/g, '_').toUpperCase()}`;
      if (process.env[difyEnvName]) {
        console.log(`Dify環境変数 ${difyEnvName} からフォールバック値を取得しました`);
        return process.env[difyEnvName] as string;
      }
    }
    
    // 特定のシークレットに対する直接的なフォールバック値
    if (secretName === 'dify-summary-app-id' && process.env.EXPO_PUBLIC_DIFY_SUMMARY_APP_ID) {
      console.log('EXPO_PUBLIC_DIFY_SUMMARY_APP_ID から直接フォールバック値を取得しました');
      return process.env.EXPO_PUBLIC_DIFY_SUMMARY_APP_ID;
    }
    
    if (secretName === 'dify-summary-api-key' && process.env.EXPO_PUBLIC_DIFY_SUMMARY_API_KEY) {
      console.log('EXPO_PUBLIC_DIFY_SUMMARY_API_KEY から直接フォールバック値を取得しました');
      return process.env.EXPO_PUBLIC_DIFY_SUMMARY_API_KEY;
    }
    
    throw new Error(`シークレット "${secretName}" の取得に失敗し、環境変数からの代替も見つかりませんでした`);
  }
}

/**
 * シークレット名から対応する環境変数名に変換
 * 例: dify-summary-api-key -> DIFY_SUMMARY_API_KEY
 */
function secretNameToEnvVar(secretName: string): string {
  return secretName.toUpperCase().replace(/-/g, '_');
}

/**
 * すべてのアプリケーションシークレットをキャッシュ
 * 注: キャッシュは関数インスタンスの存続期間中のみ有効
 */
const secretCache: Record<string, string> = {};

/**
 * シークレットをキャッシュから取得、なければSecret Managerから取得してキャッシュ
 * @param secretName - シークレット名
 * @returns シークレットの値
 */
export async function getCachedSecret(secretName: string): Promise<string> {
  if (secretCache[secretName]) {
    return secretCache[secretName];
  }
  
  const value = await getSecret(secretName);
  secretCache[secretName] = value;
  return value;
}

/**
 * 一般的に使用されるシークレットを事前取得する
 */
export async function preloadCommonSecrets(): Promise<void> {
  try {
    console.log('一般的なシークレットを事前ロード中...');
    const commonSecrets = [
      'openai-api-key',
      'gemini-api-key',
      'dify-summary-api-key',
      'dify-summary-app-id',
      'dify-standard-api-key',
      'dify-standard-app-id',
      'dify-saxophone-artist-api-key',
      'dify-saxophone-artist-app-id'
    ];
    
    await Promise.all(
      commonSecrets.map(async (name) => {
        try {
          secretCache[name] = await getSecret(name);
          console.log(`シークレット "${name}" をキャッシュに保存しました`);
        } catch (error) {
          console.warn(`シークレット ${name} の事前ロードに失敗:`, error);
        }
      })
    );
    
    console.log('シークレットの事前ロードが完了');
  } catch (error) {
    console.error('シークレットの事前ロード中にエラー:', error);
  }
} 