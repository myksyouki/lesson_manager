import { useState, useEffect } from 'react';
import { getDocumentAsync, DocumentPickerOptions } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import NetInfo from '@react-native-community/netinfo';

// 上限ファイルサイズ: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;
// Wi-Fi推奨アラートの閾値: 40MB
const WIFI_RECOMMENDED_SIZE = 40 * 1024 * 1024;

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
  selectFile: (fileTypes?: string | string[]) => Promise<void>;
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
  const [networkType, setNetworkType] = useState<string | null>(null);

  // ネットワーク状態の監視
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkType(state.type);
    });

    // コンポーネントのアンマウント時にリスナーを解除
    return () => {
      unsubscribe();
    };
  }, []);

  // エラーハンドラー
  const handleError = (error: any, customMessage?: string) => {
    const baseMessage = customMessage || 'ファイルの選択中にエラーが発生しました';
    console.error(`${baseMessage}:`, error);
    
    let errorMessage = baseMessage;
    
    if (error instanceof Error) {
      errorMessage = `${baseMessage}: ${error.message}`;
      
      if (onError) {
        onError(error);
      } else {
        Alert.alert('エラー', errorMessage);
      }
    } else {
      console.error('不明なエラー形式:', typeof error);
      Alert.alert('エラー', errorMessage);
    }
  };

  // ファイルサイズのチェック
  const checkFileSize = (size?: number): boolean => {
    if (!size) return true; // サイズ不明の場合は許可
    
    if (size > MAX_FILE_SIZE) {
      Alert.alert(
        'ファイルサイズ制限',
        `ファイルサイズが上限（100MB）を超えています。現在のサイズ: ${(size / (1024 * 1024)).toFixed(2)}MB`
      );
      return false;
    }
    
    // モバイル通信かつ大きなファイルの場合はWi-Fi推奨アラート
    if (size > WIFI_RECOMMENDED_SIZE && (networkType === 'cellular' || networkType === 'unknown')) {
      Alert.alert(
        'Wi-Fi接続の推奨',
        `大きなファイル（${(size / (1024 * 1024)).toFixed(2)}MB）をアップロードしようとしています。このファイルは40MB以上の大きさがあります。モバイルデータ通信量を節約するため、Wi-Fi接続への切り替えをおすすめします。`,
        [
          { text: 'キャンセル', style: 'cancel' },
          { 
            text: 'このまま続ける', 
            onPress: () => {
              // 選択したファイル情報をセット（続行を選択した場合）
              if (selectedFile && onFileSelected) {
                onFileSelected(selectedFile);
              }
            }
          }
        ]
      );
      return false; // アラート表示後は一旦処理を中断
    }
    
    return true;
  };

  // ファイル情報を正規化
  const normalizeFileInfo = async (uri: string, name?: string, type?: string, size?: number): Promise<SelectedFile> => {
    try {
      // ファイル名がなければURIから取得
      const fileName = name || uri.split('/').pop() || 'file';
      
      // ファイルサイズを取得 (なければFileSystemから取得)
      let fileSize = size;
      if (!fileSize) {
        try {
          const fileInfo = await FileSystem.getInfoAsync(uri);
          if (fileInfo.exists && 'size' in fileInfo) {
            fileSize = fileInfo.size;
          }
        } catch (e) {
          console.log('ファイルサイズ取得エラー:', e);
        }
      }
      
      // ファイル形式を推測 (なければ拡張子から判断)
      let mimeType = type;
      if (!mimeType) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        if (ext === 'mp3') mimeType = 'audio/mpeg';
        else if (ext === 'wav') mimeType = 'audio/wav';
        else if (ext === 'm4a') mimeType = 'audio/m4a';
        else mimeType = 'audio/*';
      }
      
      return {
        uri,
        name: fileName,
        type: mimeType,
        size: fileSize
      };
    } catch (error) {
      console.error('ファイル情報の正規化エラー:', error);
      // 最低限の情報で返す
      return {
        uri,
        name: name || 'file'
      };
    }
  };

  // ファイル選択ハンドラー - iOS向けDocument Picker優先
  const selectFile = async (fileTypes?: string | string[]) => {
    try {
      console.log('ファイル選択を開始します...', Platform.OS);
      
      // 単一のファイルタイプとして扱う
      // 音声ファイルのタイプを明示的に指定
      let fileType: string | string[] = 'audio/*';
      
      // 有効なfileTypesが渡された場合のみ使用
      if (fileTypes && typeof fileTypes === 'string') {
        fileType = fileTypes;
      } else if (Array.isArray(fileTypes) && fileTypes.length > 0 && typeof fileTypes[0] === 'string') {
        fileType = fileTypes[0];
      }
      
      // iOSの場合は、より具体的なタイプを設定
      if (Platform.OS === 'ios') {
        // audioが指定されていれば配列に変換（より多くの音声形式をサポート）
        if (fileType === 'audio/*') {
          fileType = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/mp4', 'public.audio'];
        }
      }
      
      console.log('使用するファイルタイプ:', typeof fileType === 'string' ? fileType : JSON.stringify(fileType));
      
      // ドキュメントピッカーを使用 (プラットフォーム共通)
      try {
        console.log('Document Pickerを使用');
        
        // ピッカーのオプションを設定
        const pickerOptions: DocumentPickerOptions = {
          type: fileType,
          copyToCacheDirectory: true
        };
        
        // iOSのみの追加設定
        if (Platform.OS === 'ios') {
          console.log('iOS用の拡張設定を適用');
          // 任意のプロパティを追加
          (pickerOptions as any).UTIs = ['public.audio', 'public.mp3', 'public.wav', 'public.m4a'];
          (pickerOptions as any).presentationStyle = 'pageSheet';
          (pickerOptions as any).shouldShowFileExtensions = true;
        }
        
        // ドキュメントピッカーを開く
        console.log('ピッカーを開きます', pickerOptions);
        const result = await getDocumentAsync(pickerOptions);
        console.log('ピッカー結果:', result.canceled ? 'キャンセル' : '選択完了');
        
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const file = result.assets[0];
          console.log('選択されたファイル情報:', file.name, file.mimeType);
          
          const fileInfo = await normalizeFileInfo(
            file.uri,
            file.name,
            file.mimeType,
            file.size
          );
          
          // ファイルサイズチェック
          if (!checkFileSize(fileInfo.size)) {
            return;
          }
          
          setSelectedFile(fileInfo);
          if (onFileSelected) onFileSelected(fileInfo);
          return;
        } else {
          console.log('ファイル選択がキャンセルされました');
          return;
        }
      } catch (e) {
        console.error('Document Picker失敗:', e);
        handleError(e, 'ファイル選択ダイアログでエラーが発生しました');
        
        // Android向けにのみフォールバック
        if (Platform.OS !== 'ios') {
          console.log('Androidでフォールバック処理を実行');
          await fallbackToImagePicker();
        }
        return;
      }
    } catch (error) {
      handleError(error);
    }
  };
  
  // Android向けのフォールバック処理
  const fallbackToImagePicker = async () => {
    try {
      console.log('フォールバック: ImagePickerを使用');
      
      // 権限チェック
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('権限エラー', 'メディアライブラリへのアクセス権限が必要です');
        return;
      }
      
      // ImagePickerを実行
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        const fileInfo = await normalizeFileInfo(
          asset.uri,
          asset.uri.split('/').pop(),
          'audio/*',
          undefined
        );
        
        // ファイルサイズチェック
        if (!checkFileSize(fileInfo.size)) {
          return;
        }
        
        setSelectedFile(fileInfo);
        if (onFileSelected) onFileSelected(fileInfo);
      }
    } catch (e) {
      console.error('ImagePicker失敗:', e);
      handleError(e, 'メディアライブラリでのファイル選択に失敗しました');
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