/**
 * 管理者権限設定スクリプト
 * 
 * このスクリプトは特定のユーザーに管理者権限を付与します。
 * Firebase Functions から実行します。
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCall } from 'firebase-functions/v2/https';
import { FUNCTION_REGION } from '../config';
import { ErrorType, createError } from '../common/errors';

// アプリ初期化済みでない場合は初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 管理者権限設定関数
 */
export const setAdminRole = onCall(
  {
    region: FUNCTION_REGION,
  },
  async (request) => {
    try {
      // 認証チェック
      if (!request.auth) {
        throw createError(
          ErrorType.UNAUTHENTICATED,
          'この機能を使用するにはログインが必要です'
        );
      }

      const callerId = request.auth.uid;
      logger.info(`ユーザー ${callerId} が管理者設定を実行`);

      // SuperAdmin権限チェック (初回セットアップ用に特別なUIDを許可)
      const SUPER_ADMIN_UID = 'fY5GIog5htgqyhRBCZDp0CK2SMh1'; // スーパー管理者UID
      
      // 呼び出し元がスーパー管理者でなければエラー
      if (callerId !== SUPER_ADMIN_UID) {
        // 既存の管理者かチェック
        const callerDoc = await db.collection('users').doc(callerId).get();
        const callerData = callerDoc.data();
        
        if (!callerData?.isAdmin) {
          throw createError(
            ErrorType.PERMISSION_DENIED,
            '管理者権限がありません'
          );
        }
      }

      // 指定されたユーザーID
      const targetUserId = request.data?.userId as string;
      
      if (!targetUserId) {
        throw createError(
          ErrorType.INVALID_ARGUMENT,
          'ユーザーIDが指定されていません'
        );
      }

      // ユーザーが存在するか確認
      try {
        await admin.auth().getUser(targetUserId);
      } catch (error) {
        throw createError(
          ErrorType.NOT_FOUND,
          '指定されたユーザーが見つかりません'
        );
      }

      // 権限設定
      const isAdmin = request.data?.isAdmin === true;
      
      // ユーザードキュメントの作成または更新
      const userRef = db.collection('users').doc(targetUserId);
      await userRef.set({
        isAdmin: isAdmin,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: callerId
      }, { merge: true });

      logger.info(`ユーザー ${targetUserId} の管理者権限を ${isAdmin ? '付与' : '剥奪'} しました`);

      return {
        success: true,
        message: `ユーザー ${targetUserId} の管理者権限を ${isAdmin ? '付与' : '剥奪'} しました`
      };
    } catch (error) {
      logger.error('管理者権限設定エラー:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw createError(
        ErrorType.INTERNAL,
        '管理者権限の設定中にエラーが発生しました'
      );
    }
  }
);

/**
 * 初期セットアップで最初の管理者を設定
 * fY5GIog5htgqyhRBCZDp0CK2SMh1 ユーザーに管理者権限を付与
 */
export const initializeAdmin = onCall(
  {
    region: FUNCTION_REGION,
  },
  async () => {
    try {
      const ADMIN_UID = 'fY5GIog5htgqyhRBCZDp0CK2SMh1';
      
      // ユーザードキュメント作成または更新
      const userRef = db.collection('users').doc(ADMIN_UID);
      await userRef.set({
        isAdmin: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: 'system_init'
      }, { merge: true });

      logger.info(`初期管理者ユーザー ${ADMIN_UID} を設定しました`);

      return {
        success: true,
        message: `初期管理者ユーザーを設定しました`
      };
    } catch (error) {
      logger.error('初期管理者設定エラー:', error);
      
      throw createError(
        ErrorType.INTERNAL,
        '初期管理者の設定中にエラーが発生しました'
      );
    }
  }
); 