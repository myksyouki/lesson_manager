/**
 * レッスンマネージャー Cloud Functions
 * 音声処理と要約生成のためのエントリーポイント
 */

import * as functions from 'firebase-functions/v1';
import { onCall } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { defineString, defineSecret } from 'firebase-functions/params';

// Firebase初期化
admin.initializeApp();

// AdminSDK初期化
export const db = admin.firestore();
export const storage = admin.storage();

// 環境変数と秘密情報の定義
export const openaiApiKey = defineSecret('OPENAI_API_KEY');
export const geminiApiKey = defineSecret('GEMINI_API_KEY');

// 音声処理とAPI連携処理のインポート
import { processAudio } from './audio-processors';

// 管理機能のインポート
import {
  listInstrumentKnowledge,
  getInstrumentKnowledge,
  deleteInstrumentKnowledge,
  getSupportedInstruments,
  getKnowledgeTemplate
} from './admin/knowledgeManagement';

// 音声処理フロー - v1 API (既存、互換性のため維持)
export const processAudioFunc = functions
  .region('asia-northeast1')
  .https.onCall(processAudio);

/**
 * 拡張音声処理機能 - v2 API
 * 音声ファイルの分割、Whisper文字起こし、要約とタグ生成を行います
 * タイムアウト: 60分、メモリ: 8GB、CPU: 4コア
 */
export const processAudioFuncV2 = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 3600,
  memory: '8GiB',
  cpu: 4,
  minInstances: 0,
  maxInstances: 10
}, async (request) => {
  const { data } = request;
  return processAudio(data, request);
});

/**
 * v2 APIのエイリアス - 互換性のために提供
 * クライアント側の実装変更なしでv2機能を使用できるようにします
 */
export const processAudioV3FuncV2 = processAudioFuncV2;

// Admin API関数のエクスポート
export const adminFunctions = {
  listInstrumentKnowledge,
  getInstrumentKnowledge,
  deleteInstrumentKnowledge,
  getSupportedInstruments,
  getKnowledgeTemplate
};
