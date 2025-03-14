import * as fs from "fs";
import { openai } from "../config";

/**
 * Whisper APIを使用して音声ファイルを文字起こしする関数
 * @param {string} filePath 音声ファイルのパス
 * @return {Promise<string>} 文字起こし結果
 */
export async function transcribeAudio(filePath: string): Promise<string> {
  try {
    if (!openai) {
      throw new Error("OpenAI APIが初期化されていません");
    }

    console.log(`文字起こしを開始します: ${filePath}`);

    // ファイルを読み込む
    const fileBuffer = fs.readFileSync(filePath);

    // Whisper APIを呼び出す
    const transcription = await openai.audio.transcriptions.create({
      file: new File([fileBuffer], "audio.mp3", { type: "audio/mpeg" }),
      model: "whisper-1", // 現在サポートされているモデル
      language: "ja",
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
