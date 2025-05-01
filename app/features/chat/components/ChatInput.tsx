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
    onSend();
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={message}
            onChangeText={handleMessageChange}
            placeholder="メッセージを入力..."
            multiline
            maxLength={2000}
            placeholderTextColor="#9AA3AF"
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
                name="send" 
                size={18} 
                color={!message.trim() ? "#C5C8CE" : "#FFFFFF"} 
              />
            )}
          </TouchableOpacity>
        </View>
      </View>
      
      {/* モデル情報と文字制限表示 */}
      <View style={styles.infoContainer}>
        <View style={styles.modelInfo}>
          <MaterialIcons name="model-training" size={12} color="#9AA3AF" />
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    paddingHorizontal: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#F5F5F7',
    borderRadius: 24,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 16,
    color: '#1F1F1F',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: Platform.OS === 'ios' ? 0 : 4,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  disabledButton: {
    backgroundColor: '#E5E5EA',
  },
  activeButton: {
    backgroundColor: '#7C4DFF',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    paddingHorizontal: 8,
  },
  modelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modelText: {
    fontSize: 11,
    color: '#9AA3AF',
    marginLeft: 4,
  },
  charCountText: {
    fontSize: 11,
    color: '#9AA3AF',
  },
  charCountWarning: {
    color: '#FF3B30',
  },
});

// デフォルトエクスポートを追加
export default ChatInput;
