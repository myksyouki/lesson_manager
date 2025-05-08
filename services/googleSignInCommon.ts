// ネイティブモジュールが存在しない場合に備えたダミー実装
const DummyGoogleSignin = {
  configure: () => console.log('Dummy GoogleSignin.configure called'),
  hasPlayServices: async () => true,
  signIn: async () => {
    throw new Error('開発環境ではGoogleサインインを利用できません。実機ビルドが必要です。');
  },
  signOut: async () => console.log('Dummy GoogleSignin.signOut called'),
};

// ダミーのエラーコード
const DummyStatusCodes = {
  SIGN_IN_CANCELLED: 'sign_in_cancelled',
  IN_PROGRESS: 'in_progress',
  PLAY_SERVICES_NOT_AVAILABLE: 'play_services_not_available'
};

// GoogleSigninモジュールの安全なインポート
let GoogleSignin;
let statusCodes;

try {
  // 実際のモジュールの読み込みを試みる
  const GoogleSigninModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = GoogleSigninModule.GoogleSignin;
  statusCodes = GoogleSigninModule.statusCodes || DummyStatusCodes;
} catch (error) {
  // モジュールが読み込めない場合はダミー実装を使用
  console.warn('GoogleSignin モジュールを読み込めませんでした。ダミー実装を使用します。', error);
  GoogleSignin = DummyGoogleSignin;
  statusCodes = DummyStatusCodes;
}

import Constants from 'expo-constants';

// GoogleSigninの初期化
export const configureGoogleSignIn = () => {
  try {
    console.log('Configuring GoogleSignin with: ', {
      webClientId: Constants.expoConfig?.extra?.expoPublicGoogleWebClientId,
      iosClientId: Constants.expoConfig?.extra?.expoPublicGoogleIosClientId,
    });
    
    GoogleSignin.configure({
      webClientId: Constants.expoConfig?.extra?.expoPublicGoogleWebClientId,
      iosClientId: Constants.expoConfig?.extra?.expoPublicGoogleIosClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  } catch (error) {
    console.error('GoogleSignin設定エラー:', error);
  }
};

// GoogleSignInエラーコード - ダミーの定数を使用
export const GOOGLE_SIGNIN_ERROR = statusCodes || DummyStatusCodes;

// GoogleSignInエラーを処理する共通関数
export const handleGoogleSignInError = (error: any): string => {
  console.error('Google Sign-In Error:', error);
  
  if (!error) {
    return 'エラーが発生しました';
  }
  
  // エラーメッセージをチェック
  if (error.message) {
    if (error.message.includes('sign_in_cancelled') || 
        error.message.includes('canceled') || 
        error.message.includes('cancelled')) {
      return 'ユーザーがサインインをキャンセルしました';
    } else if (error.message.includes('in_progress')) {
      return 'サインイン処理が進行中です';
    } else if (error.message.includes('play_services_not_available')) {
      return 'Play Servicesが利用できません';
    } else if (error.message.includes('not correctly linked')) {
      return '開発環境ではGoogleサインインを利用できません。実機ビルドが必要です。';
    }
  }
  
  // エラーコードをチェック
  if (error.code) {
    const errorCode = typeof error.code === 'string' ? error.code : String(error.code);
    if (errorCode.includes('sign_in_cancelled') || 
        errorCode.includes('canceled') || 
        errorCode.includes('cancelled') ||
        errorCode === '12501') {
      return 'ユーザーがサインインをキャンセルしました';
    } else if (errorCode.includes('in_progress') || errorCode === '12502') {
      return 'サインイン処理が進行中です';
    } else if (errorCode.includes('play_services_not_available') || errorCode === '12500') {
      return 'Play Servicesが利用できません';
    }
  }
  
  return error.message || 'Googleサインインに失敗しました';
}; 

// GoogleSigninのエクスポート（ダミー実装も含む）
export { GoogleSignin, statusCodes }; 