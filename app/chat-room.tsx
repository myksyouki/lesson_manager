import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuthStore } from './store/auth';
import { useTaskStore } from './store/tasks';
import { getChatRoom, addMessageToChatRoom, ChatRoom } from './services/chatRoomService';
import { sendMessageToLessonAI, ChatMessage, createPracticeMenu, PracticeMenu } from './services/difyService';
import { createTaskFromPracticeMenu } from './services/taskService';
import ChatHeader from './features/chat/components/ChatHeader';
import ChatMessages from './features/chat/components/ChatMessages';
import ChatInput from './features/chat/components/ChatInput';
import PracticeMenuModal from './features/chat/components/PracticeMenuModal';

export default function ChatRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [practiceMenus, setPracticeMenus] = useState<PracticeMenu[]>([]);
  const [rawPracticeMenu, setRawPracticeMenu] = useState<string>('');
  const [showPracticeMenu, setShowPracticeMenu] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();
  const { addTask } = useTaskStore();

  useEffect(() => {
    if (id && user) {
      loadChatRoom();
    }
  }, [id, user]);

  const loadChatRoom = async () => {
    try {
      setLoading(true);
      if (!id) return;
      
      const room = await getChatRoom(id);
      setChatRoom(room);
    } catch (error) {
      console.error('チャットルーム取得エラー:', error);
      Alert.alert('エラー', 'チャットルームの取得に失敗しました。後でもう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || !chatRoom || !user) return;

    try {
      setSending(true);
      
      // ユーザーメッセージをチャットに追加
      const userMessage: ChatMessage = {
        role: 'user',
        content: message.trim(),
      };
      
      await addMessageToChatRoom(chatRoom.id, userMessage, chatRoom.conversationId);
      
      // UIを更新
      setChatRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, userMessage],
        };
      });
      
      setMessage('');

      // Dify APIに送信
      const response = await sendMessageToLessonAI(
        message.trim(),
        chatRoom.conversationId
      );
      
      // AIの応答をチャットに追加
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
      };
      
      await addMessageToChatRoom(chatRoom.id, aiMessage, response.conversationId);
      
      // UIを更新
      setChatRoom(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: [...prev.messages, aiMessage],
          conversationId: response.conversationId,
        };
      });
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      Alert.alert('エラー', 'メッセージの送信に失敗しました。後でもう一度お試しください。');
    } finally {
      setSending(false);
    }
  };

  const handleExport = async () => {
    if (!chatRoom || !user) return;
    
    try {
      setExporting(true);
      
      // チャット履歴が少なすぎる場合は警告
      if (chatRoom.messages.length < 3) {
        Alert.alert(
          '警告',
          'チャット履歴が少なすぎます。もう少しAIと対話してから練習メニューを作成してください。',
          [{ text: 'OK' }]
        );
        setExporting(false);
        return;
      }
      
      // 練習メニュー作成AIに送信
      const result = await createPracticeMenu(chatRoom.messages);
      
      // 練習メニューを表示するためにステートを更新
      setPracticeMenus(result.practiceMenus);
      setRawPracticeMenu(result.rawContent);
      setShowPracticeMenu(true);
      
    } catch (error) {
      console.error('エクスポートエラー:', error);
      Alert.alert('エラー', '練習メニューの作成に失敗しました。後でもう一度お試しください。');
    } finally {
      setExporting(false);
    }
  };

  const handleSavePracticeMenu = async () => {
    if (!rawPracticeMenu || !chatRoom || !user) return;
    
    try {
      setExporting(true);
      
      // タスクとして保存（複数のタスクが返される可能性あり）
      const createdTasks = await createTaskFromPracticeMenu(user.uid, rawPracticeMenu, chatRoom.id);
      
      // 作成したタスクをタスクストアに追加
      createdTasks.forEach(task => {
        addTask(task);
      });
      
      // モーダルを閉じる
      setShowPracticeMenu(false);
      
      Alert.alert(
        '成功',
        `${createdTasks.length}個の練習メニューをタスクとして保存しました。`,
        [
          {
            text: 'タスク画面へ',
            onPress: () => {
              // タスクタブに遷移
              router.push('/(tabs)/task');
            },
          },
        ]
      );
    } catch (error) {
      console.error('練習メニューからのタスク作成中にエラーが発生しました:', error);
      Alert.alert('エラー', 'タスクの保存に失敗しました。後でもう一度お試しください。');
    } finally {
      setExporting(false);
    }
  };

  const handleEditPracticeMenu = () => {
    if (!rawPracticeMenu || !chatRoom) return;
    
    // モーダルを閉じる
    setShowPracticeMenu(false);
    
    // 編集画面に遷移
    setTimeout(() => {
      router.push({
        pathname: '/task-form',
        params: { 
          practiceMenu: rawPracticeMenu,
          chatRoomId: chatRoom.id,
          redirectTo: '/(tabs)/task' // タスク作成後にタスクタブに遷移するためのパラメータ
        }
      });
    }, 300); // 少し遅延させてモーダルが閉じた後に遷移するようにする
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ChatHeader
          title={chatRoom?.title || 'チャット'}
          onExport={handleExport}
          exporting={exporting}
        />

        <ChatMessages
          messages={chatRoom?.messages || []}
          loading={loading}
        />

        <ChatInput
          message={message}
          onChangeMessage={setMessage}
          onSend={handleSend}
          sending={sending}
        />

        <PracticeMenuModal
          visible={showPracticeMenu}
          onClose={() => setShowPracticeMenu(false)}
          practiceMenus={practiceMenus}
          onSave={handleSavePracticeMenu}
          onEdit={handleEditPracticeMenu}
          exporting={exporting}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});
