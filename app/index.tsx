import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { auth } from '../config/firebase';
import { checkOnboardingStatus } from '../services/userProfileService';

// Firebase Functionsのエミュレータ設定（開発時に必要な場合）
// import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
// const functions = getFunctions();
// if (__DEV__) {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

export default function IndexScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const [initializing, setInitializing] = useState(true);
  
  // 適切な画面に遷移
  useEffect(() => {
    let isMounted = true;
    
    const checkAuthAndRedirect = async () => {
      // 少し遅延を入れて他のコンポーネントのマウントを待つ
      await new Promise(resolve => setTimeout(resolve, 200));
      
      try {
        console.log('🔍 認証状態確認中...');
        
        // ユーザーが認証されていない場合
        if (!auth.currentUser && !isLoading) {
          console.log('➡️ ログインへリダイレクト');
          if (isMounted) {
            router.replace('/auth/login');
          }
          return;
        }
        
        // ユーザーが認証されている場合
        if (auth.currentUser) {
          // オンボーディング状態を確認
          const onboardingCompleted = await checkOnboardingStatus();
          
          if (!onboardingCompleted) {
            console.log('➡️ オンボーディングへリダイレクト');
            if (isMounted) {
              router.replace('/onboarding');
            }
          } else {
            console.log('➡️ メイン画面へリダイレクト');
            if (isMounted) {
              router.replace('/tabs');
            }
          }
        }
      } catch (error) {
        console.error('認証確認エラー:', error);
        if (isMounted) {
          router.replace('/auth/login');
        }
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    };
    
    checkAuthAndRedirect();
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, [isLoading, router]);
  
  // ローディング中の表示
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007BFF" />
      <Text style={styles.loadingText}>読み込み中...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#333',
  },
});
