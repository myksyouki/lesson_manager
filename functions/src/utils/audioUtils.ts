import * as fs from "fs";
import { openai } from "../config";

/**
 * Whisper APIを使用して音声ファイルを文字起こしする関数
 * パラメーター設定：
 * - model: "whisper-1" - 現在サポートされているモデル
 * - language: "ja" - 日本語指定
 * - temperature: 0.1 - 低い温度で正確性を高める
 * - prompt: 文脈のヒント - 演奏音が混在する音声用
 * @param {string} filePath 音声ファイルのパス
 * @return {Promise<string>} 文字起こし結果
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    if (!openai) {
      throw new Error("OpenAI APIが初期化されていません");
    }

    console.log(`文字起こしを開始します: ${filePath}`);

    // ファイルが存在することを確認
    if (!fs.existsSync(filePath)) {
      throw new Error(`ファイルが見つかりません: ${filePath}`);
    }

    // ファイルの大きさを確認
    const stats = fs.statSync(filePath);
    console.log(`ファイルサイズ: ${stats.size} bytes`);

    // Node.js環境でのOpenAI API呼び出し - ファイルストリームを直接使用
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "ja",
      temperature: 0.1,
      prompt: "これは楽器レッスンの音声です。講師の解説とともに、楽器演奏音が含まれています。楽器の音が混在しているため、正確に文字起こししてください。",
    });

    console.log("文字起こしが完了しました");

    // 一時ファイルを削除
    try {
      fs.unlinkSync(filePath);
      console.log(`一時ファイルを削除しました: ${filePath}`);
    } catch (error) {
      console.error(`一時ファイルの削除に失敗しました: ${filePath}`, error);
    }

    return transcription.text;
  } catch (error) {
    console.error("文字起こし処理中にエラーが発生しました:", error);
    throw error;
  }
}

/**
 * URLからtokenパラメータを除去する関数
 * @param {string} url 処理するURL
 * @return {string} tokenパラメータを除去したURL
 */
export function removeTokenFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete("token");
    return urlObj.toString();
  } catch (error) {
    console.error("URL処理中にエラーが発生しました:", error);
    return url; // エラーが発生した場合は元のURLを返す
  }
}
