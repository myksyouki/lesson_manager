import React, { useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import LoadingOverlay from './components/LoadingOverlay';
import FormHeader from './features/lessons/components/form/FormHeader';
import FormInputs from './features/lessons/components/form/FormInputs';
import CalendarModal from './features/lessons/components/form/CalendarModal';
import AudioUploader from './features/lessons/components/form/AudioUploader';
import { useCalendar, DAYS } from './hooks/useCalendar';
import { useFileUpload } from './hooks/useFileUpload';
import { useLessonForm } from './hooks/useLessonForm';
import { Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = Math.min(SCREEN_WIDTH - 40, 600);
const DAY_SIZE = Math.floor(CALENDAR_WIDTH / 7);

export default function LessonForm() {
  // カスタムフックを使用
  const {
    formData, 
    isProcessing,
    processingStep,
    uploadProgress,
    processingStatus,
    updateFormData, 
    handleSave,
    isFormValid,
  } = useLessonForm();
  
  const {
    selectedFile, 
    selectFile,
    clearFile,
  } = useFileUpload();
  
  const {
    selectedDate,
    currentMonth,
    showCalendar,
    setShowCalendar,
    handleDateSelect,
    changeMonth,
    generateCalendarDays,
    formatDate,
  } = useCalendar(new Date(), (_, isoFormattedDate) => {
    console.log('レッスンフォーム: 日付が選択されました -', isoFormattedDate);
    updateFormData({ date: isoFormattedDate });
  });

  // 保存ハンドラー
  const onSave = useCallback(async () => {
    // 二重送信防止のため、現在のformDataとselectedFileでハッシュを作成
    console.log('保存ボタンが押されました');
    
    // selectedFileがある場合はそれを渡す
    await handleSave(selectedFile);
  }, [handleSave, selectedFile]);

  // カレンダー表示トグル
  const toggleCalendar = useCallback(() => {
    setShowCalendar(!showCalendar);
  }, [setShowCalendar, showCalendar]);

  // 日付選択ハンドラー（コールバック最適化）
  const onDateSelect = useCallback((date: Date) => {
    handleDateSelect(date);
  }, [handleDateSelect]);

  return (
    <SafeAreaView style={styles.container}>
      <FormHeader
        onSave={onSave}
        isValid={isFormValid()}
        isProcessing={isProcessing}
      />
      
      <ScrollView style={styles.scrollView}>
        <FormInputs
          formData={formData}
          onUpdateFormData={updateFormData}
          onShowCalendar={toggleCalendar}
          openDatePicker={toggleCalendar}
        />
        
        <View style={styles.uploadSection}>
          <AudioUploader
            selectedFile={selectedFile}
            onSelectFile={selectFile}
            onClearFile={clearFile}
          />
        </View>
      </ScrollView>
      
      {showCalendar && (
        <CalendarModal
          onClose={toggleCalendar}
          onSelectDate={onDateSelect}
          selectedDate={selectedDate}
          currentMonth={currentMonth}
          onChangeMonth={changeMonth}
          generateCalendarDays={generateCalendarDays}
          formatDate={formatDate}
          days={DAYS}
          daySize={DAY_SIZE}
        />
      )}
      
      {isProcessing && (
        <LoadingOverlay 
          message={processingStep}
          progress={uploadProgress}
          showProgress={processingStatus === 'uploading'}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
    padding: 8,
  },
  uploadSection: {
    marginTop: 16,
    marginHorizontal: 10,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  uploadSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  uploadDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  fileNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  }
});
