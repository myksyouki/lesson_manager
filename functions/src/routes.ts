import express, { Router } from "express";
import { processAudio, getLesson, getUserLessons } from "./controllers/lessonController";
import { getUserTasks, createTask, updateTask, deleteTask } from "./controllers/taskController";

// メインのExpressルーター
const router: Router = express.Router();

// ヘルスチェック用のルート
router.get("/", (req, res) => {
  res.status(200).send("OK - Firebase Functions v2 Health Check");
});

// レッスン関連のルート
router.post("/process-audio", processAudio);
router.get("/lesson/:lessonId", getLesson);
router.get("/user-lessons/:userId", getUserLessons);

// タスク関連のルート
router.get("/user-tasks/:userId", getUserTasks);
router.post("/tasks", createTask);
router.put("/tasks/:taskId", updateTask);
router.delete("/tasks/:taskId", deleteTask);

export default router;
