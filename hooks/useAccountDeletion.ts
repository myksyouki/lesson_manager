import { useEffect } from 'react';
import { useAuthStore } from '../store/auth';

/**
 * アカウント削除ステータスを自動的にチェックするカスタムフック
 * 定期的に削除予約情報を取得し、ステータスを更新します
 */
export function useAccountDeletion() {
  // オブジェクト分割代入で直接関数を取得
  const { 
    checkDeletionStatus, 
    cancelAccountDeletion, 
    scheduleAccountDeletion,
    deletionStatus
  } = useAuthStore();
  
  // 削除ステータスの定期チェック
  useEffect(() => {
    // 初回ロード時にチェック
    if (typeof checkDeletionStatus === 'function') {
      // 関数の場合のみ実行
      checkDeletionStatus();
      
      // 5分ごとにステータスを再確認
      const interval = setInterval(() => {
        checkDeletionStatus();
      }, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    } else {
      console.error('checkDeletionStatus is not a function:', checkDeletionStatus);
    }
  }, [checkDeletionStatus]);
  
  return {
    deletionStatus,
    cancelDeletion: cancelAccountDeletion,
    scheduleDeletion: scheduleAccountDeletion
  };
} 