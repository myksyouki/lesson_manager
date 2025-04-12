import { auth, db } from "../config/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * エラー報告インターフェース
 */
export interface ErrorReport {
  title: string;
  description: string;
  deviceInfo?: string;
  screenshot?: string | null; // Base64エンコードされた画像データURLまたはURI
  userId?: string;
}

/**
 * エラー報告をFirestoreに保存する
 * @param report エラー報告データ
 * @returns 保存結果
 */
export const submitErrorReport = async (report: ErrorReport) => {
  try {
    // ユーザーがログインしているか確認
    const user = auth.currentUser;
    
    // エラー報告データを準備
    const reportData = {
      ...report,
      userId: user?.uid || 'anonymous',
      userEmail: user?.email || 'anonymous',
      createdAt: serverTimestamp(),
      status: 'new', // 'new', 'in-progress', 'resolved'
      appVersion: Constants.expoConfig?.version || '0.0.2' // アプリのバージョン
    };
    
    console.log('エラー報告を送信します:', { 
      title: reportData.title,
      userId: reportData.userId,
      isAnonymous: reportData.userId === 'anonymous'
    });
    
    // Firestoreにエラー報告を保存
    const reportRef = await addDoc(collection(db, "errorReports"), reportData);
    
    console.log('エラー報告が保存されました:', reportRef.id);
    
    return {
      success: true,
      reportId: reportRef.id
    };
  } catch (error) {
    console.error("エラー報告保存エラー:", error);
    return {
      success: false,
      error
    };
  }
};

/**
 * デバイス情報を文字列で取得
 * @returns デバイス情報の文字列
 */
export const getDeviceInfoString = async (): Promise<string> => {
  try {
    // シンプルな方法でデバイス情報を取得
    const os = Platform.OS;
    const version = Platform.Version;
    
    // Android固有のプロパティを安全に取得
    let isEmulator = false;
    if (Platform.OS === 'android' && Platform.constants) {
      isEmulator = (Platform.constants as any).isEmulator || false;
    }
    
    const appName = Constants.expoConfig?.name || 'Unknown';
    const appVersion = Constants.expoConfig?.version || 'Unknown';
    
    return `
アプリ名: ${appName}
アプリバージョン: ${appVersion}
OS: ${os}
OSバージョン: ${version}
エミュレータ: ${isEmulator ? 'はい' : 'いいえ'}
`;
  } catch (error) {
    console.error('デバイス情報取得エラー:', error);
    return 'デバイス情報を取得できませんでした';
  }
}; 