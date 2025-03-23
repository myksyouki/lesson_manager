/**
 * レッスンマネージャー Cloud Functions
 * 音声処理と要約生成のためのエントリーポイント
 */

import * as functions from 'firebase-functions/v1';
import { onCall } from 'firebase-functions/v2/https';
import { db, storage } from './config';

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
 * 拡張音声処理機能 - v2 API (統合版)
 * 音声ファイルの分割、Whisper文字起こし、要約とタグ生成を行います
 * タイムアウト: 60分、メモリ: 8GB、CPU: 4コア
 * 最大インスタンス数: 50 (同時処理能力向上)
 */
export const processAudioV3FuncV2 = onCall({
  region: 'asia-northeast1',
  timeoutSeconds: 3600,
  memory: '8GiB',
  cpu: 4,
  minInstances: 0,
  maxInstances: 50
}, async (request) => {
  const { data } = request;
  return processAudio(data, request);
});

// Admin API関数のエクスポート
export const adminFunctions = {
  listInstrumentKnowledge,
  getInstrumentKnowledge,
  deleteInstrumentKnowledge,
  getSupportedInstruments,
  getKnowledgeTemplate
};
