import { useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

interface SelectedFile {
  uri: string;
  name: string;
  type?: string;
  size?: number;
}

interface UseFileUploadReturn {
  selectedFile: SelectedFile | null;
  isUploading: boolean;
  uploadProgress: number;
  selectFile: (fileTypes?: string[]) => Promise<void>;
  clearFile: () => void;
  setUploadProgress: (progress: number) => void;
  setIsUploading: (isUploading: boolean) => void;
}

export const useFileUpload = (
  onFileSelected?: (file: SelectedFile) => void,
  onError?: (error: Error) => void
): UseFileUploadReturn => {
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // ファイル選択ハンドラー
  const selectFile = async (fileTypes: string[] = ['audio/*']) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: fileTypes,
        copyToCacheDirectory: true,
      });
      
      if (result.canceled) {
        return;
      }
      
      const file = result.assets[0];
      const newFile: SelectedFile = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
        size: file.size,
      };
      
      setSelectedFile(newFile);
      
      if (onFileSelected) {
        onFileSelected(newFile);
      }
    } catch (error) {
      console.error('ファイル選択エラー:', error);
      
      if (error instanceof Error) {
        if (onError) {
          onError(error);
        } else {
          Alert.alert('エラー', 'ファイルの選択中にエラーが発生しました');
        }
      }
    }
  };

  // ファイルクリアハンドラー
  const clearFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  return {
    selectedFile,
    isUploading,
    uploadProgress,
    selectFile,
    clearFile,
    setUploadProgress,
    setIsUploading,
  };
}; 