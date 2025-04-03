import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * ファイルのハッシュ値を取得する
 * UUIDの代わりにタイムスタンプベースの一意の識別子を使用
 */
export const getFileHash = async (uri: string): Promise<string> => {
  try {
    // タイムスタンプと乱数を組み合わせて一意の識別子を生成
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `${timestamp}_${random}`;
  } catch (error) {
    console.error('ファイルハッシュ生成エラー:', error);
    // エラーが発生した場合は現在時刻を返す
    return `${Date.now()}`;
  }
};

/**
 * ファイルの拡張子を取得する
 */
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * ファイルサイズを人間が読める形式に変換する
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
