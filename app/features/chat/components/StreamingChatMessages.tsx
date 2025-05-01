import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, Platform, RefreshControl } from 'react-native';
import { ChatMessage } from '../../../../services/chatRoomService';
import MessageBubble from './MessageBubble';
import { useStreamingText, getLastAiMessage } from '../utils/streamingUtils';

interface StreamingChatMessagesProps {
  messages: ChatMessage[];
  loading?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  enableStreaming?: boolean; // ストリーミング機能を有効にするかどうか
}

const StreamingChatMessages: React.FC<StreamingChatMessagesProps> = ({ 
  messages, 
  loading = false, 
  onRefresh, 
  refreshing = false,
  enableStreaming = true
}) => {
  const flatListRef = useRef<FlatList>(null);
  const lastAiMessage = getLastAiMessage(messages);
  
  // 最後のAIメッセージを特定し、ストリーミング表示を適用
  const { displayedText, isStreaming } = useStreamingText(
    lastAiMessage?.content || '',
    enableStreaming && lastAiMessage !== null
  );
  
  // ストリーミング表示用の処理済みメッセージリストを作成
  const processedMessages = [...messages];
  
  // 最後のAIメッセージがある場合、そのコンテンツをストリーミング中のテキストに差し替え
  if (lastAiMessage && isStreaming) {
    const lastAiIndex = processedMessages.findIndex(msg => msg.id === lastAiMessage.id);
    if (lastAiIndex !== -1) {
      processedMessages[lastAiIndex] = {
        ...lastAiMessage,
        content: displayedText
      };
    }
  }
  
  // メッセージが変わったらスクロール
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
    }
  }, [messages.length, displayedText]);
  
  // リストの表示アイテム
  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const lastAiId = lastAiMessage?.id;
    const isLastAiMessage = item.id === lastAiId;
    
    return (
      <MessageBubble
        key={item.id}
        content={item.content}
        role={item.sender}
        isStreaming={isLastAiMessage && isStreaming}
        containerStyle={styles.messageBubbleContainer}
        // 最初と最後のメッセージは常にアバターを表示
        showAvatar={index === 0 || index === messages.length - 1 || 
          // 連続した同じ送信者のメッセージの場合、最後のメッセージのみアバターを表示
          messages[index - 1]?.sender !== item.sender}
      />
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      data={processedMessages}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.messagesContainer}
      style={styles.flatList}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4285F4']}
            tintColor="#4285F4"
          />
        ) : undefined
      }
      ListHeaderComponent={<View style={styles.headerSpacer} />}
      ListFooterComponent={<View style={styles.footerSpacer} />}
      onLayout={() => {
        if (flatListRef.current && messages.length > 0) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
      }}
    />
  );
};

const styles = StyleSheet.create({
  flatList: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  messagesContainer: {
    paddingHorizontal: 16,
  },
  headerSpacer: {
    height: 12,
  },
  footerSpacer: {
    height: 20,
  },
  messageBubbleContainer: {
    marginVertical: 4,
  },
});

export default StreamingChatMessages; 