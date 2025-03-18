import express from "express";
import { onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import router from "./routes";
import { db } from "./config";
import { processAudioForLesson, getLesson, getUserLessons, processAudio, cleanupDuplicateLessons } from "./controllers/lessonController";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// UUIDを生成する関数
function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Firebase configからOpenAI API Keyを環境変数として設定
try {
  // Firebase Cloud Functions v1のconfig取得方法
  const config = functions.config();
  console.log("Firebase config取得: ", config ? "成功" : "失敗");
  
  if (config && config.openai) {
    console.log("openai設定を確認: ", {
      apikey: config.openai.apikey ? "設定あり" : "未設定",
      api_key: config.openai.api_key ? "設定あり" : "未設定"
    });
    
    if (config.openai.apikey) {
      process.env.OPENAI_API_KEY = config.openai.apikey;
      process.env.FUNCTIONS_CONFIG_OPENAI_APIKEY = config.openai.apikey;
      console.log("OpenAI API Keyを環境変数に設定しました (apikey)");
    }
    if (config.openai.api_key) {
      process.env.OPENAI_API_KEY = config.openai.api_key;
      process.env.FUNCTIONS_CONFIG_OPENAI_API_KEY = config.openai.api_key;
      console.log("OpenAI API Keyを環境変数に設定しました (api_key)");
    }
  } else {
    console.log("Firebase configからOpenAI設定が見つからないか、既に設定されています");
  }
} catch (error) {
  console.error("Firebase config取得エラー:", error);
}

// メインのExpressアプリケーション
const app = express();

// JSONボディパーサーを有効化
app.use(express.json());

// ルーターを設定
app.use(router);

// API エンドポイントの設定
app.get("/lessons/:lessonId", getLesson);
app.get("/users/:userId/lessons", getUserLessons);
app.post("/process-audio", processAudio);
app.get("/cleanup/:userId", cleanupDuplicateLessons);

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
      if (!filePath.includes("audio/")) {
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

      // ファイル名からレッスンIDを抽出
      const fileName = pathParts[pathParts.length - 1];
      console.log(`処理するファイル名: ${fileName}`);
      
      // ファイル名からレッスンIDおよびlessonUniqIDを抽出
      let lessonId = "";
      let lessonUniqId = "";
      
      if (fileName.includes(".")) {
        const fileBaseName = fileName.split(".")[0];
        
        // UUIDパターンをチェック (-を含む形式ならlessonUniqId)
        if (fileBaseName.includes("-")) {
          lessonUniqId = fileBaseName;
          console.log(`ファイル名からlessonUniqIdを抽出しました: ${lessonUniqId}`);
          
          // lessonUniqIdを使ってドキュメントを検索
          const uniqIdQuery = await db.collection("lessons")
            .where("lessonUniqId", "==", lessonUniqId)
            .get();
          
          if (!uniqIdQuery.empty) {
            // 既存ドキュメントが見つかった場合
            const existingDoc = uniqIdQuery.docs[0];
            lessonId = existingDoc.id;
            
            console.log(`lessonUniqId "${lessonUniqId}" に一致するドキュメントが見つかりました: ${lessonId}`);
            
            await db.collection("lessons").doc(lessonId).update({
              status: "processing",
              audioPath: filePath,
              fileName: fileName,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 音声処理を実行
            await processAudioForLesson(lessonId, filePath, fileBucket, tempFilePath);
            console.log(`lessonUniqId ${lessonUniqId} を持つレッスン ${lessonId} の処理が完了しました`);
            return;
          }
        } else {
          // 通常のlessonId
          lessonId = fileBaseName;
          console.log(`ファイル名からレッスンIDを抽出しました: ${lessonId}`);
          
          // 重要: 最初にlessonUniqIdを検索してみる
          // まずdocId = lessonIdのドキュメントでlessonUniqIdを確認
          const lessonDoc = await db.collection("lessons").doc(lessonId).get();
          if (lessonDoc.exists) {
            const lessonData = lessonDoc.data() || {};
            if (lessonData.lessonUniqId) {
              lessonUniqId = lessonData.lessonUniqId;
              console.log(`レッスン ${lessonId} の既存lessonUniqIdを確認: ${lessonUniqId}`);
              
              // このlessonUniqIdで他のドキュメントも検索
              const uniqIdQuery = await db.collection("lessons")
                .where("lessonUniqId", "==", lessonUniqId)
                .get();
              
              if (uniqIdQuery.size > 1) {
                console.log(`注意: 同じlessonUniqId ${lessonUniqId} を持つドキュメントが複数存在します`);
                
                // すべてのドキュメントを表示して確認
                uniqIdQuery.forEach(doc => {
                  if (doc.id !== lessonId) {
                    console.log(`  - ID: ${doc.id}, ステータス: ${doc.data().status || "不明"}`);
                  }
                });
              }
            }
            
            // lessonIdのドキュメントを更新して処理
            await db.collection("lessons").doc(lessonId).update({
              status: "processing",
              audioPath: filePath,
              fileName: fileName,
              lessonUniqId: lessonUniqId || generateUUID(),
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 音声処理を実行
            await processAudioForLesson(lessonId, filePath, fileBucket, tempFilePath);
            console.log(`レッスン ${lessonId} の処理が完了しました`);
            return;
          }
        }
      }
      
      // lessonIdで見つからなかった場合は、lessonUniqIdだけで検索
      // ファイル内容に基づいて生成される可能性があるため
      if (!lessonUniqId) {
        // ファイル名から何も抽出できなかった場合、
        // 既存の未処理レッスンでlessonUniqIdがあるものを検索
        const pendingWithUniqIdQuery = await db.collection("lessons")
          .where("user_id", "==", userId)
          .where("status", "in", ["pending", "uploading", "waiting_for_audio"])
          .orderBy("created_at", "desc")
          .limit(5) // 最新の数件を確認
          .get();
        
        let foundPendingWithUniqId = false;
        
        for (const pendingDoc of pendingWithUniqIdQuery.docs) {
          const pendingData = pendingDoc.data();
          if (pendingData.lessonUniqId && !pendingData.audioPath) {
            lessonUniqId = pendingData.lessonUniqId;
            lessonId = pendingDoc.id;
            foundPendingWithUniqId = true;
            
            console.log(`未処理レッスンでlessonUniqId ${lessonUniqId} を持つものを見つけました: ${lessonId}`);
            
            // このレッスンを更新して処理
            await db.collection("lessons").doc(lessonId).update({
              status: "processing",
              audioPath: filePath,
              fileName: fileName,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 音声処理を実行
            await processAudioForLesson(lessonId, filePath, fileBucket, tempFilePath);
            console.log(`lessonUniqId ${lessonUniqId} を持つレッスン ${lessonId} の処理が完了しました`);
            return;
          }
        }
        
        if (!foundPendingWithUniqId) {
          console.log("lessonUniqIdを持つ未処理レッスンが見つかりませんでした");
        }
      }
      
      // lessonIdとlessonUniqIdのどちらの形式でも既存ドキュメントが見つからない場合は以降の処理に進む
      
      // 重複処理を防止するためのチェック
      const fileIdForLock = filePath;
      
      console.log(`重複処理チェック: ファイルパス = ${filePath}`);
      
      // 複数方法でドキュメントを検索する
      // 1. まず同じレッスンUniqIdを持つドキュメントを検索
      // 2. 次に同じaudioPathを持つドキュメントを検索
      // 3. 最後に未完了ドキュメントを検索
      
      // すでに同じfilePathで処理済み/処理中のレッスンを検索
      const fullPathCheck = await db.collection("lessons")
        .where("audioPath", "==", filePath)
        .get();
      
      if (!fullPathCheck.empty) {
        const existingDoc = fullPathCheck.docs[0];
        const existingLessonId = existingDoc.id;
        const existingLessonData = existingDoc.data();
        
        console.log(`同一ファイルパス(${filePath})を持つレッスンが見つかりました:`, {
          lessonId: existingLessonId,
          status: existingLessonData.status,
          created_at: existingLessonData.created_at ? existingLessonData.created_at.toDate() : "不明"
        });
        
        // 既に完了しているか処理中なら処理をスキップ
        if (existingLessonData.status === "completed" || 
            existingLessonData.status === "processing" || 
            existingLessonData.status === "transcribed") {
          console.log(`レッスン ${existingLessonId} は既に処理済みまたは処理中です（ステータス: ${existingLessonData.status}）。処理を中止します。`);
          return;
        }
        
        // 失敗したか未完了なら再処理
        console.log(`レッスン ${existingLessonId} のステータスが "${existingLessonData.status}" なので再処理します。`);
        
        try {
          // ステータスを処理中に設定
          await db.collection("lessons").doc(existingLessonId).update({
            status: "processing",
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
          
          // 音声ファイルの処理を実行
          await processAudioForLesson(existingLessonId, filePath, fileBucket, tempFilePath);
          console.log(`レッスン ${existingLessonId} の再処理が完了しました`);
        } catch (error) {
          console.error(`レッスン ${existingLessonId} の再処理中にエラーが発生しました:`, error);
        }
        
        return;
      }
      
      // 処理済みレッスンの中でstatusが"completed"のものがあれば
      // それは音声なしのレッスンの可能性が高いので、
      // 改めて検索して確認
      const completedCheck = await db.collection("lessons")
        .where("user_id", "==", userId)
        .where("status", "==", "completed")
        .orderBy("updated_at", "desc")
        .limit(5)
        .get();
      
      // 完了済みレッスンで検証（音声がないレッスンの場合）
      if (!completedCheck.empty) {
        for (const completedDoc of completedCheck.docs) {
          const completedData = completedDoc.data();
          
          // audioPathがない、または空文字のレッスンがオーディオなしレッスン
          if (!completedData.audioPath || completedData.audioPath === "") {
            console.log(`注意: 音声なしで完了済みのレッスン ${completedDoc.id} が見つかりました`);
            
            // このレッスンが今回のファイルと関連付けるべきものかどうかを判断
            // 例: 最近作成されたものか、processingIdがcompletedから始まるか
            if (completedData.processingId && 
                completedData.processingId.startsWith("completed_") && 
                completedData.updated_at) {
              const updatedTime = completedData.updated_at.toDate();
              const now = new Date();
              const timeDiff = (now.getTime() - updatedTime.getTime()) / (1000 * 60); // 分単位
              
              // 最近作成された（30分以内）音声なしレッスンの場合、これを使用
              if (timeDiff < 30) {
                console.log(`最近作成された音声なしレッスン ${completedDoc.id} を使用します（${Math.round(timeDiff)}分前）`);
                
                try {
                  // レッスンを更新
                  await db.collection("lessons").doc(completedDoc.id).update({
                    status: "processing",
                    audioPath: filePath,
                    fileName: fileName,
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                  });
                  
                  // 音声処理を実行
                  await processAudioForLesson(completedDoc.id, filePath, fileBucket, tempFilePath);
                  console.log(`レッスン ${completedDoc.id} の処理が完了しました`);
                  return;
                } catch (error) {
                  console.error(`音声なしレッスン ${completedDoc.id} の更新中にエラーが発生しました:`, error);
                  // エラーの場合は次の処理に進む
                }
              } else {
                console.log(`音声なしレッスン ${completedDoc.id} は ${Math.round(timeDiff)}分前に作成されたため使用しません`);
              }
            }
          }
        }
      }
      
      // 既存の未完了のレッスンを検索（ユーザーIDで）
      console.log(`ユーザー ${userId} の未完了レッスンを検索します`);
      
      const pendingStates = ["pending", "uploading", "waiting_for_audio", "waiting", "new", "processing"];
      const pendingLessonsSnapshot = await db.collection("lessons")
        .where("user_id", "==", userId)
        .where("status", "in", pendingStates)
        .orderBy("created_at", "desc")
        .limit(1)
        .get();
        
      if (!pendingLessonsSnapshot.empty) {
        const pendingLessonId = pendingLessonsSnapshot.docs[0].id;
        const pendingLessonData = pendingLessonsSnapshot.docs[0].data();
        
        // 同じファイルか、オーディオファイルが設定されていない場合のみ使用
        if (!pendingLessonData.audioPath) {
          console.log(`未完了レッスン ${pendingLessonId} を見つけました。これを使用します。`);
          
          try {
            // 既存のドキュメントを更新
            await db.collection("lessons").doc(pendingLessonId).update({
              status: "processing",
              audioPath: filePath,
              fileName: fileName,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            // 音声ファイルの処理を実行
            await processAudioForLesson(pendingLessonId, filePath, fileBucket, tempFilePath);
            console.log(`レッスン ${pendingLessonId} の処理が完了しました`);
          } catch (error) {
            console.error(`レッスン ${pendingLessonId} の処理中にエラーが発生しました:`, error);
          }
          
          return;
        } else {
          console.log(`未完了レッスン ${pendingLessonId} は既に音声ファイルが設定されています: ${pendingLessonData.audioPath}`);
        }
      }
      
      // 新しいレッスンドキュメントを作成
      console.log("新しいレッスンドキュメントを作成します");
      
      // 作成前に、このファイルに対する処理ロックを確認（同時処理防止）
      const lockId = `processing_lock_${fileName}`;
      const lockRef = db.collection("processingLocks").doc(lockId);
      
      // ロックを試行
      try {
        const lockSnapshot = await lockRef.get();
        
        if (lockSnapshot.exists) {
          // ロックが存在する場合、タイムスタンプをチェック
          const lockData = lockSnapshot.data();
          const lockTime = lockData?.timestamp?.toDate();
          const now = new Date();
          
          // 5分以上経過したロックは無効とみなす
          if (lockTime && (now.getTime() - lockTime.getTime() < 5 * 60 * 1000)) {
            console.log(`このファイル ${fileName} は既に処理ロックがかかっています（${Math.floor((now.getTime() - lockTime.getTime()) / 1000)}秒前）。処理を中止します。`);
            return;
          } else {
            console.log("ロックが古いため、新しいロックを作成します");
          }
        }
        
        // ロックを作成/更新
        await lockRef.set({
          filePath: filePath,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          fileName: fileName
        });
        
        console.log(`処理ロックを作成しました: ${lockId}`);
      } catch (lockError) {
        console.error("処理ロック作成中にエラーが発生しました:", lockError);
        // ロックエラーは無視して続行（最悪の場合重複が発生する）
      }
      
      // ユーザー情報を取得
      let teacherName = "不明";
      try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          teacherName = userData?.displayName || userData?.name || "不明";
        }
      } catch (userError) {
        console.error("ユーザー情報の取得中にエラーが発生しました:", userError);
      }
      
      // 可能であればファイル名からのIDを使用
      const newLessonRef = lessonId ? 
        db.collection("lessons").doc(lessonId) : 
        db.collection("lessons").doc();
      
      const newLessonId = newLessonRef.id;
      
      // 新しいlessonUniqIdを生成（まだない場合）
      if (!lessonUniqId) {
        lessonUniqId = generateUUID();
        console.log(`新しいlessonUniqIdを生成しました: ${lessonUniqId}`);
      }
      
      await newLessonRef.set({
        user_id: userId,
        teacher: teacherName,
        date: new Date().toISOString().split("T")[0],
        status: "processing",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        audioPath: filePath,
        fileName: fileName,
        processingId: fileIdForLock, // 処理追跡用の一意のID
        lessonUniqId: lessonUniqId, // 固有のlessonUniqIdを保存
        pieces: [],
        notes: "音声ファイルから自動作成されたレッスン"
      });
      
      console.log(`新しいレッスンドキュメントを作成しました: ${newLessonId}、lessonUniqId: ${lessonUniqId}`);
      
      try {
        // 音声ファイルの処理を実行
        await processAudioForLesson(newLessonId, filePath, fileBucket, tempFilePath);
        console.log(`レッスン ${newLessonId} の処理が完了しました`);
        
        // 処理ロックを解除
        try {
          await lockRef.delete();
          console.log(`処理ロックを解除しました: ${lockId}`);
        } catch (unlockError) {
          console.error("処理ロック解除中にエラーが発生しました:", unlockError);
        }
        
        // 念のため同じファイルの重複ドキュメントをクリーンアップ
        const dupCheckSnapshot = await db.collection("lessons")
          .where("audioPath", "==", filePath)
          .where("status", "in", ["completed", "transcribed"])
          .get();
          
        if (dupCheckSnapshot.size > 1) {
          console.log(`同じオーディオパスを持つレッスンが複数あります (${dupCheckSnapshot.size}件)。重複をクリーンアップします。`);
        
          // このレッスン以外の重複を非表示にする
          const batchSize = 500;
          let batch = db.batch();
          let operationCount = 0;
          
          for (const doc of dupCheckSnapshot.docs) {
            // 現在処理したドキュメント以外を非表示に
            if (doc.id !== newLessonId) {
              console.log(`重複レッスン ${doc.id} を非表示に設定します。`);
              batch.update(doc.ref, { 
                status: "duplicate",
                duplicate: true,
                duplicateOf: newLessonId,
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
      } catch (error) {
        console.error(`レッスン ${newLessonId} の処理中にエラーが発生しました:`, error);
        
        // エラー情報を記録
        try {
          await newLessonRef.update({
            status: "error",
            error: error instanceof Error ? error.message : String(error),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          });
        } catch (updateError) {
          console.error("エラー情報の記録中にさらにエラーが発生しました:", updateError);
        }
      }
    } catch (error) {
      console.error("Storage Trigger処理中にエラーが発生しました:", error);
    }
  }
);
