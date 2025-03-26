import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../../../components/ui/Button';
import { useTheme } from '../../../../theme';

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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

  // 保存処理を確認ダイアログ付きで実行
  const handleSaveWithConfirmation = useCallback(() => {
    if (isProcessing) {
      console.log('既に処理中です');
      return;
    }

    Alert.alert(
      '保存確認',
      'レッスン情報を保存しますか？',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '保存',
          onPress: () => {
            console.log('保存を確認しました');
            onSave();
          }
        }
      ]
    );
  }, [onSave, isProcessing]);

  return (
    <View style={[
      styles.header,
      { 
        backgroundColor: theme.colors.background,
        borderBottomColor: theme.colors.border,
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
          onPress={handleSaveWithConfirmation}
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
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#202124',
    fontFamily: Platform.OS === 'ios' ? 'Hiragino Sans' : 'Roboto',
    flex: 1,
    textAlign: 'center',
  },
  buttonContainer: {
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FormHeader;
