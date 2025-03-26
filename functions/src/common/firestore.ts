/**
 * Firebase Firestore ユーティリティ
 */

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import {createError, ErrorType, handleError} from "./errors";
import {USERS_COLLECTION} from "../config";

/**
 * レッスンステータスの定義
 */
export enum LessonStatus {
  NEW = "new",
  PROCESSING = "processing",
  TRANSCRIBED = "transcribed",
  COMPLETED = "completed",
  ERROR = "error"
}

/**
 * レッスンデータの型定義
 */
export interface LessonData {
  user_id: string;
  teacherName: string;
  date: string;
  notes?: string;
  pieces?: string[];
  tags?: string[];
  status: string;
  audioUrl?: string;
  audioPath?: string;
  transcription?: string;
  summary?: string;
  instrumentCategory?: string;
  instrumentName?: string;
  instrumentModel?: string;
  userPrompt?: string;
  processingProgress?: string;
  processingStep?: string;
  processingDetail?: string;
  audioDuration?: number;
  audioSize?: number;
  transcriptionId?: string;
  transcriptionCompleteTime?: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
  error?: string;
  [key: string]: any;
}

// Firestoreインスタンス
let db: admin.firestore.Firestore | null = null;

/**
 * Firestoreへの接続を初期化
 */
export function initFirestore(): admin.firestore.Firestore {
  if (!db) {
    try {
      // admin SDKが初期化されていない場合は初期化
      if (admin.apps.length === 0) {
        admin.initializeApp();
      }

      db = admin.firestore();
      logger.debug("Firestoreへの接続が確立されました");
    } catch (error) {
      logger.error("Firestoreの初期化に失敗しました:", error);
      throw createError(
        ErrorType.INTERNAL,
        "Failed to initialize Firestore",
        {error: error instanceof Error ? error.message : String(error)}
      );
    }
  }

  return db;
}

/**
 * レッスンの型定義
 */
export interface Lesson {
  id: string;
  userId: string;
  title: string;
  date: FirebaseFirestore.Timestamp;
  instrument?: string;
  teacherName?: string;
  audioUrl?: string;
  status?: "pending" | "processing" | "completed" | "error";
  processingProgress?: number;
  processingMessage?: string;
  transcription?: string;
  summary?: string;
  tags?: string[];
  processingTimeSeconds?: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * レッスンデータを取得 - シンプルな検索方法
 */
export async function getLesson(lessonId: string): Promise<Lesson | null> {
  try {
    const firestore = initFirestore();
    
    // レッスンIDを正規化（プレフィックス付きに統一）
    const normalizedLessonId = lessonId.startsWith("lesson_") ? lessonId : `lesson_${lessonId}`;
    
    // シンプルに2つの方法で検索（優先順位：lessonId → ドキュメントID）
    // 方法1: lessonIdフィールドで検索
    logger.info(`lessonIdフィールドでレッスンを検索: ${normalizedLessonId}`);
    const uniqIdQuery = firestore
      .collectionGroup("lessons")
      .where("lessonId", "==", normalizedLessonId)
      .limit(1);
    
    let querySnapshot = await uniqIdQuery.get();
    
    // 方法2: ドキュメントIDで検索（方法1で見つからない場合）
    if (querySnapshot.empty) {
      logger.info(`lessonIdで見つからなかったため、ドキュメントIDで検索: ${normalizedLessonId}`);
      const docIdQuery = firestore
        .collectionGroup("lessons")
        .where(admin.firestore.FieldPath.documentId(), "==", normalizedLessonId)
        .limit(1);
      
      querySnapshot = await docIdQuery.get();
      
      if (querySnapshot.empty) {
        logger.warn(`いずれの方法でもレッスンが見つかりません: ${normalizedLessonId}`);
        return null;
      }
      
      logger.info(`ドキュメントIDでレッスンが見つかりました: ${normalizedLessonId}`, {
        path: querySnapshot.docs[0].ref.path,
      });
    } else {
      logger.info(`lessonIdフィールドでレッスンが見つかりました: ${normalizedLessonId}`, {
        path: querySnapshot.docs[0].ref.path,
        docId: querySnapshot.docs[0].id,
      });
    }
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
    } as Lesson;
  } catch (error) {
    logger.error(`レッスンの取得に失敗しました: ${lessonId}`, error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to get lesson: ${lessonId}`,
      {lessonId, error: error instanceof Error ? error.message : String(error)}
    );
  }
}

/**
 * レッスンデータを更新
 */
export async function updateLessonData(
  userId: string,
  lessonId: string,
  data: Partial<LessonData>
): Promise<void> {
  try {
    const updateData = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const lessonRef = admin.firestore().doc(`users/${userId}/lessons/${lessonId}`);
    await lessonRef.update(updateData);

    logger.info(`レッスンデータを更新しました: ${lessonId}`, {
      userId,
      lessonId,
      fields: Object.keys(data),
    });
  } catch (error) {
    handleError(error, "updateLessonData");
  }
}

/**
 * レッスンステータスのみを更新
 */
export async function updateLessonStatus(
  userId: string,
  lessonId: string,
  status: LessonStatus,
  errorMsg?: string
): Promise<void> {
  const updateData: Partial<LessonData> = {
    status: status,
  };

  if (errorMsg && status === LessonStatus.ERROR) {
    updateData.error = errorMsg;
  }

  await updateLessonData(userId, lessonId, updateData);
}

/**
 * レッスンの処理状態を更新 - バッチ処理を使用した改良版
 */
export async function updateLessonProcessingStatus(
  lessonId: string,
  status: "pending" | "processing" | "completed" | "error",
  progress = 0,
  message?: string,
  additionalData: Record<string, any> = {},
  audioFilePath?: string
): Promise<void> {
  try {
    if (!lessonId || lessonId.trim() === "") {
      throw createError(
        ErrorType.INVALID_ARGUMENT,
        "Lesson ID cannot be empty"
      );
    }
    
    // レッスンIDの正規化 - プレフィックス付きに統一
    const normalizedId = lessonId.trim();
    const withPrefixId = normalizedId.startsWith("lesson_") ? normalizedId : `lesson_${normalizedId}`;
    
    logger.info(`レッスン処理状態を更新する準備をしています: ${withPrefixId} -> ${status}`);
    
    let foundDoc: FirebaseFirestore.DocumentSnapshot | null = null;
    let fullPath = "";
    const firestore = initFirestore();
    
    // 検索ID配列 - 両方のバージョンを試す（移行期間のため）
    const idsToSearch = [withPrefixId];
    
    // 元のIDとプレフィックス付きのバージョンが異なる場合は両方を検索（移行期間のため）
    if (normalizedId !== withPrefixId) {
      idsToSearch.push(normalizedId);
    }
    
    logger.debug(`検索するID一覧: ${idsToSearch.join(", ")}`);
    
    // 1. lessonIdフィールドでコレクショングループ検索
    for (const idToSearch of idsToSearch) {
      if (foundDoc) break; // すでに見つかった場合はスキップ
      
      try {
        logger.info(`lessonIdフィールドでレッスンを検索: ${idToSearch}`);
        const uniqIdQuery = firestore
          .collectionGroup("lessons")
          .where("lessonId", "==", idToSearch)
          .limit(1);
        
        const uniqIdSnapshot = await uniqIdQuery.get();
        
        if (!uniqIdSnapshot.empty) {
          foundDoc = uniqIdSnapshot.docs[0];
          fullPath = foundDoc.ref.path;
          logger.info(`lessonIdフィールドでレッスンが見つかりました: ${idToSearch}`, {
            path: fullPath,
            docId: foundDoc.id,
          });
          break;
        }
      } catch (searchError) {
        logger.warn(`lessonIdでの検索中にエラーが発生: ${idToSearch}`, searchError);
      }
    }
    
    // 2. lessonsコレクションの直接ドキュメントとして検索
    if (!foundDoc) {
      for (const idToSearch of idsToSearch) {
        if (foundDoc) break; // すでに見つかった場合はスキップ
        
        try {
          logger.info(`lessonsコレクションの直接ドキュメントとして検索: ${idToSearch}`);
          const directRef = firestore.collection("lessons").doc(idToSearch);
          const directDoc = await directRef.get();
          
          if (directDoc.exists) {
            foundDoc = directDoc;
            fullPath = directDoc.ref.path;
            logger.info(`lessonsコレクションで直接レッスンが見つかりました: ${idToSearch}`, {
              path: fullPath,
            });
            break;
          }
        } catch (directSearchError) {
          logger.warn(`直接ドキュメント検索中にエラーが発生: ${idToSearch}`, directSearchError);
        }
      }
    }
    
    // 3. ユーザーコレクション下のレッスンを検索
    if (!foundDoc) {
      for (const idToSearch of idsToSearch) {
        if (foundDoc) break; // すでに見つかった場合はスキップ
        
        try {
          logger.info(`ユーザーコレクション下のレッスンを検索: ${idToSearch}`);
          
          // ユーザーコレクション下のレッスンを検索
          const userLessonsQuerySnapshot = await firestore
            .collection("users")
            .get();
          
          let found = false;
          // 見つかったユーザーそれぞれについて、そのレッスンコレクションを検索
          for (const userDoc of userLessonsQuerySnapshot.docs) {
            if (found) break;
            
            const userId = userDoc.id;
            const lessonRef = firestore.collection(`users/${userId}/lessons`).doc(idToSearch);
            const lessonDoc = await lessonRef.get();
            
            if (lessonDoc.exists) {
              foundDoc = lessonDoc;
              fullPath = lessonDoc.ref.path;
              logger.info(`ユーザー/${userId}/レッスンコレクション内でレッスンが見つかりました: ${idToSearch}`, {
                path: fullPath,
              });
              found = true;
              break;
            }
          }
          
          if (found) break;
        } catch (docIdSearchError) {
          logger.warn(`ユーザーコレクション検索中にエラーが発生: ${idToSearch}`, docIdSearchError);
        }
      }
    }
    
    // 4. ストレージパスのユーザーIDを使って特定のユーザーのレッスンを検索
    if (!foundDoc && audioFilePath) {
      try {
        // 例：gs://bucket/audio/userId/lessonId/file.mp3 からuserIdを抽出
        // または /audio/userId/lessonId/file.mp3 形式のパスにも対応
        logger.info(`オーディオファイルパスからユーザーIDを抽出: ${audioFilePath}`);
        const pathParts = audioFilePath.split("/");
        
        // audio フォルダの次がユーザーIDと想定
        const audioIndex = pathParts.findIndex((part: string) => part === "audio");
        if (audioIndex !== -1 && audioIndex + 1 < pathParts.length) {
          const extractedUserId = pathParts[audioIndex + 1];
          
          if (extractedUserId) {
            logger.info(`抽出されたユーザーID: ${extractedUserId}`);
            
            for (const idToSearch of idsToSearch) {
              try {
                const specificLessonRef = firestore.collection(`users/${extractedUserId}/lessons`).doc(idToSearch);
                const specificLessonDoc = await specificLessonRef.get();
                
                if (specificLessonDoc.exists) {
                  foundDoc = specificLessonDoc;
                  fullPath = specificLessonDoc.ref.path;
                  logger.info(`特定ユーザー/${extractedUserId}/レッスン内でレッスンが見つかりました: ${idToSearch}`, {
                    path: fullPath,
                  });
                  break;
                }
              } catch (specificError) {
                logger.warn(`特定ユーザー検索中にエラーが発生: ${extractedUserId}/${idToSearch}`, specificError);
              }
            }
          }
        }
      } catch (extractError) {
        logger.warn(`ファイルパスからのユーザーID抽出エラー: ${audioFilePath}`, extractError);
      }
    }
    
    // レッスン検索の結果確認
    if (!foundDoc) {
      // エラーメッセージに検索した複数のIDを含める
      throw createError(
        ErrorType.NOT_FOUND,
        `Lesson not found for update: ${withPrefixId} (searched IDs: ${idsToSearch.join(", ")}) - tried all search methods`
      );
    }
    
    // 更新データを準備
    const updateData: Record<string, any> = {
      status,
      processingProgress: progress,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lessonId: withPrefixId, // 常に一貫性を保つためにlessonIdを同期（プレフィックス付き）
    };

    // メッセージの追加（存在する場合のみ）
    if (message !== undefined) {
      updateData.processingMessage = message;
    }

    // 追加データのマージ
    Object.keys(additionalData).forEach((key) => {
      updateData[key] = additionalData[key];
    });

    logger.info(`レッスン処理状態を更新します: ${withPrefixId} -> ${status}`, {
      path: fullPath,
      updateData: JSON.stringify(updateData),
    });
    
    // 更新を実行: トランザクションを使用して更新の信頼性を高める
    try {
      await firestore.runTransaction(async (transaction) => {
        // 更新するドキュメントへの参照
        const docRef = firestore.doc(fullPath);
        
        // トランザクション内でドキュメントを再取得
        const docSnapshot = await transaction.get(docRef);
        
        if (!docSnapshot.exists) {
          throw new Error(`Transaction error: Document at ${fullPath} no longer exists`);
        }
        
        // ドキュメントを更新
        transaction.update(docRef, updateData);
        
        return true;
      });
      
      logger.info(`レッスン処理状態を更新しました: ${withPrefixId} -> ${status}, ${progress}%`, {
        path: fullPath,
      });
    } catch (transactionError) {
      logger.error(`トランザクション更新に失敗: ${withPrefixId}`, transactionError);
      
      // トランザクション失敗時のフォールバック: 直接更新を試みる
      logger.info(`トランザクション失敗のため直接更新を試みます: ${withPrefixId}`);
      const docRef = firestore.doc(fullPath);
      await docRef.update(updateData);
      
      logger.info(`直接更新でレッスン処理状態を更新しました: ${withPrefixId} -> ${status}, ${progress}%`, {
        path: fullPath,
      });
    }
  } catch (error) {
    logger.error(`レッスン処理状態の更新に失敗: ${lessonId}`, error);
    
    // より詳細なエラー情報をログ出力
    if (error instanceof Error) {
      logger.error(`詳細エラー情報: ${lessonId}`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code,
      });
    }
    
    // エラーを再スロー
    throw createError(
      ErrorType.INTERNAL,
      `Failed to update lesson processing status: ${lessonId}`,
      {lessonId, status, progress, error: error instanceof Error ? error.message : String(error)}
    );
  }
}

/**
 * ユーザー情報を取得
 */
export async function getUser(userId: string): Promise<any | null> {
  try {
    const firestore = initFirestore();
    const docRef = firestore.collection(USERS_COLLECTION).doc(userId);
    const doc = await docRef.get();

    if (!doc.exists) {
      logger.warn(`ユーザーが見つかりません: ${userId}`);
      return null;
    }

    return {
      id: doc.id,
      ...doc.data(),
    };
  } catch (error) {
    logger.error(`ユーザーの取得に失敗しました: ${userId}`, error);
    throw createError(
      ErrorType.INTERNAL,
      `Failed to get user: ${userId}`,
      {userId, error: error instanceof Error ? error.message : String(error)}
    );
  }
}
