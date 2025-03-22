/**
 * Genkit処理モジュール
 * 
 * Google Generative AIを使用して音声の文字起こし、要約、タグ生成を処理
 */

import { GoogleGenerativeAI, GenerativeModel, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { SpeechClient, protos } from '@google-cloud/speech';
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as util from 'util';
import * as dotenv from 'dotenv';
import { getStorage } from 'firebase-admin/storage';
import * as crypto from 'crypto';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import { defineString } from 'firebase-functions/params';
import axios from 'axios';

dotenv.config();

const GENAI_API_KEY = process.env.GENAI_API_KEY || '';

// OpenAI API Keyのパラメータ定義
const openaiApiKey = defineString('OPENAI_API_KEY');

// OpenAI APIクライアントの初期化
const getOpenAIClient = () => {
  const apiKey = openaiApiKey.value();
  if (!apiKey) {
    throw new Error('OpenAI APIキーが設定されていません。firebase functions:config:set openai.api_key="YOUR_KEY"で設定してください。');
  }
  return new OpenAI({ apiKey });
};

// Gemini APIクライアントの初期化
const getGeminiClient = () => {
  return new GoogleGenerativeAI(GENAI_API_KEY);
};

// Promiseベースのファイル操作
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);
const mkdir = util.promisify(fs.mkdir);

// Speech-to-Textクライアントを初期化
const speechClient = new SpeechClient();

// 楽器のナレッジベースを保存するFirestoreコレクション
const KNOWLEDGE_COLLECTION = 'instrumentKnowledge';

/**
 * 共通の要約フォーマット
 */
const COMMON_SUMMARY_FORMAT = `
TRANSCRIPTION_PLACEHOLDERはINSTRUMENT_PLACEHOLDERのレッスンの文字起こしデータです。この内容を、セクションごとに整理し、指摘内容・課題・練習アドバイスを簡潔にまとめてください。
専門用語や基礎知識については以下のナレッジを参考にして回答してください。

【INSTRUMENT_PLACEHOLDERに関する専門知識】
KNOWLEDGE_PLACEHOLDER

【要件】
- レッスンの内容をセクション単位（例：基礎練習、エチュード、曲名ごと）で分けて要約してください。
- 各セクションで「指摘内容」「今後の課題」「練習アドバイス」の3つを明確に分類してください。
- 雑談や無関係な話題は省き、重要な部分に焦点を当ててください。
- ユーザーがわかりやすく、見やすく "復習" できるように出力してください
- 各セクション400字程度にまとめてください

【フォーマット（例）】

■ セクション1：基礎練習（ロングトーン・スケール）
1. 指摘内容：

2. 今後の課題：

3. 練習アドバイス：

---

■ セクション2：エチュード（例：○○教本 第3番）
1. 指摘内容：

2. 今後の課題：

3. 練習アドバイス：

---

■ セクション3：曲（曲名：[INSTRUMENT_EXAMPLE]）
1. 指摘内容：

2. 今後の課題：

3. 練習アドバイス：

---

セクションはレッスンの内容に応じて柔軟に設定してください。
`;

/**
 * 共通のタグフォーマット
 */
const COMMON_TAGS_FORMAT = `
あなたはプロの音楽講師です。以下は[INSTRUMENT_TYPE]レッスンの録音文字起こしです。
このレッスンの内容を表す重要なキーワードやタグを3つだけ抽出してください。
各タグは単語1つ（複合語を含む）で表現してください。
レッスンの主要テーマに関連する単語を選んでください。

タグ形式: "タグ1", "タグ2", "タグ3"（厳密に3つのみ）
`;

/**
 * 楽器に応じた楽曲例を返す
 * @param instrumentName 楽器名
 * @returns 楽曲例
 */
function getInstrumentExample(instrumentName: string): string {
  const instrument = instrumentName.toLowerCase();
  
  if (instrument.includes('piano') || instrument.includes('ピアノ')) return 'ピアノソナタ';
  if (instrument.includes('violin') || instrument.includes('バイオリン')) return 'ヴァイオリン協奏曲';
  if (instrument.includes('viola') || instrument.includes('ビオラ')) return 'ビオラソナタ';
  if (instrument.includes('cello') || instrument.includes('チェロ')) return 'チェロ協奏曲';
  if (instrument.includes('flute') || instrument.includes('フルート')) return 'フルート協奏曲';
  if (instrument.includes('sax') || instrument.includes('サックス')) return 'サックス協奏曲';
  if (instrument.includes('guitar') || instrument.includes('ギター')) return 'ギターソナタ';
  if (instrument.includes('bass') || instrument.includes('ベース')) return 'ベースソロ';
  if (instrument.includes('drum') || instrument.includes('ドラム')) return 'ドラムソロ';
  if (instrument.includes('vocal') || instrument.includes('ボーカル')) return 'アリア';
  
  return '曲例';
}

/**
 * 楽器タイプに基づいた要約プロンプトを生成する
 * @param instrumentName 楽器名
 * @param knowledgeBase 楽器の専門知識
 * @param transcription 文字起こしテキスト
 * @returns 楽器に適したプロンプト
 */
function getSummaryPromptForGemini(
  instrumentName: string,
  knowledgeBase: string = '',
  transcription: string = ''
): string {
  // 共通フォーマットを使用し、必要なプレースホルダーを置換
  const instrumentExample = getInstrumentExample(instrumentName);
  let prompt = COMMON_SUMMARY_FORMAT
    .replace('[INSTRUMENT_EXAMPLE]', instrumentExample)
    .replace(/INSTRUMENT_PLACEHOLDER/g, instrumentName)
    .replace('KNOWLEDGE_PLACEHOLDER', knowledgeBase)
    .replace('TRANSCRIPTION_PLACEHOLDER', transcription);
    
  return prompt;
}

/**
 * 音声ファイルから文字起こしを行う
 * @param filePath 音声ファイルのローカルパス
 * @param languageCode 言語コード（デフォルト: ja-JP）
 */
export async function transcribeAudio(filePath: string, languageCode = 'ja-JP'): Promise<string> {
  console.log(`音声ファイルの文字起こしを開始: ${filePath}`);
  
  // ファイルをバイナリデータとして読み込む
  const content = await readFile(filePath);
  
  // 音声認識のリクエスト
  const request: protos.google.cloud.speech.v1.IRecognizeRequest = {
    audio: {
      content: content.toString('base64'),
    },
    config: {
      encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.MP3,
      sampleRateHertz: 44100,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      useEnhanced: true,
    },
  };
  
  try {
    const [response] = await speechClient.recognize(request);
    const transcription = response.results
      ?.map(result => result.alternatives?.[0]?.transcript)
      .filter(Boolean)
      .join('\n') || '';
    
    console.log(`文字起こし完了: ${transcription.length} 文字`);
    return transcription;
  } catch (error) {
    console.error('文字起こし中にエラーが発生:', error);
    throw error;
  }
}

/**
 * 長い音声ファイルを分割して文字起こし
 * @param filePath 音声ファイルのローカルパス
 * @param tmpDir 一時ディレクトリ
 * @param languageCode 言語コード
 */
export async function transcribeLongAudio(
  audioUrl: string, 
  tmpDir: string, 
  progressCallback?: (progress: number) => Promise<void>
): Promise<string> {
  console.log(`長い音声ファイルの分割文字起こしを開始: ${audioUrl}`);
  
  // 一時ディレクトリがなければ作成
  if (!fs.existsSync(tmpDir)) {
    await mkdir(tmpDir, { recursive: true });
  }
  
  // Cloud Storageからファイルをダウンロード
  const localFilePath = path.join(tmpDir, 'input.mp3');
  await downloadFile(audioUrl, localFilePath);
  
  // FFmpegを使用して音声を分割（関数は実装済みと仮定）
  const chunkPaths = await splitAudioFile(localFilePath, tmpDir);
  console.log(`音声を ${chunkPaths.length} チャンクに分割しました`);
  
  // 進捗報告の初期化
  if (progressCallback) {
    await progressCallback(10); // 10%完了
  }
  
  // 各チャンクを文字起こし
  let transcriptions: string[] = [];
  for (let i = 0; i < chunkPaths.length; i++) {
    const chunkPath = chunkPaths[i];
    const chunkTranscription = await transcribeAudio(chunkPath);
    transcriptions.push(chunkTranscription);
    
    // 進捗報告（10%〜80%の範囲）
    if (progressCallback) {
      const progress = 10 + Math.floor(((i + 1) / chunkPaths.length) * 70);
      await progressCallback(progress);
    }
  }
  
  // 文字起こし結果を結合
  const fullTranscription = transcriptions.join('\n');
  
  return fullTranscription;
}

/**
 * 楽器タイプに基づいたタグ生成プロンプトを生成する
 * @param instrumentName 楽器名
 * @returns 楽器に適したプロンプト
 */
function getTagsPromptForGemini(instrumentName: string): string {
  // 楽器名を小文字に変換して比較
  const instrument = instrumentName.toLowerCase();
  return COMMON_TAGS_FORMAT.replace('[INSTRUMENT_TYPE]', instrumentName);
}

/**
 * OpenAI APIを使用して文字起こしを要約し、タグを生成
 * @param transcription 文字起こしテキスト
 * @param instrumentName 楽器名
 */
export async function generateSummaryAndTags(
  transcription: string, 
  instrumentName = 'standard'
): Promise<{ summary: string, tags: string[] }> {
  console.log(`文字起こしからサマリーとタグを生成: 楽器 ${instrumentName}`);
  
  try {
    // OpenAI APIクライアントを初期化
    const openai = getOpenAIClient();
    
    // 楽器の専門知識を取得
    const knowledgeBase = await getInstrumentKnowledge(instrumentName);
    
    // 楽器別の要約プロンプトを取得（共通フォーマット）
    const baseSummaryPrompt = getSummaryPromptForGemini(instrumentName, knowledgeBase, transcription);
    
    // 要約のためのプロンプト (既にtranscriptionとknowledgeBaseは含まれている)
    const summaryPrompt = baseSummaryPrompt;
    
    // 楽器別のタグ生成プロンプトを取得
    const baseTagsPrompt = getTagsPromptForGemini(instrumentName);
    
    // タグ生成のためのプロンプト
    const tagsPrompt = `${baseTagsPrompt}
      
      文字起こし:
      ${transcription}
    `;
    
    // 並行して要約とタグを生成
    const [summaryResponse, tagsResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: "あなたは音楽教育の専門家で、楽器レッスンの内容を要約する能力に優れています。"
          },
          {
            role: "user",
            content: summaryPrompt
          }
        ],
        max_completion_tokens: 2000
      }),
      
      openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          {
            role: "system",
            content: "あなたは音楽教育の専門家で、レッスン内容から関連するタグを抽出する能力に優れています。"
          },
          {
            role: "user",
            content: tagsPrompt
          }
        ],
        max_completion_tokens: 500
      })
    ]);
    
    // 結果を取得
    const summary = summaryResponse.choices[0]?.message?.content?.trim() || '要約の生成に失敗しました。';
    const tagsText = tagsResponse.choices[0]?.message?.content?.trim() || '';
    
    // タグテキストを配列に変換
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim().replace(/^["']|["']$/g, '')) // 引用符を削除
      .filter(Boolean);
    
    // タグが空の場合のフォールバック
    const finalTags = tags.length > 0 ? tags : ['音楽', 'レッスン', instrumentName];
    
    console.log(`要約とタグの生成完了: ${summary.length} 文字, ${finalTags.length} タグ`);
    
    return { summary, tags: finalTags };
  } catch (error) {
    console.error('要約とタグの生成中にエラーが発生:', error);
    // エラー時はデフォルト値を返す
    return { 
      summary: '要約の生成中にエラーが発生しました。', 
      tags: ['エラー', '音楽', instrumentName] 
    };
  }
}

/**
 * Gemini 1.5 Flashを使用してタグのみを生成
 * @param transcription 文字起こしテキスト
 * @param instrumentName 楽器名
 */
export async function generateTagsWithGeminiFlash(
  transcription: string,
  instrumentName = 'standard'
): Promise<string[]> {
  console.log(`Gemini 1.5 Flashでタグ生成`);
  
  try {
    // Gemini clientを初期化
    const genAI = getGeminiClient();
    // Gemini 1.5 Flash モデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    // 楽器タイプに基づいたタグ生成プロンプトを取得
    const tagsPrompt = getTagsPromptForGemini(instrumentName) + `
      
      文字起こし:
      ${transcription}
    `;
    
    // Geminiでタグを生成
    const tagsResult = await model.generateContent(tagsPrompt);
    const tagsText = tagsResult.response.text().trim();
    
    // タグテキストを配列に変換
    let tags = tagsText
      .split(',')
      .map((tag: string) => tag.trim().replace(/^["']|["']$/g, '')) // 引用符を削除
      .filter(Boolean);
    
    // 必ず3つのタグになるように調整
    if (tags.length > 3) {
      tags = tags.slice(0, 3);
    }
    while (tags.length < 3) {
      tags.push(instrumentName); // 不足している場合は楽器名で補完
    }
    
    console.log(`タグ生成完了: ${tags.length}個のタグを生成`);
    
    return tags;
  } catch (error) {
    console.error('タグ生成中にエラーが発生:', error);
    return ['エラー', instrumentName, '音楽'];
  }
}

/**
 * 完全な音声処理ワークフロー
 * 音声ファイルから文字起こし、要約、タグ生成までを実行
 */
export async function processAudioWithGenkit(
  audioUrl: string,
  userId: string,
  lessonId: string,
  instrumentName = 'standard',
  progressCallback?: (status: string, progress: number) => Promise<void>
): Promise<{
  transcription: string;
  summary: string;
  tags: string[];
}> {
  console.log(`Genkitによる音声処理開始: ${audioUrl}`);
  
  // 一時ディレクトリを作成
  const tmpDir = path.join(os.tmpdir(), `genkit-${lessonId}-${Date.now()}`);
  
  try {
    // 進捗状況の報告
    if (progressCallback) {
      await progressCallback('processing', 0);
    }
    
    // 長い音声ファイルの文字起こし
    if (progressCallback) {
      await progressCallback('transcribing', 10);
    }
    
    const transcription = await transcribeLongAudio(
      audioUrl, 
      tmpDir,
      async (progress) => {
        if (progressCallback) {
          await progressCallback('transcribing', progress);
        }
      }
    );
    
    if (progressCallback) {
      await progressCallback('generating_summary', 80);
    }
    
    // 要約とタグを生成
    const { summary, tags } = await generateSummaryAndTags(
      transcription,
      instrumentName
    );
    
    if (progressCallback) {
      await progressCallback('completed', 100);
    }
    
    // 結果を返す
    return {
      transcription,
      summary,
      tags
    };
    
  } catch (error) {
    console.error(`音声処理中にエラーが発生: ${error}`);
    
    if (progressCallback) {
      await progressCallback('error', 0);
    }
    
    throw error;
  } finally {
    // 一時ディレクトリのクリーンアップ
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.error(`一時ディレクトリのクリーンアップエラー: ${cleanupError}`);
    }
  }
}

/**
 * URLからファイルをダウンロードする
 * @param url ダウンロードするファイルのURL
 * @param destination 保存先のパス
 */
async function downloadFile(url: string, destination: string): Promise<void> {
  const axios = require('axios');
  const fs = require('fs-extra');
  const path = require('path');
  
  console.log(`ファイルダウンロード開始: ${url}`);
  
  // 保存先ディレクトリを確保
  const destDir = path.dirname(destination);
  await fs.ensureDir(destDir);
  
  try {
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      timeout: 30000, // 30秒タイムアウト
    });
    
    const writer = fs.createWriteStream(destination);
    
    return new Promise((resolve, reject) => {
      response.data.pipe(writer);
      
      writer.on('error', (err: Error) => {
        console.error(`ファイル書き込みエラー: ${err.message}`);
        writer.close();
        reject(err);
      });
      
      writer.on('finish', async () => {
        // ファイルの存在確認を行う
        try {
          const fileExists = await fs.pathExists(destination);
          if (!fileExists) {
            const err = new Error(`ファイルが存在しません: ${destination}`);
            reject(err);
            return;
          }
          
          // ファイルサイズの確認
          const stats = await fs.stat(destination);
          if (stats.size === 0) {
            const err = new Error(`ダウンロードしたファイルのサイズが0です: ${destination}`);
            reject(err);
            return;
          }
          
          console.log(`ファイルが正常にダウンロードされました: ${destination} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
          resolve();
        } catch (err) {
          console.error(`ファイル確認エラー: ${err instanceof Error ? err.message : 'unknown error'}`);
          reject(err);
        }
      });
    });
  } catch (error) {
    console.error(`ダウンロードエラー: ${error instanceof Error ? error.message : 'unknown error'}`);
    throw error;
  }
}

/**
 * 音声ファイルを分割する
 * @param filePath 入力ファイルパス
 * @param outputDir 出力ディレクトリ
 */
async function splitAudioFile(filePath: string, outputDir: string): Promise<string[]> {
  const ffmpeg = require('fluent-ffmpeg');
  const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
  const fs = require('fs-extra');
  const path = require('path');
  
  // FFmpegのパスを設定
  ffmpeg.setFfmpegPath(ffmpegPath);
  
  console.log(`音声ファイル分割開始: ${filePath}`);
  
  // 出力ディレクトリを作成
  await fs.ensureDir(outputDir);
  
  // 音声の長さを取得
  const duration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err: Error, metadata: any) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
  
  console.log(`音声の長さ: ${duration.toFixed(2)}秒`);
  
  // ファイルサイズを取得
  const stats = await fs.stat(filePath);
  const fileSizeMB = stats.size / (1024 * 1024);
  
  // Google Speech-to-Textの制限は1分間のオーディオ
  // 長い音声ファイルは1分単位で分割
  const chunkDuration = 60; // 60秒チャンク
  const numChunks = Math.ceil(duration / chunkDuration);
  
  // チャンク分割が必要ない場合（1分未満）
  if (duration <= chunkDuration) {
    console.log(`チャンク分割不要: 長さ ${duration.toFixed(2)}秒は${chunkDuration}秒以下`);
    return [filePath];
  }
  
  // 出力ファイルパスのリスト
  const outputFiles: string[] = [];
  
  // チャンクごとの処理
  for (let i = 0; i < numChunks; i++) {
    const startPosition = i * chunkDuration;
    const outputFile = path.join(outputDir, `chunk_${i.toString().padStart(3, '0')}.mp3`);
    outputFiles.push(outputFile);
    
    console.log(`チャンク ${i+1}/${numChunks} の処理開始: 開始位置=${startPosition.toFixed(2)}秒`);
    
    // FFmpegを使用してチャンクを作成
    await new Promise<void>((resolve, reject) => {
      ffmpeg(filePath)
        .setStartTime(startPosition)
        .setDuration(chunkDuration)
        .output(outputFile)
        .on('end', () => {
          console.log(`チャンク ${i+1}/${numChunks} の処理完了: ${outputFile}`);
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`チャンク ${i+1}/${numChunks} の処理中にエラーが発生:`, err);
          reject(err);
        })
        .run();
    });
  }
  
  return outputFiles;
}

/**
 * ナレッジベースを活用してサマリーとタグを生成する
 * @param transcription 文字起こしテキスト
 * @param instrumentName 楽器名
 * @returns サマリーとタグ
 */
export async function generateSummaryWithKnowledgeBase(
  transcription: string,
  instrumentName: string
): Promise<{ summary: string; tags: string[] }> {
  try {
    console.log(`ナレッジベースを活用した要約開始: ${instrumentName}`);
    
    // 楽器の専門知識を取得
    const knowledgeBase = await getInstrumentKnowledge(instrumentName);
    
    // 長いトランスクリプションを切り詰め
    const truncatedTranscription = truncateTranscription(transcription, 60000);
    
    // 楽器別の要約プロンプトを取得（共通フォーマット）
    const prompt = getSummaryPromptForGemini(instrumentName, knowledgeBase, truncatedTranscription);
    
    // Gemini APIを利用してサマリーを生成
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
    
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summaryText = response.text();
    
    // タグを別途生成
    const tags = await generateTagsWithGeminiFlash(
      transcription,
      instrumentName
    );
    
    return {
      summary: summaryText.trim(),
      tags
    };
  } catch (error) {
    console.error('ナレッジベースを活用した要約生成エラー:', error);
    throw new Error('要約の生成に失敗しました: ' + error);
  }
}

/**
 * 指定された楽器の知識ベースを取得する
 * @param instrument 楽器名
 * @returns 知識ベーステキスト
 */
async function getInstrumentKnowledge(instrument: string): Promise<string> {
  try {
    const db = admin.firestore();
    const instrumentRef = db.collection(KNOWLEDGE_COLLECTION).doc(instrument.toLowerCase());
    const doc = await instrumentRef.get();
    
    if (doc.exists) {
      const data = doc.data();
      if (data && data.content) {
        return data.content;
      }
    }
    
    // 一般的な楽器情報を取得
    const generalRef = db.collection(KNOWLEDGE_COLLECTION).doc('general');
    const generalDoc = await generalRef.get();
    
    if (generalDoc.exists) {
      const data = generalDoc.data();
      if (data && data.content) {
        return data.content;
      }
    }
    
    return '';
  } catch (error) {
    console.error(`楽器知識取得エラー (${instrument}):`, error);
    return '';
  }
}

/**
 * 楽器の知識をアップロードする
 * @param instrumentName 楽器名
 * @param knowledgeId 知識ID
 * @param content 知識内容
 */
export async function uploadInstrumentKnowledge(
  instrumentName: string,
  knowledgeId: string,
  content: string
): Promise<void> {
  try {
    const db = admin.firestore();
    
    // ドキュメントID（楽器名または特定のID）
    const docId = knowledgeId || instrumentName.toLowerCase();
    
    await db.collection(KNOWLEDGE_COLLECTION).doc(docId).set({
      instrument: instrumentName.toLowerCase(),
      content: content,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`楽器知識がアップロードされました: ${docId}`);
  } catch (error) {
    console.error('楽器知識アップロードエラー:', error);
    throw error;
  }
}

/**
 * 長いテキストを適切な長さに切り詰める
 * @param text 元のテキスト
 * @param maxLength 最大長
 * @returns 切り詰めたテキスト
 */
function truncateTranscription(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  
  // テキストの半分から始めて、最後の文の終わりで切る
  const halfLength = Math.floor(maxLength / 2);
  const firstHalf = text.substring(0, halfLength);
  
  // テキストの最後から取得
  const secondHalf = text.substring(text.length - halfLength);
  
  return `${firstHalf}\n...(中略)...\n${secondHalf}`;
}

/**
 * テキストからJSONを抽出する
 * @param text JSON文字列を含むテキスト
 * @returns パースされたJSON
 */
function extractJsonFromText(text: string): { summary: string; tags: string[] } {
  // JSONブロックを探す
  const jsonMatch = text.match(/\{[\s\S]*?\}/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error('JSONの解析に失敗しました');
    }
  }
  
  throw new Error('テキストからJSONを抽出できませんでした');
}

/**
 * テキストから要約とタグを抽出するバックアップ関数
 * @param text テキスト
 * @returns 抽出された要約とタグ
 */
function extractSummaryAndTagsFromText(text: string): { summary: string; tags: string[] } {
  const lines = text.split('\n');
  let summary = '';
  let tags: string[] = [];
  
  let inSummary = false;
  let inTags = false;
  
  for (const line of lines) {
    if (line.toLowerCase().includes('summary:') || line.toLowerCase().includes('要約:')) {
      inSummary = true;
      inTags = false;
      continue;
    }
    
    if (line.toLowerCase().includes('tags:') || line.toLowerCase().includes('タグ:')) {
      inSummary = false;
      inTags = true;
      continue;
    }
    
    if (inSummary && line.trim()) {
      summary += line + ' ';
    }
    
    if (inTags && line.trim()) {
      // カンマで区切られたタグを抽出
      const tagMatches = line.match(/["']([^"']+)["']|(\w+)/g);
      if (tagMatches) {
        tags = tags.concat(tagMatches.map(tag => tag.replace(/["']/g, '').trim()));
      }
    }
  }
  
  // タグが見つからない場合、テキスト全体から抽出を試みる
  if (tags.length === 0) {
    const tagMatches = text.match(/["']([^"']+)["']|#(\w+)/g);
    if (tagMatches) {
      tags = tagMatches.map(tag => tag.replace(/["'#]/g, '').trim());
    }
  }
  
  return {
    summary: summary.trim() || 'テキストから要約を抽出できませんでした。',
    tags: tags.filter(tag => tag.length > 0).slice(0, 10) || [],
  };
}

/**
 * Google Speech-to-Text APIを使用して音声ファイルを文字起こしする
 * @param audioFilePath 音声ファイルのパス
 * @returns 文字起こしテキスト
 */
export async function transcribeAudioWithGenkit(audioFilePath: string): Promise<string> {
  // WhisperAPIを使用する方法に変更
  console.log(`Whisper APIへリダイレクト: ${audioFilePath}`);
  
  // whisperモジュールからWhisper API関数をインポート
  const { transcribeAudioWithWhisper } = require('./whisper');
  
  try {
    // Whisper APIを呼び出して文字起こし
    return await transcribeAudioWithWhisper(audioFilePath);
  } catch (error: any) {
    console.error(`Whisperリダイレクト中にエラーが発生:`, error);
    throw new Error(`Whisperリダイレクト中にエラーが発生しました: ${error.message}`);
  }
} 