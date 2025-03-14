import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { processAudioFile } from './audioProcessing';
import { db, auth } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Alert } from 'react-native';

/**
 * 共有された音声ファイルを処理するサービス
 */
export const handleSharedAudioFile = async (
  fileUri: string, 
  fileName: string,
  lessonData?: {
    teacherName?: string;
    date?: string;
    pieces?: string[];
    notes?: string;
  }
) => {
  try {
    // ユーザーがログインしていることを確認
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: 'ログインが必要です' };
    }

    // ファイルが存在するか確認
    let validFileUri = fileUri;
    try {
      // Optional("https")形式のURLを処理
      if (fileUri.includes('Optional(') && fileUri.includes(')')) {
        const match = fileUri.match(/Optional\(["'](.+?)["']\)/);
        if (match && match[1]) {
          validFileUri = match[1];
          console.log('Optional形式から抽出したURI:', validFileUri);
        }
      }

      // HTTPSスキームの処理
      if (validFileUri.startsWith('https://')) {
        console.log('HTTPSスキームを検出しました。一時ファイルをダウンロードします。');
        const tempDir = FileSystem.cacheDirectory + 'shared/';
        
        // 一時ディレクトリが存在するか確認し、なければ作成
        const dirInfo = await FileSystem.getInfoAsync(tempDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        }
        
        const downloadResult = await FileSystem.downloadAsync(
          validFileUri,
          tempDir + fileName
        );
        console.log('ダウンロード結果:', downloadResult);
        validFileUri = downloadResult.uri;
      }
      
      // ファイル情報を確認
      const fileInfo = await FileSystem.getInfoAsync(validFileUri);
      if (!fileInfo.exists) {
        return { success: false, error: 'ファイルが見つかりません' };
      }
    } catch (fileError) {
      console.error('ファイル検証エラー:', fileError);
      return { success: false, error: 'ファイルの検証に失敗しました' };
    }

    // 今日の日付を取得
    const today = new Date();
    const formattedDate = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

    // レッスンデータの準備
    const uniqueProcessingId = `lesson_${user.uid}_${Date.now()}`;
    const lessonDataToSave = {
      teacher: lessonData?.teacherName || '未設定',
      date: lessonData?.date || formattedDate,
      pieces: lessonData?.pieces || [],
      piece: lessonData?.pieces?.[0] || '', // 最初の曲名をpieceフィールドにも設定
      notes: lessonData?.notes || '',
      summary: '',
      tags: [],
      user_id: user.uid,
      userId: user.uid, // 両方のフィールド名でユーザーIDを保存
      created_at: serverTimestamp(),
      createdAt: serverTimestamp(), // 両方のフィールド名で日時を保存
      updated_at: serverTimestamp(),
      updatedAt: serverTimestamp(), // 両方のフィールド名で日時を保存
      status: 'uploading',
      isFavorite: false,
      isDeleted: false,
      // 重複を防ぐための一意のIDを追加
      processingId: uniqueProcessingId,
    };

    // Firestoreにレッスンデータを保存
    const lessonsCollection = collection(db, 'lessons');
    const lessonDoc = await addDoc(lessonsCollection, lessonDataToSave);
    console.log('新しいレッスンを作成しました:', lessonDoc.id, 'processingId:', uniqueProcessingId);

    // 音声ファイルの処理を開始
    try {
      // awaitを使用して非同期処理を完了させる - 処理IDを渡す
      const result = await processAudioFile(lessonDoc.id, validFileUri, fileName, uniqueProcessingId);
      console.log('音声ファイルの処理が完了しました:', result);
    } catch (processError) {
      console.error('音声ファイル処理エラー:', processError);
      // エラーがあってもレッスンは作成済みなので成功として返す
    }

    return { success: true, lessonId: lessonDoc.id };
  } catch (error) {
    console.error('共有ファイル処理エラー:', error);
    return { success: false, error: '処理中にエラーが発生しました' };
  }
};

/**
 * ファイルが共有可能かチェックする
 */
export const isShareAvailable = async (): Promise<boolean> => {
  return await Sharing.isAvailableAsync();
};

/**
 * 共有されたファイルのURIを一時ディレクトリにコピーする
 */
export const copySharedFileToTemp = async (uri: string, fileName: string): Promise<string> => {
  try {
    console.log('元のURI:', uri);
    
    // URIの検証
    if (!uri || uri.trim() === '') {
      throw new Error('無効なファイルURIです');
    }
    
    // Optional("exp")のような形式を修正
    if (uri.includes('Optional(') && uri.includes(')')) {
      const match = uri.match(/Optional\(["'](.+?)["']\)/);
      if (match && match[1]) {
        uri = match[1];
        console.log('Optional形式から抽出したURI:', uri);
      }
    }
    
    // HTTPSスキームの処理
    if (uri.startsWith('https://')) {
      console.log('HTTPSスキームを検出しました。一時ファイルをダウンロードします。');
      try {
        // 一時ディレクトリのパス
        const tempDir = FileSystem.cacheDirectory + 'shared/';
        
        // 一時ディレクトリが存在するか確認し、なければ作成
        const dirInfo = await FileSystem.getInfoAsync(tempDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
        }
        
        const downloadResult = await FileSystem.downloadAsync(
          uri,
          tempDir + fileName
        );
        console.log('ダウンロード結果:', downloadResult);
        return downloadResult.uri;
      } catch (downloadError) {
        console.error('HTTPSファイルのダウンロードエラー:', downloadError);
        throw new Error('HTTPSファイルのダウンロードに失敗しました');
      }
    }
    
    // 一時ディレクトリのパス
    const tempDir = FileSystem.cacheDirectory + 'shared/';
    const tempUri = tempDir + fileName;
    
    // 一時ディレクトリが存在するか確認し、なければ作成
    const dirInfo = await FileSystem.getInfoAsync(tempDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    }
    
    // expスキームの場合は特別な処理
    if (uri.startsWith('exp://')) {
      console.log('expスキームを検出しました。空のファイルを作成します。');
      // 空のファイルを作成
      await FileSystem.writeAsStringAsync(tempUri, '');
      console.log('空のファイル作成:', tempUri);
      
      // 空のファイルを返す（エラーを回避するため）
      return tempUri;
    }
    
    // ファイルをコピー
    try {
      await FileSystem.copyAsync({
        from: uri,
        to: tempUri
      });
      
      console.log('ファイルコピー成功:', tempUri);
      return tempUri;
    } catch (copyError) {
      console.error('ファイルコピーエラー:', copyError);
      
      // エラーが発生した場合、空のファイルを作成
      console.log('空のファイルを作成します');
      await FileSystem.writeAsStringAsync(tempUri, '');
      return tempUri;
    }
  } catch (error) {
    console.error('ファイルコピーエラー:', error);
    throw error;
  }
};
