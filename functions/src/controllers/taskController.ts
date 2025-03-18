import { Request, Response } from "express";
import { db } from "../config";

/**
 * ユーザーのタスク一覧を取得するコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function getUserTasks(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.params.userId;

    if (!userId) {
      res.status(400).json({
        success: false,
        error: "ユーザーIDが指定されていません",
      });
      return;
    }

    const tasksSnapshot = await db
      .collection("tasks")
      .where("userId", "==", userId)
      .orderBy("dueDate", "asc")
      .get();

    const tasks = tasksSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
      };
    });

    res.status(200).json({
      success: true,
      data: tasks,
    });
  } catch (error) {
    console.error("タスク一覧の取得中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * タスクを作成するコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function createTask(req: Request, res: Response): Promise<void> {
  try {
    const { userId, title, description, dueDate, lessonId } = req.body;

    if (!userId || !title) {
      res.status(400).json({
        success: false,
        error: "必須パラメータが不足しています",
      });
      return;
    }

    const newTaskRef = db.collection("tasks").doc();
    const now = new Date().toISOString();

    await newTaskRef.set({
      userId,
      title,
      description: description || "",
      dueDate: dueDate || now,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      lessonId: lessonId || null,
    });

    res.status(201).json({
      success: true,
      data: {
        id: newTaskRef.id,
      },
    });
  } catch (error) {
    console.error("タスクの作成中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * タスクを更新するコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function updateTask(req: Request, res: Response): Promise<void> {
  try {
    const taskId = req.params.taskId;
    const updateData = req.body;

    if (!taskId) {
      res.status(400).json({
        success: false,
        error: "タスクIDが指定されていません",
      });
      return;
    }

    // 更新できないフィールドを除外
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.userId;

    // 更新日時を設定
    updateData.updatedAt = new Date().toISOString();

    await db.collection("tasks").doc(taskId).update(updateData);

    res.status(200).json({
      success: true,
      data: {
        id: taskId,
      },
    });
  } catch (error) {
    console.error("タスクの更新中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * タスクを削除するコントローラー
 * @param req リクエスト
 * @param res レスポンス
 */
export async function deleteTask(req: Request, res: Response): Promise<void> {
  try {
    const taskId = req.params.taskId;

    if (!taskId) {
      res.status(400).json({
        success: false,
        error: "タスクIDが指定されていません",
      });
      return;
    }

    await db.collection("tasks").doc(taskId).delete();

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error("タスクの削除中にエラーが発生しました:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
}

/**
 * レッスンから自動的にタスクを生成する関数
 * @param lessonId レッスンID
 * @param userId ユーザーID
 */
export async function generateTasksFromLesson(lessonId: string, userId: string): Promise<void> {
  try {
    console.log(`レッスン ${lessonId} からタスクを生成します`);

    // レッスンデータを取得
    const lessonDoc = await db.collection("lessons").doc(lessonId).get();
    if (!lessonDoc.exists) {
      console.error(`レッスン ${lessonId} が見つかりません`);
      return;
    }

    const lessonData = lessonDoc.data();
    if (!lessonData) {
      console.error(`レッスン ${lessonId} のデータが見つかりません`);
      return;
    }

    // 要約とタグが存在するか確認
    if (!lessonData.summary || !lessonData.tags || lessonData.tags.length === 0) {
      console.log(`レッスン ${lessonId} には要約またはタグがありません。タスク生成をスキップします。`);
      return;
    }

    // 次のレッスン日を計算（仮に2週間後とする）
    const nextLessonDate = new Date();
    nextLessonDate.setDate(nextLessonDate.getDate() + 14);
    const dueDate = nextLessonDate.toISOString();

    // タスクのタイトルと説明を生成
    const taskTitle = `${lessonData.piece || "無題のレッスン"}の練習`;
    const taskDescription = `${lessonData.summary}\n\n次のレッスンまでに練習してください。`;

    // タスクを作成
    const newTaskRef = db.collection("tasks").doc();
    const now = new Date().toISOString();

    await newTaskRef.set({
      userId,
      title: taskTitle,
      description: taskDescription,
      dueDate,
      isCompleted: false,
      createdAt: now,
      updatedAt: now,
      lessonId,
      tags: lessonData.tags,
    });

    console.log(`レッスン ${lessonId} からタスクを生成しました。タスクID: ${newTaskRef.id}`);
  } catch (error) {
    console.error("タスク生成中にエラーが発生しました:", error);
  }
}
