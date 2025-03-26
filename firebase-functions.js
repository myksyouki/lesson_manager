// Firebase Functionsスタブ
// モバイルアプリビルドで使用される代替モジュール

const emptyFunction = () => () => Promise.resolve({ data: {} });

// Firebase Functions v2のhttpsスタブ
const https = {
  onCall: () => () => {},
  onRequest: () => () => {}
};

// v1 API用スタブ
const region = () => ({});
const httpsCallable = () => async () => ({ data: {} });
const getFunctions = () => ({ region: 'asia-northeast1' });
const connectFunctionsEmulator = () => {};

// エクスポート
module.exports = {
  https,
  region,
  httpsCallable,
  getFunctions,
  connectFunctionsEmulator
}; 