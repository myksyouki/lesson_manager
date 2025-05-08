import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { configureGoogleSignIn, handleGoogleSignInError, GoogleSignin } from './googleSignInCommon';

// Google認証でサインインする
export const signInWithGoogleNative = async () => {
  try {
    // 常に初期化を実行
    configureGoogleSignIn();
    
    // Play Servicesが利用可能か確認（iOSでは関係ないがエラー処理のため）
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (error) {
      console.log('Play Services is not available', error);
      // Expo開発環境ではエラーを表示
      if (error.message && error.message.includes('not correctly linked')) {
        throw new Error('開発環境ではGoogleサインインを利用できません。実機ビルドが必要です。');
      }
      // iOSではエラーを無視して続行
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
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    const errorMessage = handleGoogleSignInError(error);
    throw new Error(errorMessage);
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