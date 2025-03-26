import {SecretManagerServiceClient} from "@google-cloud/secret-manager";

const secretClient = new SecretManagerServiceClient();

/**
 * Secret Managerから指定された名前のシークレットを取得する
 * @param secretName シークレット名
 * @returns シークレットの値
 */
export async function getSecret(secretName: string): Promise<string> {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  
  try {
    const [version] = await secretClient.accessSecretVersion({name});
    return version.payload?.data?.toString() || "";
  } catch (error) {
    console.error(`シークレット取得エラー (${secretName}):`, error);
    throw new Error(`シークレットの取得に失敗しました: ${secretName}`);
  }
} 
