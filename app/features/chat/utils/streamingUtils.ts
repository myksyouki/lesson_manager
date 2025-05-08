import { useRef, useState, useEffect } from 'react';
import { ChatMessage } from '../../../../services/chatRoomService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Dify APIを使ったストリーミングレスポンスのシミュレーション機能
 */

// ストリーミングメッセージの表示速度調整
const STREAMING_CHAR_DELAY = 15; // 文字表示の間隔（ミリ秒）
const MIN_STREAMING_LENGTH = 5; // 最小ストリーミング表示文字数（あまりに短いとストリーミング効果が分かりにくい）

// 表示済みメッセージを追跡するためのキー
const STREAMED_MESSAGES_KEY = 'streamed_messages';

/**
 * メッセージIDがすでにストリーミング表示されたかどうかを確認する
 * @param messageId メッセージID
 * @returns ストリーミング済みの場合はtrue
 */
const checkIfAlreadyStreamed = async (messageId: string): Promise<boolean> => {
  try {
    const streamedMessages = await AsyncStorage.getItem(STREAMED_MESSAGES_KEY);
    if (streamedMessages) {
      const messages = JSON.parse(streamedMessages) as string[];
      return messages.includes(messageId);
    }
    return false;
  } catch (error) {
    console.error('ストリーミング履歴確認エラー:', error);
    return false;
  }
};

/**
 * メッセージをストリーミング済みとしてマーク
 * @param messageId メッセージID
 */
const markAsStreamed = async (messageId: string): Promise<void> => {
  try {
    const streamedMessages = await AsyncStorage.getItem(STREAMED_MESSAGES_KEY);
    let messages: string[] = [];
    
    if (streamedMessages) {
      messages = JSON.parse(streamedMessages) as string[];
    }
    
    // すでに記録されている場合は何もしない
    if (!messages.includes(messageId)) {
      messages.push(messageId);
      await AsyncStorage.setItem(STREAMED_MESSAGES_KEY, JSON.stringify(messages));
    }
  } catch (error) {
    console.error('ストリーミング履歴保存エラー:', error);
  }
};

/**
 * メッセージのストリーミング表示をシミュレートするカスタムフック
 * @param fullMessage 完全なメッセージテキスト
 * @param simulateStreaming ストリーミングシミュレーションを有効にするかどうか
 * @param messageId メッセージのID
 * @returns 現在表示中のテキストと、ストリーミング中かどうかを示すフラグ
 */
export const useStreamingText = (
  fullMessage: string, 
  simulateStreaming: boolean = true,
  messageId?: string
): { displayedText: string; isStreaming: boolean } => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [alreadyChecked, setAlreadyChecked] = useState(false);
  
  // タイマーIDを保持するためのRef
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 前回のメッセージを保持するためのRef
  const prevMessageRef = useRef('');
  
  // ストリーミング済みかどうかを確認
  useEffect(() => {
    if (messageId && !alreadyChecked && simulateStreaming) {
      (async () => {
        const isStreamed = await checkIfAlreadyStreamed(messageId);
        setAlreadyChecked(true);
        
        if (isStreamed) {
          // すでにストリーミング表示済みの場合は即時表示
          setDisplayedText(fullMessage);
          setIsStreaming(false);
        }
      })();
    }
  }, [messageId, simulateStreaming, alreadyChecked, fullMessage]);
  
  useEffect(() => {
    // メッセージが変わったとき、またはストリーミングが無効で新しいメッセージが来たとき
    if (fullMessage !== prevMessageRef.current && (!messageId || alreadyChecked)) {
      prevMessageRef.current = fullMessage;
      
      // 既存のタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      
      // 以下の場合は即時表示:
      // 1. ストリーミングが無効
      // 2. メッセージが短すぎる
      // 3. メッセージIDがなく履歴確認ができない
      // 4. すでにストリーミング表示済み（alreadyCheckedがtrueで先のチェックで判断済み）
      if (!simulateStreaming || 
          fullMessage.length < MIN_STREAMING_LENGTH || 
          !messageId) {
        setDisplayedText(fullMessage);
        setIsStreaming(false);
        return;
      }
      
      // ここまで来たら、ストリーミング表示を開始
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
          
          // ストリーミングが完了したらメッセージをマーク
          if (messageId) {
            markAsStreamed(messageId);
          }
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
  }, [fullMessage, simulateStreaming, messageId, alreadyChecked]);
  
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