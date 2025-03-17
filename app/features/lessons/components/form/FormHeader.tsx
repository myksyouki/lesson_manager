import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface FormHeaderProps {
  onSave?: () => void;
  isValid?: boolean;
  isProcessing?: boolean;
}

const FormHeader: React.FC<FormHeaderProps> = ({
  onSave,
  isValid = true,
  isProcessing = false,
}) => {
  const handleCancel = () => {
    Alert.alert(
      'キャンセル',
      '入力内容が破棄されますが、よろしいですか？',
      [
        { text: 'いいえ', style: 'cancel' },
        { 
          text: 'はい', 
          onPress: () => router.back(),
          style: 'destructive'
        },
      ]
    );
  };

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.cancelButton}
        onPress={handleCancel}
        disabled={isProcessing}
      >
        <Text style={[styles.cancelText, isProcessing && styles.disabledText]}>
          キャンセル
        </Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>レッスン登録</Text>
      
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        disabled={!isValid || isProcessing}
      >
        <Text style={[
          styles.saveText,
          (!isValid || isProcessing) && styles.disabledText
        ]}>
          保存
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#DADCE0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#5F6368',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default FormHeader;
