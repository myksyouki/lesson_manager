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

    console.log(`音声処理リクエスト受信: lessonId=${lessonId}, processingId=${processingId || "なし"}`);

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
    
    // 文字起こしテキストのサンプルをログに出力
    const textSample = transcription.length > 200 ? 
      transcription.substring(0, 200) + "..." : 
      transcription;
    console.log(`文字起こしサンプル: ${textSample}`);
    
    const { summary, tags } = await summarizeTextWithOpenAI(transcription);
    
    // 要約結果の詳細検証
    if (!summary || summary.length < 100) {
      console.error(`要約が不十分です。長さ: ${summary?.length || 0}文字`);
      // 要約が不十分な場合でもプロセスは続行するが、ログを残す
    }
    
    console.log("要約とタグ生成が完了しました");

    // 要約処理
    console.log(`要約結果: ${summary ? summary.substring(0, 100) + "..." : "要約なし"}`);
    console.log(`タグ: ${tags ? JSON.stringify(tags) : "[]"}`);

    // 要約結果をFirestoreに保存
    try {
      await db.collection("lessons").doc(targetLessonId).update({
        summary: summary,
        tags: tags,
        status: "completed",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`レッスン ${targetLessonId} の要約とタグを保存しました`);
    } catch (updateError) {
      console.error("要約結果の保存中にエラーが発生しました:", updateError);
      throw updateError; // エラーを再スロー
    }

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
  // スコープ最上部でlessonDataを定義して、try-catchの両方から参照できるようにする
  let lessonData: any = {};
  
  try {
    console.log(`レッスン ${lessonId} の音声処理を開始します`);

    // Firestoreのレッスンドキュメントを取得
    const lessonDoc = await db.collection("lessons").doc(lessonId).get();
    if (!lessonDoc.exists) {
      console.error(`レッスン ${lessonId} が見つかりません`);
      return;
    }

    // 既存のレッスンデータをログに出力
    lessonData = lessonDoc.data() || {};
    console.log(`既存のレッスンデータ: ID=${lessonId}`, {
      teacher: lessonData.teacher || lessonData.teacherName,
      user_id: lessonData.user_id || lessonData.userId,
      date: lessonData.date,
      pieces: lessonData.pieces,
      tags: lessonData.tags
    });

    // ステータスを更新（既存のフィールドをすべて保持）
    await db.collection("lessons").doc(lessonId).update({
      status: "processing",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      // 既存のデータを保持
      teacher: lessonData.teacher || lessonData.teacherName || "",
      date: lessonData.date || "",
      pieces: lessonData.pieces || [],
      notes: lessonData.notes || "",
      user_id: lessonData.user_id || lessonData.userId || "",
    });

    // 音声ファイルをダウンロード
    const bucket = storage.bucket(bucketName);
    await bucket.file(filePath).download({
      destination: tempFilePath,
    });

    console.log(`音声ファイルをダウンロードしました: ${tempFilePath}`);

    // 文字起こし処理
    const transcription = await transcribeAudio(tempFilePath);

    // 文字起こし結果をFirestoreに保存（既存のフィールドを保持）
    await db.collection("lessons").doc(lessonId).update({
      transcription: transcription,
      status: "transcribed",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      // 既存のデータを保持
      teacher: lessonData.teacher || lessonData.teacherName || "",
      date: lessonData.date || "",
      pieces: lessonData.pieces || [],
      notes: lessonData.notes || "",
      user_id: lessonData.user_id || lessonData.userId || "",
    });

    console.log(`レッスン ${lessonId} の文字起こしが完了し、既存ドキュメントに保存しました`);

    // 要約前のデバッグログ
    console.log(`要約開始前の状態確認 - レッスンID: ${lessonId}、タイムスタンプ: ${new Date().toISOString()}`);
    console.log(`処理中の音声ファイル: ${filePath}`);
    
    // 念のため同じファイルパスで他のレッスンを検索
    try {
      const duplicateCheck = await db.collection("lessons")
        .where("audioPath", "==", filePath)
        .get();
      
      console.log(`同じオーディオパスを持つレッスン数: ${duplicateCheck.size}`);
      if (duplicateCheck.size > 1) {
        console.log("重複するレッスンドキュメントが見つかりました:");
        duplicateCheck.forEach(doc => {
          console.log(`- ID: ${doc.id}, ステータス: ${doc.data()?.status || "不明"}`);
        });
      }
    } catch (checkError) {
      console.error("重複チェック中にエラーが発生しました:", checkError);
    }
    
    // 要約処理
    const { summary, tags } = await summarizeTextWithOpenAI(transcription);

    console.log(`レッスン ${lessonId} の要約とタグを生成しました:`, {
      summary: summary ? summary.substring(0, 100) + "..." : "要約なし",
      tags: tags || []
    });

    // 要約結果をFirestoreに保存
    try {
      // 再度レッスンドキュメントを取得して、最新のデータを取得（念のため）
      const refreshedLessonDoc = await db.collection("lessons").doc(lessonId).get();
      const refreshedLessonData = refreshedLessonDoc.exists ? refreshedLessonDoc.data() || {} : lessonData;

      // 要約結果をFirestoreに保存（すべての既存フィールドを保持）
      await db.collection("lessons").doc(lessonId).update({
        summary: summary,
        tags: tags,
        status: "completed",
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        // 既存のデータを保持
        teacher: refreshedLessonData.teacher || refreshedLessonData.teacherName || lessonData.teacher || lessonData.teacherName || "",
        date: refreshedLessonData.date || lessonData.date || "",
        pieces: refreshedLessonData.pieces || lessonData.pieces || [],
        notes: refreshedLessonData.notes || lessonData.notes || "",
        user_id: refreshedLessonData.user_id || refreshedLessonData.userId || lessonData.user_id || lessonData.userId || "",
        // transcriptionも保持
        transcription: refreshedLessonData.transcription || transcription || "",
        // audioUrlも保持
        audioUrl: refreshedLessonData.audioUrl || lessonData.audioUrl || "",
      });
      console.log(`レッスン ${lessonId} の要約とタグを既存ドキュメントに保存しました`);
    } catch (updateError) {
      console.error("要約結果の保存中にエラーが発生しました:", updateError);
      throw updateError; // エラーを再スロー
    }

    // 念のため同じファイルの重複ドキュメントをクリーンアップ
    try {
      const dupCheckSnapshot = await db.collection("lessons")
        .where("audioPath", "==", filePath)
        .where("status", "in", ["completed", "transcribed"])
        .get();
        
      if (dupCheckSnapshot.size > 1) {
        console.log(`同じオーディオパス ${filePath} を持つレッスンが複数あります (${dupCheckSnapshot.size}件)。重複をクリーンアップします。`);
        
        // このレッスン以外の重複を非表示にする
        const batchSize = 450; // Firestoreの上限は500
        let batch = db.batch();
        let operationCount = 0;
        
        for (const doc of dupCheckSnapshot.docs) {
          // 現在処理したドキュメント以外を非表示に
          if (doc.id !== lessonId) {
            console.log(`重複レッスン ${doc.id} を非表示に設定します。`);
            batch.update(doc.ref, { 
              status: "duplicate",
              duplicate: true,
              duplicateOf: lessonId,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            operationCount++;
          }
          
          // バッチサイズの上限に達したら、コミットして新しいバッチを開始
          if (operationCount >= batchSize) {
            await batch.commit();
            console.log(`${operationCount}件の重複レッスンを処理しました。次のバッチに進みます。`);
            batch = db.batch();
            operationCount = 0;
          }
        }
        
        // 残りのバッチをコミット
        if (operationCount > 0) {
          await batch.commit();
          console.log(`残り${operationCount}件の重複レッスンを処理しました。`);
        }
      }
    } catch (dupError) {
      console.error("重複チェック・クリーンアップ中にエラーが発生しました:", dupError);
      // このエラーはスローしない（メイン処理を続行）
    }
    
    console.log(`レッスン ${lessonId} の処理が完了しました`);
  } catch (error) {
    console.error(`レッスン ${lessonId} の処理中にエラーが発生しました:`, error);

    // エラー情報を保存（既存のフィールドを保持）
    try {
      await db.collection("lessons").doc(lessonId).update({
        status: "error",
        error: (error as Error).message,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        // 既存のデータを保持
        teacher: lessonData.teacher || lessonData.teacherName || "",
        date: lessonData.date || "",
        pieces: lessonData.pieces || [],
        notes: lessonData.notes || "",
        user_id: lessonData.user_id || lessonData.userId || "",
      });
    } catch (updateError) {
      console.error("エラー情報の保存に失敗しました:", updateError);
    }
  }
}

/**
 * 重複レッスンをクリーンアップするコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function cleanupDuplicateLessons(req: Request, res: Response): Promise<void> {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      res.status(400).json({
        success: false,
        error: "ユーザーIDが指定されていません",
      });
      return;
    }
    
    console.log(`ユーザー ${userId} の重複レッスンをクリーンアップします`);
    
    // ユーザーのレッスンをすべて取得
    const lessonsSnapshot = await db.collection("lessons")
      .where("user_id", "==", userId)
      .orderBy("audioPath", "desc")
      .get();
    
    if (lessonsSnapshot.empty) {
      res.status(404).json({
        success: false,
        error: "レッスンが見つかりません",
      });
      return;
    }
    
    // audioPathでグループ化
    const lessonsByPath = new Map<string, any[]>();
    
    lessonsSnapshot.forEach((doc) => {
      const data = doc.data();
      const path = data.audioPath;
      
      if (path) {
        // ファイル名部分を取得
        const fileName = path.split("/").pop() || "";
        // ファイル名からレッスンIDを抽出（拡張子を除去）
        let lessonIdPart = fileName;
        if (fileName.includes(".")) {
          lessonIdPart = fileName.split(".")[0];
        }
        
        if (!lessonsByPath.has(lessonIdPart)) {
          lessonsByPath.set(lessonIdPart, []);
        }
        lessonsByPath.get(lessonIdPart)?.push({
          id: doc.id,
          ...data
        });
      }
    });
    
    // 重複を検出
    let duplicatesFound = 0;
    let cleanedUp = 0;
    const batchSize = 450; // Firestoreのバッチ上限は500
    let batch = db.batch();
    let operationCount = 0;
    
    for (const [path, lessons] of lessonsByPath.entries()) {
      if (lessons.length > 1) {
        duplicatesFound++;
        console.log(`重複パス: ${path} (${lessons.length}件のレッスン)`);
        
        // 最も新しいものを残し、他を「duplicate」としてマーク
        const newestLesson = lessons[0]; // created_atでソート済み
        
        for (let i = 1; i < lessons.length; i++) {
          const duplicateLesson = lessons[i];
          console.log(`  重複レッスン ${duplicateLesson.id} を非表示に設定 (オリジナル: ${newestLesson.id})`);
          
          const docRef = db.collection("lessons").doc(duplicateLesson.id);
          batch.update(docRef, {
            status: "duplicate",
            duplicate: true,
            duplicateOf: newestLesson.id,
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          operationCount++;
          cleanedUp++;
          
          // バッチサイズの上限に達したら、コミットして新しいバッチを開始
          if (operationCount >= batchSize) {
            await batch.commit();
            console.log(`${operationCount}件の重複レッスンを処理しました。次のバッチに進みます。`);
            batch = db.batch();
            operationCount = 0;
          }
        }
      }
    }
    
    // 残りのバッチをコミット
    if (operationCount > 0) {
      await batch.commit();
      console.log(`残り${operationCount}件の重複レッスンを処理しました。`);
    }
    
    console.log(`クリーンアップ完了: ${duplicatesFound}件の重複パスから${cleanedUp}件のドキュメントを処理しました`);
    
    res.status(200).json({
      success: true,
      data: {
        duplicatesFound,
        cleanedUp
      }
    });
  } catch (error) {
    console.error("重複クリーンアップ中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}
