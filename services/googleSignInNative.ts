import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { configureGoogleSignIn, handleGoogleSignInError, GoogleSignin, refreshGoogleToken } from './googleSignInCommon';
import { Platform } from 'react-native';

// Google認証でサインインする
export const signInWithGoogleNative = async () => {
  try {
    // 常に初期化を実行
    configureGoogleSignIn();
    
    // Play Servicesが利用可能か確認（iOSでは関係ないがエラー処理のため）
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (error: unknown) {
      console.log('Play Services is not available', error);
      // Expo開発環境ではエラーを表示
      if (typeof error === 'object' && error !== null && 'message' in error && 
          typeof error.message === 'string' && error.message.includes('not correctly linked')) {
        throw new Error('開発環境ではGoogleサインインを利用できません。実機ビルドが必要です。');
      }
      
      // iOSではエラーを無視して続行（PlayServicesはAndroidのみ）
      if (Platform.OS === 'ios') {
        console.log('iOSではPlay Servicesは使用しないため続行します');
      } else {
        throw error;
      }
    }
    
    // 既存のサインイン情報をクリア
    try {
      await GoogleSignin.signOut();
      console.log('サインアウト完了');
    } catch (error) {
      console.log('サインアウト失敗', error);
      // エラーを無視して続行
    }
    
    // GoogleSignInでサインイン
    const userInfo = await GoogleSignin.signIn();
    console.log('Google Sign-In成功:', userInfo);
    
    // IDトークンがない場合はエラー
    if (!userInfo.idToken) {
      throw new Error('IDトークンが取得できませんでした');
    }
    
    // Firebaseの認証情報を作成
    const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
    
    // Firebaseでサインイン
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('Firebase Sign-In成功:', userCredential.user.uid);
    
    // ユーザーが既に存在するか確認
    const userRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userRef);
    
    let isNewUser = false;
    
    if (!userDoc.exists()) {
      // 新規ユーザーの場合、プロファイルを作成
      await setDoc(userRef, {
        email: userCredential.user.email,
        createdAt: new Date(),
        selectedInstrument: '',
        selectedModel: '',
        isPremium: false,
        isOnboardingCompleted: false
      });
      
      isNewUser = true;
    }
    
    return { user: userCredential.user, isNewUser };
  } catch (error: unknown) {
    console.error('Google Sign-In Error:', error);
    const errorMessage = handleGoogleSignInError(error);
    throw new Error(errorMessage);
  }
};

// サイレントサインイン（以前にログインしたユーザーの自動ログイン）
export const silentSignInWithGoogle = async () => {
  try {
    configureGoogleSignIn();
    
    // サイレントサインインを試みる
    const userInfo = await GoogleSignin.signInSilently();
    console.log('Silent Google Sign-In成功:', userInfo);
    
    // IDトークンがない場合はエラー
    if (!userInfo.idToken) {
      throw new Error('IDトークンが取得できませんでした');
    }
    
    // Firebaseの認証情報を作成
    const googleCredential = GoogleAuthProvider.credential(userInfo.idToken);
    
    // Firebaseでサインイン
    const userCredential = await signInWithCredential(auth, googleCredential);
    console.log('Firebase Silent Sign-In成功:', userCredential.user.uid);
    
    return { user: userCredential.user, isNewUser: false };
  } catch (error: unknown) {
    console.log('Silent Google Sign-In失敗:', error);
    // サイレントログイン失敗はエラーとして扱わない
    return null;
  }
};

// トークンの更新処理
export const refreshGoogleAuthentication = async () => {
  try {
    // トークンを更新
    const newIdToken = await refreshGoogleToken();
    
    if (!newIdToken) {
      throw new Error('トークンの更新に失敗しました');
    }
    
    // 新しいトークンでFirebase認証情報を更新
    const googleCredential = GoogleAuthProvider.credential(newIdToken);
    const userCredential = await signInWithCredential(auth, googleCredential);
    
    console.log('Token refresh成功:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: unknown) {
    console.error('Token refresh失敗:', error);
    throw error;
  }
};

// サインアウト
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    await auth.signOut();
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
}; 