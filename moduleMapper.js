// モジュールマッパー - サーバーサイドモジュールをクライアントビルドで解決するためのスタブ

// 空の関数とオブジェクト
const emptyFunction = () => ({});
const emptyObject = {};

// Firebaseモジュールのスタブ
const firebase = {
  getFunctions: () => ({
    region: 'asia-northeast1'
  }),
  connectFunctionsEmulator: () => {},
  httpsCallable: () => async () => ({ data: {} }),
  functions: emptyObject
};

// HTTP関数スタブ
const https = {
  onCall: () => emptyFunction,
  onRequest: () => emptyFunction
};

// エクスポート
module.exports = {
  ...firebase,
  https,
  __esModule: true
}; 