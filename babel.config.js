module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'expo-router/babel',
      'react-native-reanimated/plugin',
      ['module-resolver', {
        root: ['./'],
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        alias: {
          // サーバーサイドモジュールをモバイルビルドから除外
          'firebase-functions': './firebase-functions.js',
          'firebase-admin': './empty-module.js',
          // アプリのパスエイリアス
          '@app': './app',
        },
      }],
    ],
  };
};