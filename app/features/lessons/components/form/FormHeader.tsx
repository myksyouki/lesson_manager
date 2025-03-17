import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../../../components/ui/Button';
import { useTheme } from '../../../../theme';

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
  const theme = useTheme();

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
      <Button
        title="キャンセル"
        variant="text"
        size="medium"
        onPress={handleCancel}
        disabled={isProcessing}
        style={styles.cancelButton}
      />
      
      <Text style={styles.title}>レッスン登録</Text>
      
      <Button
        title="保存"
        variant="primary"
        size="medium"
        onPress={onSave}
        disabled={!isValid || isProcessing}
        loading={isProcessing}
        style={styles.saveButton}
      />
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
    minWidth: 80,
  },
  saveButton: {
    minWidth: 80,
  },
});

export default FormHeader;
