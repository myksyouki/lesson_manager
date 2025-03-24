// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 除外するディレクトリとモジュールを指定
config.resolver.blockList = [
  /dify_standard\/.*/,
  /functions\/.*/,
  /firebase-functions\/.*/,
];

// extraNodeModulesでモジュール解決を上書き
config.resolver.extraNodeModules = {
  'firebase-functions': path.resolve(__dirname, './empty-module.js'),
  'firebase-admin': path.resolve(__dirname, './empty-module.js'),
};

// resolverエイリアスを設定
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

// プロジェクトのwatchFoldersを設定
config.watchFolders = [__dirname];

module.exports = config; 