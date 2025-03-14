import React, { useEffect, useRef } from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from './store/auth';
import { Linking, Alert } from 'react-native';
import { router } from 'expo-router';

export default function Index() {
  const { user } = useAuthStore();
  const initialURLProcessed = useRef(false);
  
  useEffect(() => {
    // 共有されたファイルを処理する関数
    const handleSharedContent = async (url: string) => {
      try {
        if (!user) {
          console.log('ユーザーがログインしていません');
          return;
        }
        
        // 有効なURLかどうかを確認
        if (!url || url === 'undefined' || url === 'null' || url === '') {
          console.log('無効なURL:', url);
          return;
        }
        
        // 音声ファイルのURLかどうかを確認（簡易的な判定）
        if (!url.includes('file://') || url.length < 10) {
          console.log('音声ファイルのURLではないようです:', url);
          return;
        }
        
        console.log('共有URL:', url);
        
        // URLからファイル情報を取得
        const fileName = url.split('/').pop() || `shared_audio_${Date.now()}.m4a`;
        
        // 共有画面に遷移
        router.push({
          pathname: '/shared-audio',
          params: { uri: url, fileName }
        });
      } catch (error) {
        console.error('共有コンテンツ処理エラー:', error);
        // エラーが発生してもホーム画面に戻らないようにする
      }
    };

    // アプリ起動時のURLハンドリング（初回のみ実行）
    const handleInitialURL = async () => {
      // すでに処理済みの場合は実行しない
      if (initialURLProcessed.current) {
        console.log('初期URLは既に処理済みです');
        return;
      }
      
      try {
        const url = await Linking.getInitialURL();
        
        // 初期URLを処理済みとしてマーク
        initialURLProcessed.current = true;
        
        if (url && user && url.length > 10 && url !== 'undefined' && url !== 'null' && url !== '' && url.includes('file://')) {
          console.log('初期URL検出:', url);
          handleSharedContent(url);
        } else {
          console.log('初期URLなし、または未ログイン、または無効なURL:', url);
        }
      } catch (error) {
        console.error('初期URL処理エラー:', error);
      }
    };

    // ユーザーがログインしている場合のみ初期URLを処理
    if (user) {
      handleInitialURL();
    }

    // アプリがバックグラウンドにある時のURLハンドリング
    const subscription = Linking.addEventListener('url', (event) => {
      if (event.url && user && event.url.includes('file://') && event.url.length > 10) {
        console.log('URLイベント検出:', event.url);
        handleSharedContent(event.url);
      } else {
        console.log('無効なURLイベントをスキップします:', event.url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [user]); // userを依存配列に追加
  
  // Redirect to the appropriate screen based on authentication status
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
