import { useRef, useState, useEffect } from 'react';
import { ChatMessage } from '../../../../services/chatRoomService';

/**
 * Dify APIを使ったストリーミングレスポンスのシミュレーション機能
 */

// ストリーミングメッセージの表示速度調整
const STREAMING_CHAR_DELAY = 15; // 文字表示の間隔（ミリ秒）
const MIN_STREAMING_LENGTH = 5; // 最小ストリーミング表示文字数（あまりに短いとストリーミング効果が分かりにくい）

/**
 * メッセージのストリーミング表示をシミュレートするカスタムフック
 * @param fullMessage 完全なメッセージテキスト
 * @param simulateStreaming ストリーミングシミュレーションを有効にするかどうか
 * @returns 現在表示中のテキストと、ストリーミング中かどうかを示すフラグ
 */
export const useStreamingText = (
  fullMessage: string, 
  simulateStreaming: boolean = true
): { displayedText: string; isStreaming: boolean } => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // タイマーIDを保持するためのRef
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 前回のメッセージを保持するためのRef
  const prevMessageRef = useRef('');
  
  useEffect(() => {
    // メッセージが変わったとき、またはストリーミングが無効で新しいメッセージが来たとき
    if (fullMessage !== prevMessageRef.current) {
      prevMessageRef.current = fullMessage;
      
      // 既存のタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // メッセージが短すぎる場合やストリーミングが無効な場合は即時表示
      if (!simulateStreaming || fullMessage.length < MIN_STREAMING_LENGTH) {
        setDisplayedText(fullMessage);
        setIsStreaming(false);
        return;
      }
      
      // ストリーミングシミュレーション開始
      setIsStreaming(true);
      setDisplayedText(''); // 表示をクリア
      
      let charIndex = 0;
      const streamText = () => {
        if (charIndex < fullMessage.length) {
          setDisplayedText(fullMessage.substring(0, charIndex + 1));
          charIndex++;
          timerRef.current = setTimeout(streamText, STREAMING_CHAR_DELAY);
        } else {
          setIsStreaming(false);
          timerRef.current = null;
        }
      };
      
      streamText();
    }
    
    // コンポーネントのアンマウント時にタイマーをクリア
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [fullMessage, simulateStreaming]);
  
  return { displayedText, isStreaming };
};

/**
 * チャットメッセージの最後のAIメッセージを取得する
 * @param messages メッセージ配列
 * @returns 最後のAIメッセージ、存在しない場合はnull
 */
export const getLastAiMessage = (messages: ChatMessage[]): ChatMessage | null => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].sender === 'ai') {
      return messages[i];
    }
  }
  return null;
}; 