import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import * as logger from 'firebase-functions/logger';

const secretClient = new SecretManagerServiceClient();

/**
 * Secret Managerから指定された名前のシークレットを取得する
 * @param secretName シークレット名
 * @returns シークレットの値
 */
export const getSecret = async (secretName: string): Promise<string> => {
  try {
    const projectId = process.env.GCLOUD_PROJECT;
    const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
    
    logger.info(`シークレット ${secretName} を取得中...`);
    
    const [version] = await secretClient.accessSecretVersion({ name });
    
    if (!version.payload || !version.payload.data) {
      throw new Error(`シークレット ${secretName} の値が取得できませんでした`);
    }
    
    const secretValue = version.payload.data.toString();
    logger.info(`シークレット ${secretName} の取得に成功`);
    
    return secretValue;
  } catch (error) {
    logger.error(`シークレット ${secretName} の取得に失敗:`, error);
    throw new Error(`シークレット取得エラー: ${error}`);
  }
};

/**
 * OpenAI APIキーを取得
 * @returns OpenAI APIキー
 */
export const getOpenAIApiKey = async (): Promise<string> => {
  return getSecret('openai-api-key');
};

/**
 * DiFy APIキーを取得
 * @returns DiFy APIキー
 */
export const getDifyApiKey = async (): Promise<string> => {
  return getSecret('dify-api-key');
}; 
