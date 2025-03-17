import React, { useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';

interface FormHeaderProps {
  onSave: () => void;
  isProcessing?: boolean;
  isValid?: boolean;
}

const FormHeader: React.FC<FormHeaderProps> = ({
  onSave,
  isProcessing = false,
  isValid = true,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();

  const handleCancel = useCallback(() => {
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
  }, []);

  return (
    <View style={[
      styles.header,
      { 
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border 
      }
    ]}>
      <View style={styles.buttonContainer}>
        <Button
          title="キャンセル"
          variant="text"
          size="medium"
          onPress={handleCancel}
          accessibilityLabel="キャンセルして戻る"
          accessibilityHint="フォームの入力をキャンセルして前の画面に戻ります"
        />
      </View>
      
      <Text style={styles.title}>レッスン登録</Text>
      
      <View style={styles.buttonContainer}>
        <Button
          title="保存"
          variant="primary"
          size="medium"
          onPress={onSave}
          disabled={!isValid || isProcessing}
          loading={isProcessing}
          accessibilityLabel="レッスンを保存"
          accessibilityHint="入力したレッスン情報を保存します"
        />
      </View>
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
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
  },
  buttonContainer: {
    minWidth: 80,
    alignItems: 'center',
  },
});

export default FormHeader;
