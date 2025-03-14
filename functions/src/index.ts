import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import router from "./routes";
import { db, storage } from "./config";
import { processAudioForLesson } from "./controllers/lessonController";
import { generateTasksFromLesson } from "./controllers/taskController";
import { removeTokenFromUrl } from "./utils/audioUtils";

// メインのExpressアプリケーション
const app = express();

// JSONボディパーサーを有効化
app.use(express.json());

// ルーターを設定
app.use(router);

// HTTPSリクエストハンドラーをエクスポート
export const api = onRequest(
  {
    region: "asia-northeast1",
    timeoutSeconds: 540, // 9分
    memory: "1GiB",
  },
  app
);

// Storage Triggerの設定 - 音声ファイルがアップロードされたときに自動的に処理を開始する
export const processAudioFile = onObjectFinalized(
  {
    region: "asia-northeast1",
    timeoutSeconds: 540, // 9分
    memory: "1GiB",
  },
  async (event) => {
    try {
      const fileBucket = event.data.bucket;
      const filePath = event.data.name;
      const contentType = event.data.contentType;

      // 音声ファイルのみを処理
      if (!contentType || !contentType.startsWith("audio/")) {
        console.log("音声ファイルではないため、処理をスキップします:", filePath);
        return;
      }

      // audioディレクトリ内のファイルのみを処理
      if (!filePath.startsWith("audio/")) {
        console.log("audioディレクトリ内のファイルではないため、処理をスキップします:", filePath);
        return;
      }

      console.log(`音声ファイルがアップロードされました: gs://${fileBucket}/${filePath}`);

      // ファイルパスからユーザーIDを抽出
      const pathParts = filePath.split("/");
      if (pathParts.length < 3) {
        console.error("ファイルパスの形式が正しくありません:", filePath);
        return;
      }

      const userId = pathParts[1];
      console.log(`ユーザーID: ${userId}`);

      // 一時ファイルのパスを設定
      const tempFilePath = `/tmp/${pathParts[pathParts.length - 1]}`;

      // ファイル名からレッスンIDを抽出（ファイル名の形式: lessonId_timestamp.mp3）
      const fileName = pathParts[pathParts.length - 1];
      const lessonIdMatch = fileName.match(/^(.+?)_\d+\.\w+$/);
      
      if (lessonIdMatch && lessonIdMatch[1]) {
        const lessonId = lessonIdMatch[1];
        console.log(`レッスンID: ${lessonId}`);
        
        // レッスンIDが見つかった場合、そのレッスンを処理
        await processAudioForLesson(lessonId, filePath, fileBucket, tempFilePath);
        
        // レッスンが完了したら、タスクを自動生成
        setTimeout(async () => {
          try {
            await generateTasksFromLesson(lessonId, userId);
          } catch (error) {
            console.error("タスク生成中にエラーが発生しました:", error);
          }
        }, 5000); // 5秒待機してからタスク生成を実行
        
        return;
      }
      
      // レッスンIDが見つからない場合、最近作成されたレッスンを探す
      console.log("ファイル名からレッスンIDを抽出できませんでした。最近のレッスンを探します。");
      
      // 15分以内に作成されたレッスンを検索
      const fifteenMinutesAgo = new Date();
      fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);
      
      const recentLessonsSnapshot = await db
        .collection("lessons")
        .where("user_id", "==", userId)
        .where("status", "==", "pending")
        .orderBy("created_at", "desc")
        .limit(5)
        .get();
      
      if (recentLessonsSnapshot.empty) {
        console.log("最近作成されたレッスンが見つかりませんでした。");
        return;
      }
      
      // audioUrlがないレッスンを探す
      const lessonWithoutAudio = recentLessonsSnapshot.docs.find((doc) => {
        const data = doc.data();
        // created_atが存在し、15分以内に作成されたレッスンのみを対象とする
        const createdAt = data.created_at ? data.created_at.toDate() : null;
        const isRecent = createdAt && createdAt > fifteenMinutesAgo;
        
        return isRecent && (!data.audioUrl || !data.audio_url);
      });
      
      if (!lessonWithoutAudio) {
        console.log("音声ファイルが関連付けられていないレッスンが見つかりませんでした。");
        return;
      }
      
      const lessonId = lessonWithoutAudio.id;
      console.log(`関連するレッスンを見つけました: ${lessonId}`);
      
      // Storage内のファイルの公開URLを取得
      const bucket = storage.bucket(fileBucket);
      const [url] = await bucket.file(filePath).getSignedUrl({
        action: "read",
        expires: "03-01-2500", // 長期間有効なURL
      });
      
      // URLからtokenパラメータを削除
      const cleanUrl = removeTokenFromUrl(url);
      
      // レッスンデータを更新
      await db.collection("lessons").doc(lessonId).update({
        audioUrl: cleanUrl,
        audioPath: filePath,
        status: "processing",
      });
      
      console.log(`レッスン ${lessonId} に音声ファイルを関連付けました: ${cleanUrl}`);
      
      // 音声処理を実行
      await processAudioForLesson(lessonId, filePath, fileBucket, tempFilePath);
      
      // レッスンが完了したら、タスクを自動生成
      setTimeout(async () => {
        try {
          await generateTasksFromLesson(lessonId, userId);
        } catch (error) {
          console.error("タスク生成中にエラーが発生しました:", error);
        }
      }, 5000); // 5秒待機してからタスク生成を実行
    } catch (error) {
      console.error("Storage Trigger処理中にエラーが発生しました:", error);
    }
  }
);
