import {SecretManagerServiceClient} from "@google-cloud/secret-manager";
import {PROJECT_ID} from "../config";

const secretClient = new SecretManagerServiceClient();

/**
 * Secret Managerから指定された名前のシークレットを取得する
 * @param secretName シークレット名
 * @returns シークレットの値
 */
export async function getSecret(secretName: string): Promise<string> {
  // 環境変数からプロジェクトIDを取得、ない場合は設定ファイルの値を使用
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || PROJECT_ID;
  console.log(`シークレット取得に使用するプロジェクトID: "${projectId}"`);
  
  if (!projectId) {
    throw new Error("プロジェクトIDが設定されていません。環境変数GOOGLE_CLOUD_PROJECTを確認してください。");
  }
  
  const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
  
  try {
    const [version] = await secretClient.accessSecretVersion({name});
    return version.payload?.data?.toString() || "";
  } catch (error) {
    console.error(`シークレット取得エラー (${secretName}):`, error);
    throw new Error(`シークレットの取得に失敗しました: ${secretName}`);
  }
} 
