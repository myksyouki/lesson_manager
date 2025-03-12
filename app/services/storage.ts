import { storage, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
// UUIDの代わりにタイムスタンプを使用
// import { v4 as uuidv4 } from 'uuid';
import { getFileHash } from './fileUtils';
import type { UploadTaskSnapshot } from 'firebase/storage';

// Supported file types and size limits
const SUPPORTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
const MAX_FILE_SIZE = 1024 * 1024 * 500; // 500MB (90分の音声ファイルに対応)

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
  fileName: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  try {
    // Optional("https")形式のURLを処理
    let validUri = uri;
    if (uri.includes('Optional(') && uri.includes(')')) {
      const match = uri.match(/Optional\(["'](.+?)["']\)/);
      if (match && match[1]) {
        validUri = match[1];
        console.log('Optional形式から抽出したURI:', validUri);
      }
    }

    // HTTPSスキームの処理
    if (validUri.startsWith('https://')) {
      console.log('HTTPSスキームを検出しました。一時ファイルをダウンロードします。');
      try {
        // 一時ディレクトリのパス
        const tempDir = FileSystem.cacheDirectory + 'shared/';
        
        // 一時ディレクトリが存在するか確認し、なければ作成
        const dirInfo = await FileSystem.getInfoAsync(tempDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        }
        
        const tempFileName = `temp_${Date.now()}_${fileName}`;
        const downloadResult = await FileSystem.downloadAsync(
          validUri,
          tempDir + tempFileName
        );
        console.log('ダウンロード結果:', downloadResult);
        validUri = downloadResult.uri;
      } catch (downloadError) {
        console.error('HTTPSファイルのダウンロードエラー:', downloadError);
        throw new Error('HTTPSファイルのダウンロードに失敗しました');
      }
    }
    
    // Validate file type and size
    console.log('ファイル情報を取得します:', validUri);
    const fileInfo = await FileSystem.getInfoAsync(validUri);
    if (!fileInfo.exists || fileInfo.size === undefined) {
      throw new Error('ファイルが見つかりません');
    }

    if (fileInfo.size > MAX_FILE_SIZE) {
      throw new Error(`ファイルサイズが上限（${MAX_FILE_SIZE / 1024 / 1024}MB）を超えています`);
    }

    // Get file metadata
    const mimeType = await getMimeType(validUri);
    if (!SUPPORTED_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate unique file path with cache key
    const fileHash = await getFileHash(validUri);
    const filePath = `audio/${user.uid}/${Date.now()}_${fileName}`;
    const fileRef = ref(storage, filePath);

    // Convert file to blob
    let blob;
    if (Platform.OS !== 'web') {
      const response = await fetch(validUri);
      blob = await response.blob();
    } else {
      blob = validUri as unknown as Blob;
    }

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(fileRef, blob, {
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        originalFileName: fileName
      }
    });

    if (onProgress) {
      uploadTask.on('state_changed', 
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress({
            progress,
            totalBytes: snapshot.totalBytes,
            transferredBytes: snapshot.bytesTransferred
          });
        }
      );
    }

    const uploadResult = await uploadTask;

    // Get the public URL and metadata
    const publicUrl = await getDownloadURL(fileRef);
    const metadata = {
      fileSize: fileInfo.size,
      mimeType,
      duration: await getAudioDuration(validUri)
    };

    return {
      success: true,
      url: publicUrl,
      path: filePath,
      cacheKey: fileHash,
      metadata
    };
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return {
      success: false,
      error,
      metadata: {
        fileSize: 0,
        mimeType: '',
        duration: 0
      }
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
