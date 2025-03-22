/**
 * レッスンマネージャー Cloud Functions
 */

import * as functions from 'firebase-functions/v1';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { defineString, defineSecret } from 'firebase-functions/params';
import * as https from 'firebase-functions/v1/https';

// Firebase初期化
admin.initializeApp();

// AdminSDK初期化
const db = admin.firestore();
const storage = admin.storage();

// 環境変数と秘密情報の定義
export const openaiApiKey = defineSecret('OPENAI_API_KEY');
export const difyApiUrl = defineString('DIFY_API_URL');
export const difySummaryApiKey = defineSecret('DIFY_SUMMARY_API_KEY');
export const difySummaryAppId = defineString('DIFY_SUMMARY_APP_ID');

// 音声処理とDify連携処理のインポート
import { processAudio } from './audio-processors';

// エクスポート - 内部関数
export {
  processAudio
};

// 音声処理フロー - v1 API (既存)
export const processAudioFunc = functions
  .region('asia-northeast1')
  .https.onCall(processAudio);

// 音声処理フロー - v2 API (新規)
/**
 * 3段階処理（分割→Whisper→Dify）による音声処理 (v2 API版)
 * タイムアウト: 60分、メモリ: 8GB、CPU: 4コア
 */
export const processAudioFuncV2 = onCall({
    region: 'asia-northeast1',
  timeoutSeconds: 3600, // 60分のタイムアウト
  memory: '8GiB',      // メモリ設定を8GiBに増強
  cpu: 4,              // CPUコア数を4コアに増強
  minInstances: 0,     // 最小インスタンス数
  maxInstances: 10     // 最大インスタンス数
}, async (request) => {
  const { data } = request;
  return processAudio(data, request);
});

// 音声処理フロー - v3 API (新規) - クライアント側の呼び出しに合わせたエイリアス
/**
 * processAudioFuncV2と同じ処理を行うが、フロントエンド互換性のためにprocessAudioV3FuncV2という名前で提供
 * タイムアウト: 60分、メモリ: 8GB、CPU: 4コア
 */
export const processAudioV3FuncV2 = onCall({
    region: 'asia-northeast1',
  timeoutSeconds: 3600, // 60分のタイムアウト
  memory: '8GiB',      // メモリ設定を8GiBに増強
  cpu: 4,              // CPUコア数を4コアに増強
  minInstances: 0,     // 最小インスタンス数
  maxInstances: 10     // 最大インスタンス数
}, async (request) => {
  const { data } = request;
  return processAudio(data, request);
});
