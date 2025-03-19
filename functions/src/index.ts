import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";

// Initialize Firebase Admin
admin.initializeApp();

// サービスの状態を確認するためのエンドポイント
export const healthCheck = onRequest((req, res) => {
  res.status(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Firebase Functions API is up and running",
  });
});
