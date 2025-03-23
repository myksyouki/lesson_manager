/**
 * ユーティリティ関数モジュール
 * 
 * ファイル操作や経路解析のためのヘルパー関数を実装します。
 */
import * as fs from 'fs';
import * as path from 'path';
import { SYSTEM_CONFIG } from './config';

/**
 * パスからユーザーIDとファイル名を抽出する
 * 
 * @param filePath ファイルパス
 * @returns [userId, fileName] - ユーザーIDとファイル名のタプル
 */
export function extractUserAndFileName(filePath: string): [string | null, string | null] {
  if (!filePath) {
    return [null, null];
  }
  
  // 一般的なパスパターン: users/{userId}/{fileName} または {userId}/{fileName}
  const segments = filePath.split('/');
  
  if (segments.length >= 3 && segments[0] === 'users') {
    // users/{userId}/{fileName} パターン
    return [segments[1], segments[2]];
  } else if (segments.length >= 3 && segments[0] === 'audio' && segments[1] === 'users') {
    // audio/users/{userId}/{fileName} パターン
    return [segments[2], segments[3]];
  } else if (segments.length >= 3 && segments[0] === 'audio') {
    // audio/{userId}/{fileName} パターン
    return [segments[1], segments[2]];
  } else if (segments.length >= 2) {
    // {userId}/{fileName} パターン
    return [segments[0], segments[1]];
  }
  
  return [null, null];
}

/**
 * ファイル名からレッスンIDを抽出する
 * 
 * @param fileName ファイル名
 * @returns レッスンID（拡張子なし）
 */
export function extractLessonId(fileName: string): string | null {
  if (!fileName) {
    return null;
  }
  
  // ファイル名から拡張子を除去してレッスンIDを取得
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return fileName; // 拡張子がない場合は全体を返す
  }
  
  return fileName.substring(0, lastDotIndex);
}

/**
 * 一時ファイルを作成してファイルをダウンロードする
 * 
 * @param bucket ストレージバケット
 * @param filePath ファイルパス
 * @returns 一時ファイルのパス
 */
export async function downloadToTempFile(bucket: any, filePath: string): Promise<string> {
  // 一時ファイル名を生成
  const tempDir = SYSTEM_CONFIG.STORAGE.TEMP_DIR;
  const fileName = path.basename(filePath);
  const timestamp = Date.now();
  const tempFilePath = `${tempDir}/temp_${timestamp}_${fileName}`;
  
  // ディレクトリが存在することを確認
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  console.log(`ファイルをダウンロード中: ${filePath} -> ${tempFilePath}`);
  
  try {
    // ファイルをダウンロード
    await bucket.file(filePath).download({
      destination: tempFilePath
    });
    
    console.log('ファイルダウンロード完了:', tempFilePath);
    return tempFilePath;
  } catch (error) {
    console.error('ファイルダウンロードエラー:', error);
    throw new Error(`ファイルダウンロードエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * 一時ファイルを公開ディレクトリにアップロードする
 * 
 * @param bucket ストレージバケット
 * @param tempFilePath 一時ファイルのパス
 * @param userId ユーザーID
 * @param originalPath 元のファイルパス
 * @returns 公開アクセスURL
 */
export async function uploadToPublicDirectory(
  bucket: any,
  tempFilePath: string,
  userId: string,
  originalPath: string
): Promise<string> {
  const publicDir = SYSTEM_CONFIG.STORAGE.PUBLIC_PATH;
  const fileName = path.basename(originalPath);
  const timestamp = Date.now();
  const publicFileName = `${timestamp}_${fileName}`;
  const publicFilePath = `${publicDir}/${userId}/${publicFileName}`;
  
  console.log(`公開ファイルとしてアップロード中: ${tempFilePath} -> ${publicFilePath}`);
  
  try {
    // ディレクトリが存在することを確認
    try {
      await bucket.file(`${publicDir}/${userId}/`).save('', { contentType: 'application/x-directory' });
    } catch (dirError) {
      console.log('ディレクトリ作成をスキップしました', dirError);
    }
    
    // 公開ディレクトリにファイルをアップロード
    await bucket.upload(tempFilePath, {
      destination: publicFilePath,
      metadata: {
        contentType: 'audio/mpeg', // 強制的にaudio/mpegとして設定
        cacheControl: 'public, max-age=3600', // キャッシュ設定
        metadata: {
          firebaseStorageDownloadTokens: timestamp.toString(), // ダウンロードトークンを設定
          temporaryPublic: 'true',
          originalPath: originalPath,
          expiresAt: new Date(Date.now() + SYSTEM_CONFIG.STORAGE.EXPIRY_MS).toISOString()
        }
      },
      public: true, // 公開アクセスを有効化
      validation: false // ファイルタイプの検証をスキップ
    });
    
    console.log('公開ファイルアップロード完了:', publicFilePath);
    
    // 直接アクセス可能なURLを生成
    const publicAccessUrl = `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(publicFilePath)}`;
    console.log('公開URL生成完了:', publicAccessUrl);
    
    // ファイルが公開アクセス可能であることを確認
    try {
      await bucket.file(publicFilePath).makePublic();
      console.log('ファイルを公開に設定しました:', publicFilePath);
    } catch (publicError) {
      console.error('ファイルの公開設定エラー:', publicError);
    }
    
    return publicAccessUrl;
  } catch (error) {
    console.error('公開ファイルアップロードエラー:', error);
    throw new Error(`公開ファイルアップロードエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
}

/**
 * 一時ファイルを削除する
 * 
 * @param tempFilePath 一時ファイルのパス
 */
export function cleanupTempFile(tempFilePath: string): void {
  if (!tempFilePath) {
    return;
  }
  
  try {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
      console.log('一時ファイルを削除しました:', tempFilePath);
    }
  } catch (error) {
    console.error('一時ファイル削除エラー:', error);
  }
}

/**
 * 可能性のあるファイルパスからファイルが存在するパスを見つける
 * 
 * @param bucket ストレージバケット
 * @param paths 可能性のあるファイルパスの配列
 * @returns [存在するパス, ファイルオブジェクト] または null
 */
export async function findExistingFilePath(bucket: any, paths: string[]): Promise<[string, any] | null> {
  for (const path of paths) {
    try {
      console.log(`パスを確認中: ${path}`);
      const file = bucket.file(path);
      const [exists] = await file.exists();
      
      if (exists) {
        console.log(`ファイルが見つかりました: ${path}`);
        return [path, file];
      }
    } catch (err) {
      console.log(`パス確認中にエラー: ${path}`, err);
    }
  }
  
  console.error('ファイルが見つかりません。試行したパス:', paths);
  return null;
} 