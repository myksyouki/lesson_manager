import React, { useState, useRef } from 'react';
import { 
  View, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Text, 
  Platform, 
  Keyboard, 
  Dimensions 
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

export interface ChatInputProps {
  message: string;
  onChangeMessage: (message: string) => void;
  onSend: () => void;
  sending: boolean;
  roomId: string;
  instrument: string;
}

export function ChatInput({
  message,
  onChangeMessage,
  onSend,
  sending,
  roomId,
  instrument,
}: ChatInputProps) {
  const inputRef = useRef<TextInput>(null);
  
  // フォーカスイベントの抑制するために単一のイベントハンドラを使用
  const handleMessageChange = (text: string) => {
    onChangeMessage(text);
  };
  
  // 送信後キーボードを閉じる
  const handleSendPress = () => {
    if (!message.trim() || sending) return;
    
    // 送信処理を実行
    onSend();
    
    // メッセージ入力をクリア
    onChangeMessage('');
    
    // キーボードを閉じる
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={message}
          onChangeText={handleMessageChange}
          placeholder="メッセージを入力..."
          multiline
          maxLength={2000}
          placeholderTextColor="#9E9EA7"
          editable={!sending}
        />
          
        <TouchableOpacity
          style={[
            styles.sendButton, 
            !message.trim() ? styles.disabledButton : styles.activeButton
          ]}
          onPress={handleSendPress}
          disabled={!message.trim() || sending}
          activeOpacity={0.7}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons 
              name="paper-plane" 
              size={20} 
              color={!message.trim() ? "#C5C8CE" : "#FFFFFF"} 
            />
          )}
        </TouchableOpacity>
      </View>
      
      {/* モデル情報と文字制限表示 */}
      <View style={styles.infoContainer}>
        <View style={styles.modelInfo}>
          <MaterialIcons name="model-training" size={12} color="#9E9EA7" />
          <Text style={styles.modelText}>
            {instrument === 'standard' ? 'スタンダードモデル' : instrument}
          </Text>
        </View>
        
        {/* メッセージが長くなったら残り文字数を表示 */}
        {message.length > 1000 && (
          <Text style={[
            styles.charCountText,
            message.length > 1800 && styles.charCountWarning
          ]}>
            {2000 - message.length}
          </Text>
        )}
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E6',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F7F7F8',
    borderWidth: 1,
    borderColor: '#E5E5E6',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    fontSize: 16,
    color: '#343541',
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ECECF1',
  },
  activeButton: {
    backgroundColor: '#6E56CF',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
    paddingHorizontal: 8,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelText: {
    fontSize: 11,
    color: '#9E9EA7',
    marginLeft: 4,
  },
  charCountText: {
    fontSize: 11,
    color: '#9E9EA7',
  },
  charCountWarning: {
    color: '#FF3B30',
  },
});

// デフォルトエクスポートを追加
export default ChatInput;
