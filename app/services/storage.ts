import { storage, auth } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { getFileHash } from './fileUtils';
import type { UploadTaskSnapshot } from 'firebase/storage';

// Supported file types and size limits
const SUPPORTED_TYPES = ['audio/mpeg', 'audio/wav', 'audio/mp4'];
const MAX_FILE_SIZE = 1024 * 1024 * 100; // 100MB

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
    // Validate file type and size
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists || fileInfo.size === undefined) {
      throw new Error('File not found');
    }

    if (fileInfo.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // Get file metadata
    const mimeType = await getMimeType(uri);
    if (!SUPPORTED_TYPES.includes(mimeType)) {
      throw new Error(`Unsupported file type: ${mimeType}`);
    }

    // Get the current user
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Generate unique file path with cache key
    const fileHash = await getFileHash(uri);
    const filePath = `audio/${user.uid}/${fileHash}_${fileName}`;
    const fileRef = ref(storage, filePath);

    // Convert file to blob
    let blob;
    if (Platform.OS !== 'web') {
      const response = await fetch(uri);
      blob = await response.blob();
    } else {
      blob = uri as unknown as Blob;
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
      duration: await getAudioDuration(uri)
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
