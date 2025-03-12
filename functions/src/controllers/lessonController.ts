import { Request, Response } from "express";
import { db, storage } from "../config";
import * as admin from "firebase-admin";
import { transcribeAudio } from "../utils/audioUtils";
import { summarizeTextWithOpenAI } from "../utils/textUtils";

/**
 * 音声ファイル処理のコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function processAudio(req: Request, res: Response): Promise<void> {
  try {
    const { filePath, userId, lessonId, processingId } = req.body;

    if (!filePath || !userId || !lessonId) {
      res.status(400).json({
        success: false,
        error: "必須パラメータが不足しています",
      });
      return;
    }

    console.log(`音声処理リクエスト受信: lessonId=${lessonId}, processingId=${processingId || 'なし'}`);

    // 常に指定されたlessonIdを使用し、新しいドキュメントは作成しない
    const targetLessonId = lessonId;

    // 音声ファイルをダウンロードして一時ファイルに保存
    const bucket = storage.bucket();
    const fileName = filePath.split("/").pop() || "audio.mp3";
    const tempFilePath = `/tmp/${fileName}`;

    await bucket.file(filePath).download({
      destination: tempFilePath,
    });

    console.log(`音声ファイルをダウンロードしました: ${tempFilePath}`);

    // Whisper APIを使用して文字起こし
    console.log(`文字起こしを開始します: ${tempFilePath}`);
    const transcription = await transcribeAudio(tempFilePath);
    console.log("文字起こしが完了しました");

    // 文字起こし結果をFirestoreに保存
    await db.collection("lessons").doc(targetLessonId).update({
      transcription: transcription,
      status: "transcribed",
      processingId: processingId || null,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // OpenAI APIを使用して要約とタグを生成
    console.log("OpenAI APIを使用して要約とタグ生成を開始します");
    const { summary, tags } = await summarizeTextWithOpenAI(transcription);
    console.log("要約とタグ生成が完了しました");

    // 要約結果とタグをFirestoreに保存
    await db.collection("lessons").doc(targetLessonId).update({
      summary: summary,
      tags: tags,
      status: "completed",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`処理が完了しました。ドキュメントID: ${targetLessonId}`);
    res.status(200).json({
      success: true,
      docId: targetLessonId,
    });
  } catch (error) {
    console.error("処理中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * レッスンデータ取得のコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function getLesson(req: Request, res: Response): Promise<void> {
  try {
    const lessonId = req.params.lessonId;

    if (!lessonId) {
      res.status(400).json({
        success: false,
        error: "レッスンIDが指定されていません",
      });
      return;
    }

    const lessonDoc = await db.collection("lessons").doc(lessonId).get();
    if (!lessonDoc.exists) {
      res.status(404).json({
        success: false,
        error: "指定されたレッスンが見つかりません",
      });
      return;
    }

    const lessonData = lessonDoc.data();
    res.status(200).json({
      success: true,
      data: lessonData,
    });
  } catch (error) {
    console.error("レッスンデータの取得中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * ユーザーのレッスン一覧と処理状況を取得するコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function getUserLessons(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: "ユーザーIDが指定されていません",
      });
      return;
    }

    const lessonsSnapshot = await db
      .collection("lessons")
      .where("user_id", "==", userId)
      .orderBy("created_at", "desc")
      .get();

    if (lessonsSnapshot.empty) {
      res.status(404).json({
        success: false,
        error: "レッスンが見つかりません",
      });
      return;
    }

    const lessons = lessonsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        created_at: data.created_at,
        audioUrl: data.audioUrl,
      };
    });

    res.status(200).json({
      success: true,
      data: lessons,
    });
  } catch (error) {
    console.error("レッスン一覧の取得中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * レッスンの音声ファイルを処理する関数
 * @param {string} lessonId レッスンID
 * @param {string} filePath ファイルパス
 * @param {string} bucketName バケット名
 * @param {string} tempFilePath 一時ファイルパス
 */
export async function processAudioForLesson(
  lessonId: string,
  filePath: string,
  bucketName: string,
  tempFilePath: string
): Promise<void> {
  try {
    console.log(`レッスン ${lessonId} の音声処理を開始します`);

    // Firestoreのレッスンドキュメントを取得
    const lessonDoc = await db.collection("lessons").doc(lessonId).get();
    if (!lessonDoc.exists) {
      console.error(`レッスン ${lessonId} が見つかりません`);
      return;
    }

    // ステータスを更新
    await db.collection("lessons").doc(lessonId).update({
      status: "processing",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 音声ファイルをダウンロード
    const bucket = storage.bucket(bucketName);
    await bucket.file(filePath).download({
      destination: tempFilePath,
    });

    console.log(`音声ファイルをダウンロードしました: ${tempFilePath}`);

    // 文字起こし処理
    const transcription = await transcribeAudio(tempFilePath);

    // 文字起こし結果をFirestoreに保存
    await db.collection("lessons").doc(lessonId).update({
      transcription: transcription,
      status: "transcribed",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`レッスン ${lessonId} の文字起こしが完了しました`);

    // 要約処理
    const { summary, tags } = await summarizeTextWithOpenAI(transcription);

    // 要約結果をFirestoreに保存
    await db.collection("lessons").doc(lessonId).update({
      summary: summary,
      tags: tags,
      status: "completed",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`レッスン ${lessonId} の処理が完了しました`);
  } catch (error) {
    console.error(`レッスン ${lessonId} の処理中にエラーが発生しました:`, error);

    // エラー情報を保存
    try {
      await db.collection("lessons").doc(lessonId).update({
        status: "error",
        error: (error as Error).message,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (updateError) {
      console.error(`エラー情報の保存に失敗しました:`, updateError);
    }
  }
}
