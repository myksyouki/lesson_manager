import React, { useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, SafeAreaView as RNSafeAreaView, KeyboardAvoidingView, ScrollView, TouchableOpacity, Text, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LessonFormData } from '../../../../services/lessonService';
import FormInputs from './FormInputs';
import DatePickerModal from '../../../../components/ui/DatePickerModal';

interface LessonFormProps {
  initialData?: Partial<LessonFormData>;
  onSubmit: (data: LessonFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  children?: React.ReactNode;
}

const LessonForm: React.FC<LessonFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  children,
}) => {
  // フォームデータの状態
  const [formData, setFormData] = useState<LessonFormData>({
    teacherName: '',
    date: new Date().toISOString(),
    pieces: [],
    tags: [],
    notes: '',
    ...initialData,
  });

  // 初期データが設定されたときのログ
  React.useEffect(() => {
    console.log('LessonForm 初期データ:', initialData);
    console.log('LessonForm formData:', formData);
  }, []);

  // 日付ピッカーの表示状態
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // 編集モードかどうか
  const isEditMode = !!initialData?.teacherName;

  // フォームデータを更新する関数
  const updateFormData = useCallback((data: Partial<LessonFormData>) => {
    console.log('更新データ:', data);
    setFormData(prev => {
      const updated = { ...prev, ...data };
      console.log('更新後のフォームデータ:', updated);
      return updated;
    });
  }, []);

  // フォームが有効かどうかをチェック
  const isFormValid = useCallback(() => {
    return !!formData.teacherName && !!formData.date;
  }, [formData.teacherName, formData.date]);

  // 送信ハンドラー
  const handleSubmit = useCallback(() => {
    if (isFormValid()) {
      onSubmit({
        ...formData,
      });
    }
  }, [formData, onSubmit, isFormValid]);

  // キャンセルハンドラー
  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // 日付の選択ハンドラー
  const handleDateSelect = useCallback((date: Date) => {
    const isoString = date.toISOString();
    console.log('日付が選択されました:', isoString);
    setFormData(prev => {
      const updated = { ...prev, date: isoString };
      console.log('日付更新後のフォームデータ:', updated);
      return updated;
    });
  }, []);

  // 日付選択モーダルを開く
  const openDatePicker = useCallback(() => {
    setShowDatePicker(true);
  }, []);

  // 日付選択モーダルを閉じる
  const closeDatePicker = useCallback(() => {
    setShowDatePicker(false);
  }, []);

  return (
    <SafeAreaView edges={['bottom']} style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidContainer}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <FormInputs 
            formData={formData} 
            onUpdateFormData={updateFormData}
            onShowCalendar={openDatePicker}
            isEditMode={isEditMode}
            openDatePicker={openDatePicker}
          />

          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton]} 
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.submitButton, !isFormValid() && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={!isFormValid()}
            >
              <Text style={styles.submitButtonText}>
                {isEditMode ? '更新' : '作成'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 日付選択モーダル */}
      <DatePickerModal
        isVisible={showDatePicker}
        onClose={closeDatePicker}
        onSelectDate={handleDateSelect}
        initialDate={formData.date ? new Date(formData.date) : new Date()}
      />

      {/* 送信中のローディングインジケータ */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6200ee" />
          <Text style={styles.loadingText}>
            送信中...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    padding: 16,
  },
  keyboardAvoidContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  button: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
  },
  cancelButton: {
    backgroundColor: '#ccc',
  },
  submitButton: {
    backgroundColor: '#6200ee',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'black',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default LessonForm; 