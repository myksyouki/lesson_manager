import React, { useEffect, useState } from 'react';
import { Text, View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from './store/auth';
import { auth } from './config/firebase';

// Firebase Functionsのエミュレータ設定（開発時に必要な場合）
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// const functions = getFunctions();
// if (__DEV__) {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

export default function Root() {
  const { user, isLoading } = useAuthStore();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // 認証状態を確認だけ行い、ナビゲーションはRedirectコンポーネントに任せる
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔍 ルートページで認証状態を確認しています...');
      try {
        // Firebaseの現在の認証状態を確認
        const currentUser = auth.currentUser;
        
        if (!currentUser && !isLoading) {
          console.log('❌ 認証されていないユーザー - ログイン画面に移動します');
          setIsAuthenticated(false);
        } else if (currentUser && !isLoading) {
          console.log('✅ 認証済みユーザー:', currentUser.uid, '- ホームに移動します');
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('認証確認エラー:', error);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };
    
    if (!isLoading && !authChecked) {
      checkAuth();
    }
  }, [isLoading, authChecked]);

  if (isLoading || !authChecked || isAuthenticated === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // 認証状態に基づいて適切なルートにリダイレクト
  if (isAuthenticated) {
    return <Redirect href="/tabs" />;
  } else {
    return <Redirect href="/auth/login" />;
  }
}
