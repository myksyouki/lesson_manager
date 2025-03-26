import { storage, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
// UUIDの代わりにタイムスタンプを使用
// import { v4 as uuidv4 } from 'uuid';
import { getFileHash } from './fileUtils';
import type { UploadTaskSnapshot } from 'firebase/storage';
import NetInfo from '@react-native-community/netinfo';
import { Alert } from 'react-native';

// Supported file types and size limits
const SUPPORTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB (90分の音声ファイルに対応)
// 最大音声長: 90分
const MAX_AUDIO_DURATION = 90 * 60; // 秒単位
// Wi-Fi推奨の閾値
const WIFI_RECOMMENDED_SIZE = 30 * 1024 * 1024; // 30MB

// Upload audio file to Firebase Storage
export interface UploadProgress {
  progress: number;
  totalBytes: number;
  transferredBytes: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: any;
  cacheKey?: string;
  metadata?: {
    fileSize: number;
    duration?: number;
    mimeType: string;
  };
}

export const uploadAudioFile = async (
  uri: string,
  storagePath: string, // 形式: audio/{userId}/{lessonId}/{fileName}
  lessonData?: any,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Optional("https")形式のURLを処理
    let validUri = uri;
    if (uri.includes('Optional(') && uri.includes(')')) {
      const match = uri.match(/Optional\(["'](.+?)["']\)/);
      if (match && match[1]) {
        validUri = match[1];
      }
    }

    // ファイル情報を取得
    const fileInfo = await FileSystem.getInfoAsync(validUri);
    if (!fileInfo.exists) {
      throw new Error('ファイルが見つかりません');
    }

    // ネットワーク状態を確認
    const networkState = await NetInfo.fetch();
    const isWifi = networkState.type === 'wifi';
    const fileSize = fileInfo.size || 0;

    // Wi-Fi以外で大きなファイルの場合は警告
    if (!isWifi && fileSize > WIFI_RECOMMENDED_SIZE) {
      console.warn('大きなファイルをモバイル通信でアップロードしています');
    }

    // ファイルサイズチェック
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが大きすぎます（上限: ${MAX_FILE_SIZE / 1024 / 1024}MB）`);
    }

    // ユーザー認証確認
    const user = auth.currentUser;
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    // Storageの参照を作成
    const storageRef = ref(storage, storagePath);

    // ファイルをアップロード
    const response = await fetch(validUri);
    const blob = await response.blob();
    
    // メタデータを準備
    const metadata = {
      contentType: blob.type || 'audio/mpeg',
      customMetadata: {
        // レッスンデータがある場合はカスタムメタデータを追加
        instrument: lessonData?.instrumentName || '',
        pieces: lessonData?.pieces ? JSON.stringify(lessonData.pieces) : '[]',
        userPrompt: lessonData?.userPrompt || '',
      }
    };
    
    // 追加されたカスタムメタデータをログに出力
    console.log('ファイルに追加するメタデータ:', metadata.customMetadata);
    
    // アップロードタスクを作成
    const uploadTask = uploadBytesResumable(storageRef, blob, metadata);

    // 進捗状況の監視
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress({
              progress,
              totalBytes: snapshot.totalBytes,
              transferredBytes: snapshot.bytesTransferred
            });
          }
        },
        (error) => {
          console.error('アップロードエラー:', error);
          reject(error);
        },
        async () => {
          try {
            // アップロード完了後のURLを取得
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            
            resolve({
              success: true,
              url: downloadUrl,
              path: storagePath,
              metadata: {
                fileSize,
                mimeType: blob.type
              }
            });
          } catch (error) {
            console.error('ダウンロードURL取得エラー:', error);
            reject(error);
          }
        }
      );
    });

  } catch (error) {
    console.error('ファイルアップロードエラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    };
  }
};

// Get MIME type from file URI
const getMimeType = async (uri: string): Promise<string> => {
  if (Platform.OS === 'web') {
    const response = await fetch(uri, { method: 'HEAD' });
    return response.headers.get('Content-Type') || 'audio/mpeg';
  }
  
  // For mobile platforms
  const fileExtension = uri.split('.').pop()?.toLowerCase();
  switch (fileExtension) {
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'm4a':
    case 'mp4':
      return 'audio/mp4';
    default:
      return 'audio/mpeg';
  }
};

// Get audio duration (in seconds)
const getAudioDuration = async (uri: string): Promise<number> => {
  // Implementation depends on platform
  if (Platform.OS === 'web') {
    return new Promise((resolve) => {
      const audio = new Audio(uri);
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = () => resolve(0);
    });
  }
  return 0; // TODO: Implement for mobile
};

export const getPublicUrl = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    console.error('Error getting file URL:', error);
    return null;
  }
};

// Delete a file from Firebase Storage
export const deleteFile = async (path: string) => {
  try {
    const fileRef = ref(storage, path);
    await deleteObject(fileRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error };
  }
};
