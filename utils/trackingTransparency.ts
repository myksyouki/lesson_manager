import { Platform, Platform as RNPlatform } from 'react-native';
import { 
  requestTrackingPermission,
  getTrackingStatus,
  TrackingStatus
} from 'react-native-tracking-transparency';

/**
 * App Tracking Transparency (ATT) に関連するユーティリティ関数
 */

/**
 * ユーザーにトラッキング許可をリクエストする
 * iOSのみで有効、Androidではデフォルトで'authorized'を返す
 * @returns トラッキング許可のステータス
 */
export const requestTracking = async (): Promise<TrackingStatus> => {
  try {
    // iOSのみ必要（iOS 14以上）
    if (Platform.OS !== 'ios') {
      console.log('トラッキング許可: iOSのみで必要');
      return 'authorized'; // Androidではデフォルトで許可として扱う
    }

    // iOS 14以上かどうかを確認
    const iosVersion = parseInt((Platform.Version as string), 10);
    if (Platform.OS === 'ios' && iosVersion < 14) {
      console.log('トラッキング許可: iOS 14未満のため不要');
      return 'authorized';
    }

    // 現在のトラッキングステータスを取得
    const currentStatus = await getTrackingStatus();
    
    // すでに決定済みなら再リクエストしない
    if (currentStatus === 'authorized' || currentStatus === 'denied') {
      console.log('トラッキング許可: すでに決定済み -', currentStatus);
      return currentStatus;
    }
    
    // 許可をリクエスト
    console.log('トラッキング許可をリクエスト中...');
    const status = await requestTrackingPermission();
    console.log('トラッキング許可結果:', status);
    
    return status;
  } catch (error) {
    console.error('トラッキング許可リクエストエラー:', error);
    return 'unavailable';
  }
};

/**
 * 現在のトラッキング許可ステータスを取得
 * @returns トラッキング許可のステータス
 */
export const getCurrentTrackingStatus = async (): Promise<TrackingStatus> => {
  try {
    if (Platform.OS !== 'ios') {
      return 'authorized'; // Androidではデフォルトで許可
    }
    
    // iOS 14以上かどうかを確認
    const iosVersion = parseInt((Platform.Version as string), 10);
    if (Platform.OS === 'ios' && iosVersion < 14) {
      return 'authorized';
    }
    
    const status = await getTrackingStatus();
    return status;
  } catch (error) {
    console.error('トラッキングステータス取得エラー:', error);
    return 'unavailable';
  }
}; 