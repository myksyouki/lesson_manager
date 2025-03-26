/**
 * エラーハンドリングユーティリティ
 */

import * as logger from "firebase-functions/logger";

/**
 * エラー種別
 */
export enum ErrorType {
  CANCELLED = "cancelled",
  UNKNOWN = "unknown",
  INVALID_ARGUMENT = "invalid-argument",
  DEADLINE_EXCEEDED = "deadline-exceeded",
  NOT_FOUND = "not-found",
  ALREADY_EXISTS = "already-exists",
  PERMISSION_DENIED = "permission-denied",
  UNAUTHENTICATED = "unauthenticated",
  RESOURCE_EXHAUSTED = "resource-exhausted",
  FAILED_PRECONDITION = "failed-precondition",
  ABORTED = "aborted",
  OUT_OF_RANGE = "out-of-range",
  UNIMPLEMENTED = "unimplemented",
  INTERNAL = "internal",
  UNAVAILABLE = "unavailable",
  DATA_LOSS = "data-loss"
}

/**
 * エラー詳細
 */
export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: number;
  metadata?: Record<string, any>;
}

/**
 * カスタムエラークラス
 */
export class AppError extends Error {
  type: ErrorType;
  code?: number;
  metadata?: Record<string, any>;

  constructor(type: ErrorType, message: string, code?: number, metadata?: Record<string, any>) {
    super(message);
    this.type = type;
    this.code = code;
    this.metadata = metadata;
    this.name = "AppError";
  }
}

/**
 * エラーを作成
 */
export function createError(
  type: ErrorType,
  message: string,
  metadata?: Record<string, any>,
  code?: number
): AppError {
  return new AppError(type, message, code, metadata);
}

/**
 * エラーハンドラー
 * @return エラー詳細
 */
export function handleError(error: unknown, context?: string): ErrorDetails {
  // エラーログ
  if (context) {
    logger.error(`Error in ${context}:`, error);
  } else {
    logger.error("Error:", error);
  }

  // アプリケーションエラーの場合
  if (error instanceof AppError) {
    return {
      type: error.type,
      message: error.message,
      code: error.code,
      metadata: error.metadata,
    };
  }

  // 一般的なエラーの場合
  if (error instanceof Error) {
    return {
      type: ErrorType.INTERNAL,
      message: error.message,
      metadata: {
        stack: error.stack,
        name: error.name,
      },
    };
  }

  // その他の型のエラーの場合
  return {
    type: ErrorType.UNKNOWN,
    message: String(error),
  };
}
