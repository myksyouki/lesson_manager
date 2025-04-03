import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
  details?: any;
}

interface UseErrorHandlerReturn {
  error: ErrorState;
  setError: (message: string, code?: string, details?: any) => void;
  clearError: () => void;
  handleError: (error: any, defaultMessage?: string) => void;
  showErrorAlert: (title?: string) => void;
}

/**
 * エラーハンドリングのためのカスタムフック
 * @param initialMessage 初期エラーメッセージ
 * @returns エラー状態と操作関数
 */
export const useErrorHandler = (initialMessage: string = ''): UseErrorHandlerReturn => {
  const [error, setErrorState] = useState<ErrorState>({
    hasError: !!initialMessage,
    message: initialMessage,
    code: undefined,
    details: undefined,
  });

  // エラーを設定
  const setError = useCallback((message: string, code?: string, details?: any) => {
    setErrorState({
      hasError: true,
      message,
      code,
      details,
    });
    console.error(`エラー [${code || 'UNKNOWN'}]: ${message}`, details);
  }, []);

  // エラーをクリア
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      message: '',
      code: undefined,
      details: undefined,
    });
  }, []);

  // エラーを処理
  const handleError = useCallback((error: any, defaultMessage: string = 'エラーが発生しました') => {
    if (error instanceof Error) {
      setError(error.message, 'ERROR', error);
    } else if (typeof error === 'string') {
      setError(error, 'ERROR');
    } else if (error && error.message) {
      setError(error.message, error.code, error);
    } else {
      setError(defaultMessage, 'UNKNOWN_ERROR', error);
    }
  }, [setError]);

  // エラーアラートを表示
  const showErrorAlert = useCallback((title: string = 'エラー') => {
    if (error.hasError) {
      Alert.alert(
        title,
        error.message,
        [{ text: 'OK', onPress: clearError }]
      );
    }
  }, [error, clearError]);

  return {
    error,
    setError,
    clearError,
    handleError,
    showErrorAlert,
  };
}; 