import React, { useEffect } from 'react';
import { View, Text, Button } from 'react-native';
import { useAuthStore } from '../store/auth';

/**
 * アカウント削除機能のデバッグ用コンポーネント
 */
export default function AccountDeletionCheck() {
  const store = useAuthStore();
  
  useEffect(() => {
    // デバッグモードのみコンソール出力
    if (__DEV__) {
      console.log('=== Auth Store Debug ===');
      console.log('checkDeletionStatus:', typeof store.checkDeletionStatus);
      console.log('cancelAccountDeletion:', typeof store.cancelAccountDeletion);
      console.log('scheduleAccountDeletion:', typeof store.scheduleAccountDeletion);
      console.log('deletionStatus:', store.deletionStatus);
      
      // 関数の存在チェック
      if (typeof store.checkDeletionStatus === 'function') {
        console.log('✅ checkDeletionStatus is a function');
        
        // 実行テスト
        try {
          store.checkDeletionStatus();
          console.log('✅ checkDeletionStatus executed successfully');
        } catch (error) {
          console.error('❌ checkDeletionStatus execution failed:', error);
        }
      } else {
        console.error('❌ checkDeletionStatus is NOT a function');
      }
    }
  }, [store]);
  
  // 安全に関数を呼び出すラッパー
  const safelyCheckStatus = () => {
    if (typeof store.checkDeletionStatus === 'function') {
      try {
        store.checkDeletionStatus();
        console.log('Manually triggered status check');
      } catch (error) {
        console.error('Manual status check failed:', error);
      }
    } else {
      console.error('Cannot check status: function not available');
    }
  };
  
  // プロダクションモードでは何も表示しない
  if (!__DEV__) {
    return null;
  }
  
  return (
    <View style={{ padding: 10, backgroundColor: '#f0f0f0', marginVertical: 10 }}>
      <Text style={{ fontWeight: 'bold' }}>アカウント削除ステータスデバッグ</Text>
      <Text>削除予約: {store.deletionStatus?.isScheduledForDeletion ? 'あり' : 'なし'}</Text>
      {store.deletionStatus?.isScheduledForDeletion && (
        <Text>残り日数: {store.deletionStatus.remainingDays}日</Text>
      )}
      <Button 
        title="ステータス手動チェック" 
        onPress={safelyCheckStatus}
      />
    </View>
  );
} 