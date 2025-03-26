// サーバーサイドモジュールの代替として使用する空のモジュール
// すべての関数呼び出しが空のオブジェクトを返すプロキシで実装

const emptyFunction = () => ({});
const emptyObject = {};

// Firebase Functions v2のhttpsスタブ
const https = {
  onCall: () => emptyFunction,
  onRequest: () => emptyFunction
};

// Firebase Functionsの主要な機能をスタブ実装
module.exports = {
  // v2 API
  https,
  // v1 API
  region: () => emptyFunction,
  httpsCallable: () => emptyFunction,
  getFunctions: () => emptyObject,
  connectFunctionsEmulator: () => emptyFunction,
  // その他のメソッドとプロパティに対するプロキシ
  __esModule: true
}; 